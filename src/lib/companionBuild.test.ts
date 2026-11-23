import { describe, expect, it } from 'vitest'
import type { CompanionRecord, ModRecord } from '../types'
import { decodeBuildCode, encodeBuildCode } from './buildCode'
import { beastClaws, modularCompanions } from '../data/companionData'
import {
  createCompanionSlots,
  createWeaponSlots,
  filterModsForCompanionWeaponRecord,
  postureSlotIndex,
  getCompanionWeapon,
  getRoboticWeapons,
  restoreCompanionBuild,
  toCompanionBuildItem,
  toCompanionBuildItems,
} from './companionBuild'

const carrier: CompanionRecord = {
  uniqueName: '/Lotus/Types/Sentinels/SentinelPowersuits/CarrierPowerSuit',
  name: 'Carrier',
  kind: 'Sentinel',
  health: 560,
  shield: 250,
  armor: 80,
  polarities: ['penjaga', 'penjaga', 'penjaga', 'vazarin', 'penjaga'],
}
const base = { baseDrain: 2, polarity: 'vazarin', fusionLimit: 10, type: 'Companion Mod' }
const vitality: ModRecord = { ...base, uniqueName: '/Lotus/Upgrades/Mods/Sentinel/SentinelHealthMaxMod', name: 'Enhanced Vitality' }
const bite: ModRecord = { ...base, uniqueName: '/Lotus/Upgrades/Mods/Sentinel/Kubrow/KubrowCritMod', name: 'Bite' }
const sweeper = { uniqueName: '/Lotus/Types/Sentinels/SentinelWeapons/SentShotgun', name: 'Sweeper', category: 'Primary' as const, type: 'Companion Weapon' }
const pointBlank: ModRecord = { baseDrain: 4, polarity: 'madurai', fusionLimit: 5, type: 'Shotgun Mod', uniqueName: '/Lotus/Upgrades/Mods/Shotgun/WeaponDamageAmountMod', name: 'Point Blank' }
const catalog = { companions: [carrier], mods: [vitality, bite], weapons: [sweeper] }

describe('companion build codes', () => {
  it('round-trips a companion build through a WFB1 code', () => {
    const slots = createCompanionSlots(carrier)
    slots[3] = { ...slots[3], modId: vitality.uniqueName, rank: 10 }
    const state = { companionId: carrier.uniqueName, reactor: true, slots, weaponId: sweeper.uniqueName, parts: {}, weaponSlots: createWeaponSlots(), weaponCatalyst: true }
    const decoded = decodeBuildCode(encodeBuildCode({ v: 1, itens: toCompanionBuildItems(state, sweeper) }))
    expect(decoded.itens).toHaveLength(2)
    expect(restoreCompanionBuild(decoded.itens[0], catalog, decoded.itens)).toEqual(state)
  })

  it('rejects beast mods on a sentinel', () => {
    const slots = createCompanionSlots(carrier)
    slots[0] = { ...slots[0], modId: bite.uniqueName }
    const item = toCompanionBuildItem({ companionId: carrier.uniqueName, reactor: false, slots, weaponId: null, parts: {}, weaponSlots: createWeaponSlots(), weaponCatalyst: false })
    expect(() => restoreCompanionBuild(item, catalog)).toThrow('não pode ser usado')
  })
})

describe('modular companions', () => {
  const moa = modularCompanions[0]
  const hound = modularCompanions[1]
  const akaten = { uniqueName: '/Lotus/Types/Friendly/Pets/ZanukaPets/ZanukaPetMeleeWeaponPS', name: 'Akaten', category: 'Primary' as const, type: 'Companion Weapon' }
  const weapons = [sweeper, akaten]

  it('round-trips MOA parts and the bracket polarity', () => {
    const parts = { modelo: 'Lambeo', nucleo: 'Lehan', giroscopio: 'Atheca', suporte: 'Jonsin' }
    const slots = createCompanionSlots(moa, parts)
    expect(slots[4].factoryPolarity).toBe('madurai')
    const weaponSlots = createWeaponSlots()
    weaponSlots[0] = { ...weaponSlots[0], modId: pointBlank.uniqueName, rank: 5 }
    const state = { companionId: moa.uniqueName, reactor: false, slots, weaponId: sweeper.uniqueName, parts, weaponSlots, weaponCatalyst: false }
    const decoded = decodeBuildCode(encodeBuildCode({ v: 1, itens: toCompanionBuildItems(state, sweeper) }))
    expect(restoreCompanionBuild(decoded.itens[0], { companions: [moa], mods: [pointBlank], weapons }, decoded.itens)).toEqual(state)
  })

  it('rejects unknown parts', () => {
    const item = toCompanionBuildItem({ companionId: moa.uniqueName, reactor: false, slots: createCompanionSlots(moa), weaponId: null, parts: { nucleo: 'Inventado' }, weaponSlots: createWeaponSlots(), weaponCatalyst: false })
    expect(() => restoreCompanionBuild(item, { companions: [moa], mods: [] })).toThrow('peças')
  })

  it('gives Hounds the weapon of their model and beasts their claws', () => {
    expect(getCompanionWeapon(hound, { weaponId: null, parts: { modelo: 'Hec' } }, weapons)?.name).toBe('Akaten')
    const smeeta = { ...carrier, name: 'Smeeta Kavat', kind: 'Beast' as const }
    expect(getCompanionWeapon(smeeta, { weaponId: null, parts: {} }, weapons)?.totalDamage).toBe(80)
  })

  it('keeps Hound weapons away from sentinels and MOAs', () => {
    expect(getRoboticWeapons(weapons).map((weapon) => weapon.name)).toEqual(['Sweeper'])
  })
})

describe('beast claws', () => {
  const smeeta: CompanionRecord = { ...carrier, uniqueName: '/smeeta', name: 'Smeeta Kavat', kind: 'Beast' }
  const posture: ModRecord = { baseDrain: -2, polarity: 'penjaga', fusionLimit: 3, type: 'Posture Mod', uniqueName: '/Lotus/Types/Friendly/Pets/BeastWeapons/Stances/BeastVIPStance', name: 'Assassin Posture' }
  const claws = beastClaws['Smeeta Kavat']

  it('have eight claw-mod slots plus a posture slot', () => {
    expect(createWeaponSlots(claws)).toHaveLength(9)
    expect(filterModsForCompanionWeaponRecord([bite, posture, vitality], claws).map((mod) => mod.name)).toEqual(['Bite'])
    expect(filterModsForCompanionWeaponRecord([bite, posture, vitality], claws, postureSlotIndex).map((mod) => mod.name)).toEqual(['Assassin Posture'])
  })

  it('round-trip claw mods through a WFB1 code', () => {
    const weaponSlots = createWeaponSlots(claws)
    weaponSlots[0] = { ...weaponSlots[0], modId: bite.uniqueName, rank: 10 }
    weaponSlots[postureSlotIndex] = { ...weaponSlots[postureSlotIndex], modId: posture.uniqueName, rank: 3 }
    const state = { companionId: smeeta.uniqueName, reactor: false, slots: createCompanionSlots(smeeta), weaponId: null, parts: {}, weaponSlots, weaponCatalyst: false }
    const decoded = decodeBuildCode(encodeBuildCode({ v: 1, itens: toCompanionBuildItems(state, claws) }))
    expect(restoreCompanionBuild(decoded.itens[0], { companions: [smeeta], mods: [bite, posture] }, decoded.itens)).toEqual(state)
  })
})
