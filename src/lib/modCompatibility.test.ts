import { describe, expect, it } from 'vitest'
import type { ModRecord, WeaponRecord } from '../types'
import { filterModsForWeapon } from './modCompatibility'

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
