import type { WeaponRecord } from '../types'
import { getRankedModEffects } from './modEffects'
import type {
  DamageProfile,
  DamageType,
  RankedModEffects,
  RankedWeaponMod,
  WeaponCalculationInput,
  WeaponStats,
} from './types'

const primaryElements: DamageType[] = ['heat', 'cold', 'electricity', 'toxin']
const combinedElements: DamageType[] = ['blast', 'corrosive', 'gas', 'magnetic', 'radiation', 'viral']
const damageTypeNames: Record<string, DamageType> = {
  impact: 'impact',
  puncture: 'puncture',
  slash: 'slash',
  heat: 'heat',
  cold: 'cold',
  electricity: 'electricity',
  electric: 'electricity',
  toxin: 'toxin',
  blast: 'blast',
  corrosive: 'corrosive',
  gas: 'gas',
  magnetic: 'magnetic',
  radiation: 'radiation',
  viral: 'viral',
  void: 'void',
  tau: 'tau',
  true: 'true',
}

const combinedForPair: Record<string, DamageType> = {
  'cold+heat': 'blast',
  'electricity+toxin': 'corrosive',
  'heat+toxin': 'gas',
  'cold+electricity': 'magnetic',
  'cold+toxin': 'viral',
  'electricity+heat': 'radiation',
}

interface ModEntry {
  effects: RankedModEffects
  slotIndex: number
}

function normalizeBaseDamage(weapon: WeaponRecord): DamageProfile {
  const damage: DamageProfile = {}
  for (const [rawType, value] of Object.entries(weapon.damage ?? {})) {
    const type = damageTypeNames[rawType.toLocaleLowerCase('en-US')]
    if (type && typeof value === 'number' && value > 0) damage[type] = value
  }

  if (Object.keys(damage).length === 0 && (weapon.totalDamage ?? 0) > 0) {
    damage.untyped = weapon.totalDamage
  }
  return damage
}

function sum(values: Array<number | undefined>): number {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0)
}

function createModEntries(mods: RankedWeaponMod[] = []): ModEntry[] {
  return mods
    .map(({ mod, rank, slotIndex }) => ({ effects: getRankedModEffects(mod, rank), slotIndex }))
    .sort((left, right) => left.slotIndex - right.slotIndex)
}

function collectIgnoredEffects(entries: ModEntry[]): string[] {
  return entries.flatMap(({ effects, slotIndex }) =>
    effects.ignoredEffects.map((effect) => `Slot ${slotIndex + 1}: ${effect}`),
  )
}

function getElementOrder(entries: ModEntry[], baseDamage: DamageProfile): DamageType[] {
  const order: DamageType[] = []
  for (const { effects } of entries) {
    for (const { type } of effects.elementalOrder) {
      if (primaryElements.includes(type) && !order.includes(type)) order.push(type)
    }
  }

  for (const type of primaryElements) {
    if ((baseDamage[type] ?? 0) > 0 && !order.includes(type)) order.push(type)
  }
  return order
}

function combinePrimaryElements(damage: DamageProfile, order: DamageType[]): DamageProfile {
  const result = { ...damage }
  for (const type of primaryElements) delete result[type]

  for (let index = 0; index < order.length; index += 2) {
    const first = order[index]
    const second = order[index + 1]
    if (!second) {
      result[first] = (result[first] ?? 0) + (damage[first] ?? 0)
      continue
    }

    const pair = [first, second].sort().join('+')
    const combined = combinedForPair[pair]
    if (!combined) {
      result[first] = (result[first] ?? 0) + (damage[first] ?? 0)
      result[second] = (result[second] ?? 0) + (damage[second] ?? 0)
      continue
    }
    result[combined] = (result[combined] ?? 0) + (damage[first] ?? 0) + (damage[second] ?? 0)
  }
  return result
}

function calculateDamage(weapon: WeaponRecord, entries: ModEntry[]): DamageProfile {
  const baseDamage = normalizeBaseDamage(weapon)
  const effects = entries.map(({ effects: modEffects }) => modEffects)
  const baseDamageMultiplier = 1 + sum(effects.map((effect) => effect.baseDamage))
  const modifiedBase: DamageProfile = {}

  for (const [type, value] of Object.entries(baseDamage) as Array<[DamageType, number]>) {
    const physicalBonus = type === 'impact' || type === 'puncture' || type === 'slash'
      ? sum(effects.map((effect) => effect.physicalDamage[type]))
      : 0
    modifiedBase[type] = value * (1 + sum([baseDamageMultiplier - 1, physicalBonus]))
  }

  const modifiedBaseTotal = sum(Object.values(modifiedBase))
  const damage: DamageProfile = { ...modifiedBase }
  const elementalBonuses: Partial<Record<DamageType, number>> = {}
  for (const effect of effects) {
    for (const [type, bonus] of Object.entries(effect.elementalDamage) as Array<[DamageType, number]>) {
      elementalBonuses[type] = (elementalBonuses[type] ?? 0) + bonus
    }
  }

  for (const [type, bonus] of Object.entries(elementalBonuses) as Array<[DamageType, number]>) {
    damage[type] = (damage[type] ?? 0) + modifiedBaseTotal * bonus
  }

  return combinePrimaryElements(damage, getElementOrder(entries, baseDamage))
}

export function calculateWeaponStats({ weapon, mods = [] }: WeaponCalculationInput): WeaponStats {
  const entries = createModEntries(mods)
  const effects = entries.map(({ effects: modEffects }) => modEffects)
  const damage = calculateDamage(weapon, entries)
  const totalDamage = sum(Object.values(damage))
  const criticalChance = (weapon.criticalChance ?? 0) * (1 + sum(effects.map((effect) => effect.criticalChance)))
  const criticalMultiplier = (weapon.criticalMultiplier ?? 1) * (1 + sum(effects.map((effect) => effect.criticalDamage)))
  const averageCriticalMultiplier = 1 + criticalChance * (criticalMultiplier - 1)
  const statusChance = (weapon.statusChance ?? 0) * (1 + sum(effects.map((effect) => effect.statusChance)))
  const multishot = (weapon.multishot ?? 1) * (1 + sum(effects.map((effect) => effect.multishot)))
  const fireRate = (weapon.fireRate ?? 0) * (1 + sum(effects.map((effect) => effect.fireRate + effect.attackSpeed)))
  const statusChanceByType: DamageProfile = {}

  if (totalDamage > 0) {
    for (const [type, value] of Object.entries(damage) as Array<[DamageType, number]>) {
      statusChanceByType[type] = statusChance * value / totalDamage
    }
  }

  return {
    damage,
    totalDamage,
    criticalChance,
    criticalMultiplier,
    averageCriticalMultiplier,
    statusChance,
    statusChanceByType,
    multishot,
    fireRate,
    referenceDps: totalDamage * averageCriticalMultiplier * multishot * fireRate,
    ignoredEffects: collectIgnoredEffects(entries),
  }
}

export function getModEntries(mods: RankedWeaponMod[] = []): ModEntry[] {
  return createModEntries(mods)
}

export function isCombinedElement(type: DamageType): boolean {
  return combinedElements.includes(type)
}
