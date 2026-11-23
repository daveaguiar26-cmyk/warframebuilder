import type { ModRecord, WarframeRecord, WeaponRecord } from '../types'

const internalProgressionTiers = new Set(['beginner', 'intermediate', 'expert'])
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

function isInternalProgressionVariant(mod: ModRecord): boolean {
  return mod.uniqueName
    .split('/')
    .some((segment) => internalProgressionTiers.has(segment.toLocaleLowerCase('en-US')))
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
  return mods.filter((mod) => !isInternalProgressionVariant(mod) && matchesWeaponType(weapon, mod))
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
    if (mod.type !== 'Warframe Mod' || isInternalProgressionVariant(mod)) return false
    const modFolder = powersuitFolder(mod.uniqueName)
    if (modFolder && modFolder !== frameFolder) return false
    if (slot === 'aura') return isAuraMod(mod)
    if (isAuraMod(mod)) return false
    return slot === 'exilus' ? mod.isExilus === true : true
  })
}

/**
 * Mods de companheiro. Sentinelas não usam mods de bestas (/Sentinel/Kubrow/) nem preceitos de
 * bestas (/Friendly/Pets/); bestas não usam preceitos de sentinela (/SentinelPrecepts/).
 */
export function filterModsForCompanion(mods: ModRecord[], kind: 'Sentinel' | 'Beast'): ModRecord[] {
  return mods.filter((mod) => {
    if (mod.type !== 'Companion Mod' || isInternalProgressionVariant(mod)) return false
    const path = mod.uniqueName
    if (kind === 'Sentinel') return !path.includes('/Sentinel/Kubrow/') && !path.includes('/Friendly/Pets/')
    return !path.includes('/SentinelPrecepts/')
  })
}
