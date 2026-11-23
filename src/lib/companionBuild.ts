import { companionWeaponType, type CompanionRecord, type ModRecord, type WeaponRecord } from '../types'
import type { BuildModSlot } from '../store/useCatalogStore'
import type { BuildCodeItem } from './buildCode'
import { filterModsForCompanion, filterModsForCompanionWeapon } from './modCompatibility'
import { knownPolarities } from './warframeBuild'
import {
  beastClaws,
  defaultParts,
  getCompanionPolarities,
  getCompanionWeaponClass,
  houndModels,
  houndWeaponNames,
  isValidParts,
  type CompanionParts,
} from '../data/companionData'

export const companionRank = 30
export const companionSlotCount = 10
/** Slots de mods da arma (como as restantes armas; número por confirmar na wiki). */
export const companionWeaponSlotCount = 8
/** As garras de bestas têm mais um slot de Postura (funciona como uma Stance). */
export const postureSlotIndex = 8
export const beastClawsType = 'Beast Claws'

export function isBeastClaws(weapon: WeaponRecord | undefined): boolean {
  return weapon?.type === beastClawsType
}

export function weaponSlotCount(weapon?: WeaponRecord): number {
  return isBeastClaws(weapon) ? companionWeaponSlotCount + 1 : companionWeaponSlotCount
}

export interface CompanionBuildState {
  companionId: string
  reactor: boolean
  slots: BuildModSlot[]
  /** Arma escolhida (só sentinelas e MOA). Hounds e bestas têm arma fixa. */
  weaponId: string | null
  /** Peças de MOA/Hound. */
  parts: CompanionParts
  /** Mods da arma robótica ou de Hound (as garras das bestas usam os mods do companheiro). */
  weaponSlots: BuildModSlot[]
  weaponCatalyst: boolean
}

export function createWeaponSlots(weapon?: WeaponRecord): BuildModSlot[] {
  return Array.from({ length: weaponSlotCount(weapon) }, (_, index) => {
    const factoryPolarity = weapon?.polarities?.[index] ?? 'none'
    return { modId: null, rank: 0, polarity: factoryPolarity, factoryPolarity }
  })
}

export function hasWeaponMods(weapon: WeaponRecord | undefined): boolean {
  return isBeastClaws(weapon) || (weapon !== undefined && getCompanionWeaponClass(weapon.name) !== undefined)
}

/** Garras: mods de garras (/Sentinel/Kubrow/) nos slots normais e mods de Postura no slot de Postura. */
export function filterModsForCompanionWeaponRecord(mods: ModRecord[], weapon: WeaponRecord, slotIndex?: number): ModRecord[] {
  if (isBeastClaws(weapon)) {
    if (slotIndex === postureSlotIndex) return mods.filter((mod) => mod.type === 'Posture Mod')
    return mods.filter((mod) => mod.type === 'Companion Mod' && mod.uniqueName.includes('/Sentinel/Kubrow/'))
  }
  return filterModsForCompanionWeapon(mods, weapon, getCompanionWeaponClass(weapon.name))
}

/** Sentinelas e MOA escolhem entre as armas robóticas (todas as de companheiro excepto as de Hound). */
export function canChooseWeapon(companion: CompanionRecord): boolean {
  return companion.kind === 'Sentinel' || companion.kind === 'MOA'
}

export function getRoboticWeapons(weapons: WeaponRecord[]): WeaponRecord[] {
  return weapons
    .filter((weapon) => weapon.type === companionWeaponType && !houndWeaponNames.has(weapon.name))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function getCompanionWeapon(
  companion: CompanionRecord,
  state: Pick<CompanionBuildState, 'weaponId' | 'parts'>,
  weapons: WeaponRecord[],
): WeaponRecord | undefined {
  if (companion.kind === 'Beast') return beastClaws[companion.name]
  if (companion.kind === 'Hound') {
    const weaponName = houndModels.find((model) => model.name === state.parts.modelo)?.weapon
    return weapons.find((weapon) => weapon.type === companionWeaponType && weapon.name === weaponName)
  }
  return getRoboticWeapons(weapons).find((weapon) => weapon.uniqueName === state.weaponId)
}

export const companionWeaponItemType = 'arma-companheiro'

export function createCompanionSlots(companion?: CompanionRecord, parts: CompanionParts = {}): BuildModSlot[] {
  const polarities = companion ? getCompanionPolarities(companion, parts) : []
  return Array.from({ length: companionSlotCount }, (_, index) => {
    const factoryPolarity = polarities[index] ?? 'none'
    return { modId: null, rank: 0, polarity: factoryPolarity, factoryPolarity }
  })
}

/** Itens do código: o companheiro e, se aceitar mods, a arma (escolhida ou fixa). */
export function toCompanionBuildItems(state: CompanionBuildState, weapon?: WeaponRecord): BuildCodeItem[] {
  const items = [toCompanionBuildItem(state)]
  if (weapon && hasWeaponMods(weapon)) {
    items.push({
      tipo: companionWeaponItemType,
      id: weapon.uniqueName,
      rank: companionRank,
      catalyst: state.weaponCatalyst,
      slots: state.weaponSlots.map(({ polarity, modId, rank }) => ({ polarity, modId, rank })),
    })
  }
  return items
}

export function toCompanionBuildItem(state: CompanionBuildState): BuildCodeItem {
  return {
    tipo: 'companheiro',
    id: state.companionId,
    rank: companionRank,
    catalyst: state.reactor,
    slots: state.slots.map(({ polarity, modId, rank }) => ({ polarity, modId, rank })),
    ...(Object.keys(state.parts).length ? { partes: state.parts } : {}),
  }
}

export function restoreCompanionBuild(
  item: BuildCodeItem,
  catalog: { companions: CompanionRecord[]; mods: ModRecord[]; weapons?: WeaponRecord[] },
  allItems: BuildCodeItem[] = [item],
): CompanionBuildState {
  const companion = catalog.companions.find((entry) => entry.uniqueName === item.id)
  if (!companion) throw new Error('O companheiro do código não existe no catálogo local.')
  if (item.slots.length !== companionSlotCount) throw new Error('A build de companheiro tem de conter dez slots.')
  const parts = item.partes ?? defaultParts(companion.kind)
  if (!isValidParts(companion.kind, parts)) throw new Error('As peças do companheiro não são válidas.')
  const polarities = getCompanionPolarities(companion, parts)

  const modsById = new Map(catalog.mods.map((mod) => [mod.uniqueName, mod]))
  const usedModIds = item.slots.flatMap((slot) => slot.modId ? [slot.modId] : [])
  if (new Set(usedModIds).size !== usedModIds.length) throw new Error('A build contém o mesmo mod mais do que uma vez.')

  const slots = item.slots.map((slot, index) => {
    if (!knownPolarities.has(slot.polarity)) throw new Error(`A polaridade do slot ${index + 1} não é reconhecida.`)
    const mod = slot.modId ? modsById.get(slot.modId) : undefined
    if (slot.modId && !mod) throw new Error(`O mod do slot ${index + 1} não existe no catálogo local.`)
    if (mod && slot.rank > mod.fusionLimit) throw new Error(`O rank do mod ${mod.name} excede o máximo.`)
    if (mod && filterModsForCompanion([mod], companion.kind).length === 0) {
      throw new Error(`O mod ${mod.name} não pode ser usado neste companheiro.`)
    }
    return { modId: slot.modId, rank: slot.rank, polarity: slot.polarity, factoryPolarity: polarities[index] ?? 'none' }
  })

  const weaponItem = allItems.find((entry) => entry.tipo === companionWeaponItemType)
  let weaponId: string | null = null
  let weaponSlots = createWeaponSlots(canChooseWeapon(companion) ? undefined : getCompanionWeapon(companion, { weaponId: null, parts }, catalog.weapons ?? []))
  let weaponCatalyst = false
  if (weaponItem) {
    const weapon = canChooseWeapon(companion)
      ? getRoboticWeapons(catalog.weapons ?? []).find((entry) => entry.uniqueName === weaponItem.id)
      : getCompanionWeapon(companion, { weaponId: null, parts }, catalog.weapons ?? [])
    if (!weapon || weapon.uniqueName !== weaponItem.id) throw new Error('A arma do companheiro não existe ou não corresponde ao companheiro.')
    if (canChooseWeapon(companion)) weaponId = weapon.uniqueName
    weaponCatalyst = weaponItem.catalyst
    weaponSlots = restoreWeaponSlots(weaponItem, weapon, modsById)
  }

  return { companionId: companion.uniqueName, reactor: item.catalyst, slots, weaponId, parts, weaponSlots, weaponCatalyst }
}

function restoreWeaponSlots(item: BuildCodeItem, weapon: WeaponRecord, modsById: Map<string, ModRecord>): BuildModSlot[] {
  if (item.slots.length === 0) return createWeaponSlots(weapon)
  if (item.slots.length !== weaponSlotCount(weapon)) throw new Error(`A arma do companheiro tem de conter ${weaponSlotCount(weapon)} slots.`)
  const usedModIds = item.slots.flatMap((slot) => slot.modId ? [slot.modId] : [])
  if (new Set(usedModIds).size !== usedModIds.length) throw new Error('A arma contém o mesmo mod mais do que uma vez.')
  return item.slots.map((slot, index) => {
    if (!knownPolarities.has(slot.polarity)) throw new Error(`A polaridade do slot ${index + 1} da arma não é reconhecida.`)
    const mod = slot.modId ? modsById.get(slot.modId) : undefined
    if (slot.modId && !mod) throw new Error(`O mod do slot ${index + 1} da arma não existe no catálogo local.`)
    if (mod && slot.rank > mod.fusionLimit) throw new Error(`O rank do mod ${mod.name} excede o máximo.`)
    if (mod && filterModsForCompanionWeaponRecord([mod], weapon, index).length === 0) {
      throw new Error(`O mod ${mod.name} não pode ser usado em ${weapon.name}.`)
    }
    return { modId: slot.modId, rank: slot.rank, polarity: slot.polarity, factoryPolarity: weapon.polarities?.[index] ?? 'none' }
  })
}
