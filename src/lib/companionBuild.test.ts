import { describe, expect, it } from 'vitest'
import type { CompanionRecord, ModRecord } from '../types'
import { decodeBuildCode, encodeBuildCode } from './buildCode'
import { createCompanionSlots, restoreCompanionBuild, toCompanionBuildItem } from './companionBuild'

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
const catalog = { companions: [carrier], mods: [vitality, bite] }

describe('companion build codes', () => {
  it('round-trips a companion build through a WFB1 code', () => {
    const slots = createCompanionSlots(carrier)
    slots[3] = { ...slots[3], modId: vitality.uniqueName, rank: 10 }
    const state = { companionId: carrier.uniqueName, reactor: true, slots }
    const decoded = decodeBuildCode(encodeBuildCode({ v: 1, itens: [toCompanionBuildItem(state)] }))
    expect(restoreCompanionBuild(decoded.itens[0], catalog)).toEqual(state)
  })

  it('rejects beast mods on a sentinel', () => {
    const slots = createCompanionSlots(carrier)
    slots[0] = { ...slots[0], modId: bite.uniqueName }
    const item = toCompanionBuildItem({ companionId: carrier.uniqueName, reactor: false, slots })
    expect(() => restoreCompanionBuild(item, catalog)).toThrow('não pode ser usado')
  })
})
