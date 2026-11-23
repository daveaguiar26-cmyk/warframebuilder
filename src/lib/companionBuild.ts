import { companionWeaponType, type CompanionRecord, type ModRecord, type WeaponRecord } from '../types'
import type { BuildModSlot } from '../store/useCatalogStore'
import type { BuildCodeItem } from './buildCode'
import { filterModsForCompanion } from './modCompatibility'
import { knownPolarities } from './warframeBuild'
import {
  beastClaws,
  defaultParts,
  getCompanionPolarities,
  houndModels,
  houndWeaponNames,
  isValidParts,
  type CompanionParts,
} from '../data/companionData'

export const companionRank = 30
export const companionSlotCount = 10

export interface CompanionBuildState {
  companionId: string
  reactor: boolean
  slots: BuildModSlot[]
  /** Arma escolhida (só sentinelas e MOA). Hounds e bestas têm arma fixa. */
  weaponId: string | null
  /** Peças de MOA/Hound. */
  parts: CompanionParts
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

/** Itens do código: o companheiro e, se existir, a arma da sentinela. */
export function toCompanionBuildItems(state: CompanionBuildState): BuildCodeItem[] {
  const items = [toCompanionBuildItem(state)]
  if (state.weaponId) items.push({ tipo: companionWeaponItemType, id: state.weaponId, rank: companionRank, catalyst: false, slots: [] })
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
  if (weaponItem) {
    if (!canChooseWeapon(companion)) throw new Error('Este companheiro tem arma fixa.')
    const weapon = getRoboticWeapons(catalog.weapons ?? []).find((entry) => entry.uniqueName === weaponItem.id)
    if (!weapon) throw new Error('A arma do companheiro não existe no catálogo local.')
    weaponId = weapon.uniqueName
  }

  return { companionId: companion.uniqueName, reactor: item.catalyst, slots, weaponId, parts }
}
