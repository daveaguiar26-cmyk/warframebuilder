import type { ModRecord, WeaponRecord } from '../types'

export type SlotKind = 'normal' | 'exilus' | 'aura' | 'stance'

export interface ModSlot {
  index: number
  polarity?: string
  factoryPolarity?: string
  kind?: SlotKind
  mod?: ModRecord
  rank?: number
}

export interface ItemCapacityInput {
  rank: number
  catalyst: boolean
  slots: ModSlot[]
}

export interface CapacitySummary {
  baseCapacity: number
  bonusCapacity: number
  totalCapacity: number
  usedCapacity: number
  remainingCapacity: number
  formaRequired: number
}

export interface RankedWeaponMod {
  slotIndex: number
  mod: ModRecord
  rank: number
}

export type DamageType =
  | 'impact'
  | 'puncture'
  | 'slash'
  | 'heat'
  | 'cold'
  | 'electricity'
  | 'toxin'
  | 'blast'
  | 'corrosive'
  | 'gas'
  | 'magnetic'
  | 'radiation'
  | 'viral'
  | 'void'
  | 'tau'
  | 'true'
  | 'untyped'

export type DamageProfile = Partial<Record<DamageType, number>>

export interface WeaponStats {
  damage: DamageProfile
  totalDamage: number
  criticalChance: number
  criticalMultiplier: number
  averageCriticalMultiplier: number
  statusChance: number
  statusChanceByType: DamageProfile
  multishot: number
  fireRate: number
  referenceDps: number
  ignoredEffects: string[]
}

export interface RankedModEffects {
  baseDamage: number
  physicalDamage: Partial<Record<'impact' | 'puncture' | 'slash', number>>
  elementalDamage: Partial<Record<DamageType, number>>
  elementalOrder: Array<{ type: DamageType; bonus: number }>
  criticalChance: number
  criticalDamage: number
  statusChance: number
  multishot: number
  fireRate: number
  attackSpeed: number
  ignoredEffects: string[]
}

export interface WeaponCalculationInput {
  weapon: WeaponRecord
  mods?: RankedWeaponMod[]
}