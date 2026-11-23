import type { ModRecord, WarframeRecord, WeaponRecord } from '../types'

const internalProgressionTiers = new Set(['beginner', 'intermediate'])
const weaponTypeFolders = new Set([
  'rifle',
  'shotgun',
  'pistol',
  'bow',
  'launcher',
  'sniper',
  'melee',
  'arch-gun',
  'arch-melee',
])

function normalizedTargets(weapon: WeaponRecord): Set<string> {
  return new Set([weapon.name, weapon.type, weapon.category]
    .filter(Boolean)
    .map((value) => value!.toLocaleLowerCase('en-US')))
}

function tierFolders(mod: ModRecord): string[] {
  return mod.uniqueName.split('/').map((segment) => segment.toLocaleLowerCase('en-US'))
}

/** Nomes dos mods "normais" (fora das pastas Beginner/Intermediate/Expert), por catálogo. */
const regularNamesCache = new WeakMap<ModRecord[], Set<string>>()
function regularNames(mods: ModRecord[]): Set<string> {
  let names = regularNamesCache.get(mods)
  if (!names) {
    names = new Set(mods
      .filter((mod) => !tierFolders(mod).some((segment) => internalProgressionTiers.has(segment) || segment === 'expert'))
      .map((mod) => mod.name))
    regularNamesCache.set(mods, names)
  }
  return names
}

/**
 * Variantes internas de progressão. As pastas Beginner/Intermediate são sempre internas.
 * A pasta Expert também guarda mods reais (Primed, Galvanized...): só é variante interna
 * quando repete o nome de um mod normal (ex.: uma segunda "Intensify").
 */
function isInternalProgressionVariant(mod: ModRecord, mods: ModRecord[]): boolean {
  const segments = tierFolders(mod)
  if (segments.some((segment) => internalProgressionTiers.has(segment))) return true
  return segments.includes('expert') && regularNames(mods).has(mod.name)
}

function matchesWeaponType(weapon: WeaponRecord, mod: ModRecord): boolean {
  const targets = normalizedTargets(weapon)
  const compatibility = mod.compatName?.toLocaleLowerCase('en-US')
  if (compatibility) return targets.has(compatibility)

  const pathSegments = mod.uniqueName.split('/').map((segment) => segment.toLocaleLowerCase('en-US'))
  const specificType = pathSegments.find((segment) => weaponTypeFolders.has(segment))
  if (specificType) return targets.has(specificType)

  const modScope = mod.type?.replace(/\s+Mod$/, '').trim().toLocaleLowerCase('en-US')
  return modScope !== undefined && targets.has(modScope)
}

export function filterModsForWeapon(mods: ModRecord[], weapon: WeaponRecord): ModRecord[] {
  return mods.filter((mod) => !isInternalProgressionVariant(mod, mods) && matchesWeaponType(weapon, mod))
}

export type WarframeSlotKind = 'normal' | 'aura' | 'exilus'

function powersuitFolder(uniqueName: string): string | undefined {
  const segments = uniqueName.split('/')
  return segments[2] === 'Powersuits' ? segments[3] : undefined
}

export function isAuraMod(mod: ModRecord): boolean {
  return mod.uniqueName.includes('/Mods/Aura/')
}

/** Mods de Warframe compatíveis: gerais ou augments do próprio Warframe (mesma pasta Powersuits). */
export function filterModsForWarframe(mods: ModRecord[], frame: WarframeRecord, slot: WarframeSlotKind = 'normal'): ModRecord[] {
  const frameFolder = powersuitFolder(frame.uniqueName)
  return mods.filter((mod) => {
    if (mod.type !== 'Warframe Mod' || isInternalProgressionVariant(mod, mods)) return false
    const modFolder = powersuitFolder(mod.uniqueName)
    if (modFolder && modFolder !== frameFolder) return false
    if (slot === 'aura') return isAuraMod(mod)
    if (isAuraMod(mod)) return false
    return slot === 'exilus' ? mod.isExilus === true : true
  })
}

const preceptFolders: Record<'Sentinel' | 'Beast' | 'MOA' | 'Hound', string[]> = {
  Sentinel: ['/SentinelPrecepts/'],
  Beast: ['/Friendly/Pets/KubrowPetPrecepts/', '/Friendly/Pets/CatbrowPetPrecepts/', '/Friendly/Pets/CreaturePets/'],
  MOA: ['/Friendly/Pets/MoaPets/'],
  Hound: ['/Friendly/Pets/ZanukaPets/'],
}
const allPreceptFolders = Object.values(preceptFolders).flat()

/**
 * Mods de companheiro. Mods gerais (/Mods/Sentinel/) servem todos. Os mods de garras
 * (/Sentinel/Kubrow/) ficam nas garras. Preceitos só servem o tipo dono da pasta.
 */
export function filterModsForCompanion(mods: ModRecord[], kind: 'Sentinel' | 'Beast' | 'MOA' | 'Hound'): ModRecord[] {
  return mods.filter((mod) => {
    if (mod.type !== 'Companion Mod' || isInternalProgressionVariant(mod, mods)) return false
    const path = mod.uniqueName
    // Mods de garras (Bite, Maul...) vão para as garras, não para o companheiro.
    if (path.includes('/Sentinel/Kubrow/')) return false
    const owner = allPreceptFolders.find((folder) => path.includes(folder))
    return owner === undefined || preceptFolders[kind].includes(owner)
  })
}

/** Mods para armas de companheiro, segundo a classe registada à mão (ver companionData.ts). */
export function filterModsForCompanionWeapon(
  mods: ModRecord[],
  weapon: WeaponRecord,
  weaponClass: { category: WeaponRecord['category']; modTypes: string[] } | undefined,
): ModRecord[] {
  if (!weaponClass) return []
  const unique = new Map<string, ModRecord>()
  for (const modType of weaponClass.modTypes) {
    for (const mod of filterModsForWeapon(mods, { ...weapon, type: modType, category: weaponClass.category })) {
      unique.set(mod.uniqueName, mod)
    }
  }
  return [...unique.values()]
}

/** Mods jogáveis: sem variantes internas de progressão. */
export function withoutInternalVariants(mods: ModRecord[]): ModRecord[] {
  return mods.filter((mod) => !isInternalProgressionVariant(mod, mods))
}
