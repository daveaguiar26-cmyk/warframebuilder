import { describe, expect, it } from 'vitest'
import type { ModRecord, WeaponRecord } from '../types'
import { filterModsForCompanion, filterModsForCompanionWeapon, filterModsForWarframe, filterModsForWeapon } from './modCompatibility'

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
    // Uma cópia Expert com o mesmo nome do mod normal é interna.
    const expert = { ...mod('/Lotus/Upgrades/Mods/Rifle/Expert/WeaponDamageAmountModExpert'), name: normal.name }

    expect(filterModsForWeapon([normal, beginner, intermediate, expert], rifle)).toEqual([normal])
  })

  it('keeps real mods stored in the Expert folder (Primed, Galvanized)', () => {
    const normal = mod('/Lotus/Upgrades/Mods/Rifle/WeaponDamageAmountMod')
    const galvanized = { ...mod('/Lotus/Upgrades/Mods/Rifle/Expert/WeaponCritChanceSPMod'), name: 'Galvanized Scope' }

    expect(filterModsForWeapon([normal, galvanized], rifle)).toEqual([normal, galvanized])
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
  const petPrecept = { ...base, uniqueName: '/Lotus/Types/Friendly/Pets/CatbrowPetPrecepts/Charm', name: 'Charm' }
  const moaPrecept = { ...base, uniqueName: '/Lotus/Types/Friendly/Pets/MoaPets/MoaPetPrecepts/AntiGrav', name: 'Anti-Grav Grenade' }
  const houndPrecept = { ...base, uniqueName: '/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetPrecepts/NullAudit', name: 'Null Audit' }
  const all = [vitality, precept, beastMod, petPrecept, moaPrecept, houndPrecept]

  it('separates mods and precepts by companion type', () => {
    expect(filterModsForCompanion(all, 'Sentinel').map((mod) => mod.name)).toEqual(['Enhanced Vitality', 'Primed Regen'])
    expect(filterModsForCompanion(all, 'Beast').map((mod) => mod.name)).toEqual(['Enhanced Vitality', 'Charm'])
    expect(filterModsForCompanion(all, 'MOA').map((mod) => mod.name)).toEqual(['Enhanced Vitality', 'Anti-Grav Grenade'])
    expect(filterModsForCompanion(all, 'Hound').map((mod) => mod.name)).toEqual(['Enhanced Vitality', 'Null Audit'])
  })
})

describe('filterModsForCompanionWeapon', () => {
  const base = { baseDrain: 4, polarity: 'madurai', fusionLimit: 10 }
  const serration = { ...base, uniqueName: '/Lotus/Upgrades/Mods/Rifle/WeaponDamageAmountMod', name: 'Serration', type: 'Primary Mod' }
  const pointBlank = { ...base, uniqueName: '/Lotus/Upgrades/Mods/Shotgun/WeaponDamageAmountMod', name: 'Point Blank', type: 'Shotgun Mod' }
  const pressure = { ...base, uniqueName: '/Lotus/Upgrades/Mods/Melee/WeaponMeleeDamageMod', name: 'Pressure Point', type: 'Melee Mod' }
  const laser = { uniqueName: '/laser', name: 'Laser Rifle', category: 'Primary' as const, type: 'Companion Weapon' }
  const all = [serration, pointBlank, pressure]

  it('uses the weapon class to pick rifle, shotgun or melee mods', () => {
    expect(filterModsForCompanionWeapon(all, laser, { category: 'Primary', modTypes: ['Rifle'] }).map((mod) => mod.name)).toEqual(['Serration'])
    expect(filterModsForCompanionWeapon(all, laser, { category: 'Primary', modTypes: ['Shotgun'] }).map((mod) => mod.name)).toEqual(['Point Blank'])
    expect(filterModsForCompanionWeapon(all, laser, { category: 'Melee', modTypes: ['Melee'] }).map((mod) => mod.name)).toEqual(['Pressure Point'])
  })

  it('returns nothing for weapons without a known class', () => {
    expect(filterModsForCompanionWeapon(all, laser, undefined)).toEqual([])
  })
})
