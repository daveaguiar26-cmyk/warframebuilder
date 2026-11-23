import { describe, expect, it } from 'vitest'
import type { CompanionRecord, ModRecord } from '../types'
import { decodeBuildCode, encodeBuildCode } from './buildCode'
import { createCompanionSlots, restoreCompanionBuild, toCompanionBuildItem, toCompanionBuildItems } from './companionBuild'

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
const catalog = { companions: [carrier], mods: [vitality, bite], weapons: [sweeper] }

describe('companion build codes', () => {
  it('round-trips a companion build through a WFB1 code', () => {
    const slots = createCompanionSlots(carrier)
    slots[3] = { ...slots[3], modId: vitality.uniqueName, rank: 10 }
    const state = { companionId: carrier.uniqueName, reactor: true, slots, weaponId: sweeper.uniqueName }
    const decoded = decodeBuildCode(encodeBuildCode({ v: 1, itens: toCompanionBuildItems(state) }))
    expect(decoded.itens).toHaveLength(2)
    expect(restoreCompanionBuild(decoded.itens[0], catalog, decoded.itens)).toEqual(state)
  })

  it('rejects beast mods on a sentinel', () => {
    const slots = createCompanionSlots(carrier)
    slots[0] = { ...slots[0], modId: bite.uniqueName }
    const item = toCompanionBuildItem({ companionId: carrier.uniqueName, reactor: false, slots, weaponId: null })
    expect(() => restoreCompanionBuild(item, catalog)).toThrow('não pode ser usado')
  })
})
