import { describe, expect, it } from 'vitest'
import type { ModRecord, WeaponRecord } from '../types'
import { filterModsForCompanion, filterModsForWarframe, filterModsForWeapon } from './modCompatibility'

const rifle: WeaponRecord = {
  uniqueName: '/Lotus/Weapons/Tenno/LongGuns/Braton/Braton',
  name: 'Braton',
  category: 'Primary',
  type: 'Rifle',
}

function mod(uniqueName: string, type = 'Primary Mod', compatName?: string): ModRecord {
  return {
    uniqueName,
    name: uniqueName.split('/').at(-1) ?? 'Test Mod',
    type,
    compatName,
    baseDrain: 2,
    polarity: 'madurai',
    fusionLimit: 5,
  }
}

describe('filterModsForWeapon', () => {
  it('filters primary mods by the weapon subtype from their catalog path', () => {
    const compatible = mod('/Lotus/Upgrades/Mods/Rifle/WeaponDamageAmountMod')
    const shotgunOnly = mod('/Lotus/Upgrades/Mods/Shotgun/PointBlank')

    expect(filterModsForWeapon([compatible, shotgunOnly], rifle)).toEqual([compatible])
  })

  it('uses explicit compatibility when the field is available', () => {
    const rifleMod = mod('/Lotus/Mods/GenericMod', 'Primary Mod', 'Rifle')
    const shotgunMod = mod('/Lotus/Mods/GenericOther', 'Primary Mod', 'Shotgun')

    expect(filterModsForWeapon([rifleMod, shotgunMod], rifle)).toEqual([rifleMod])
  })

  it('hides internal Beginner, Intermediate and Expert progression copies', () => {
    const normal = mod('/Lotus/Upgrades/Mods/Rifle/WeaponDamageAmountMod')
    const beginner = mod('/Lotus/Upgrades/Mods/Rifle/Beginner/WeaponDamageAmountModBeginner')
    const intermediate = mod('/Lotus/Upgrades/Mods/Rifle/Intermediate/WeaponDamageAmountModIntermediate')
    const expert = mod('/Lotus/Upgrades/Mods/Rifle/Expert/WeaponDamageAmountModExpert')

    expect(filterModsForWeapon([normal, beginner, intermediate, expert], rifle)).toEqual([normal])
  })
})

describe('filterModsForWarframe', () => {
  const frame = {
    uniqueName: '/Lotus/Powersuits/Cowgirl/Cowgirl',
    name: 'Mesa', health: 365, shield: 180, armor: 105, power: 100, abilities: [],
  }
  const base = { baseDrain: 4, polarity: 'madurai', fusionLimit: 5, type: 'Warframe Mod' }
  const intensify = { ...base, uniqueName: '/Lotus/Upgrades/Mods/Warframe/AvatarAbilityStrengthMod', name: 'Intensify' }
  const beginner = { ...base, uniqueName: '/Lotus/Upgrades/Mods/Warframe/Beginner/AvatarAbilityStrengthModBeginner', name: 'Intensify' }
  const aura = { ...base, uniqueName: '/Lotus/Upgrades/Mods/Aura/EnemyArmorReductionAuraMod', name: 'Corrosive Projection' }
  const exilus = { ...base, uniqueName: '/Lotus/Upgrades/Mods/Warframe/PowerDrift', name: 'Power Drift', isExilus: true }
  const ownAugment = { ...base, uniqueName: '/Lotus/Powersuits/Cowgirl/PeacemakerAugment', name: 'Mesa augment' }
  const otherAugment = { ...base, uniqueName: '/Lotus/Powersuits/Excalibur/ExaltedAugment', name: 'Excalibur augment' }
  const rifleMod = { ...base, uniqueName: '/Lotus/Upgrades/Mods/Rifle/Serration', name: 'Serration', type: 'Primary Mod' }
  const all = [intensify, beginner, aura, exilus, ownAugment, otherAugment, rifleMod]

  it('keeps general mods and own augments in normal slots', () => {
    expect(filterModsForWarframe(all, frame).map((mod) => mod.name)).toEqual(['Intensify', 'Power Drift', 'Mesa augment'])
  })

  it('restricts aura and exilus slots', () => {
    expect(filterModsForWarframe(all, frame, 'aura').map((mod) => mod.name)).toEqual(['Corrosive Projection'])
    expect(filterModsForWarframe(all, frame, 'exilus').map((mod) => mod.name)).toEqual(['Power Drift'])
  })
})

describe('filterModsForCompanion', () => {
  const base = { baseDrain: 2, polarity: 'vazarin', fusionLimit: 10, type: 'Companion Mod' }
  const vitality = { ...base, uniqueName: '/Lotus/Upgrades/Mods/Sentinel/SentinelHealthMaxMod', name: 'Enhanced Vitality' }
  const precept = { ...base, uniqueName: '/Lotus/Types/Sentinels/SentinelPrecepts/PrimedRegen', name: 'Primed Regen' }
  const beastMod = { ...base, uniqueName: '/Lotus/Upgrades/Mods/Sentinel/Kubrow/KubrowBiteMod', name: 'Bite' }
  const petPrecept = { ...base, uniqueName: '/Lotus/Types/Friendly/Pets/KavatPrecepts/Charm', name: 'Charm' }
  const all = [vitality, precept, beastMod, petPrecept]

  it('separates sentinel and beast mods', () => {
    expect(filterModsForCompanion(all, 'Sentinel').map((mod) => mod.name)).toEqual(['Enhanced Vitality', 'Primed Regen'])
    expect(filterModsForCompanion(all, 'Beast').map((mod) => mod.name)).toEqual(['Enhanced Vitality', 'Bite', 'Charm'])
  })
})
