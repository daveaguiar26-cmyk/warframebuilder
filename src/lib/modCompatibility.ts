import type { ModRecord, WeaponRecord } from '../types'

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
