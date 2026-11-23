import { describe, expect, it } from 'vitest'
import type { ArcaneRecord, ModRecord, WarframeRecord } from '../types'
import { decodeBuildCode, encodeBuildCode } from './buildCode'
import {
  auraSlotIndex,
  createArcaneSlots,
  createWarframeSlots,
  exilusSlotIndex,
  restoreWarframeBuild,
  toWarframeBuildItem,
} from './warframeBuild'

const mesa: WarframeRecord = {
  uniqueName: '/Lotus/Powersuits/Cowgirl/Cowgirl',
  name: 'Mesa',
  health: 365,
  shield: 180,
  armor: 105,
  power: 100,
  aura: 'madurai',
  polarities: ['naramon', 'naramon'],
  abilities: [],
}
const base = { baseDrain: 4, polarity: 'madurai', fusionLimit: 5, type: 'Warframe Mod' }
const intensify: ModRecord = { ...base, uniqueName: '/Lotus/Upgrades/Mods/Warframe/AvatarAbilityStrengthMod', name: 'Intensify' }
const aura: ModRecord = { ...base, uniqueName: '/Lotus/Upgrades/Mods/Aura/EnemyArmorReductionAuraMod', name: 'Corrosive Projection' }
const grace: ArcaneRecord = { uniqueName: '/arcane/grace', name: 'Arcane Grace', levelStats: Array.from({ length: 6 }, () => ({ stats: [] })) }
const catalog = { warframes: [mesa], mods: [intensify, aura], arcanes: [grace] }

describe('Warframe build codes', () => {
  it('creates ten slots with factory, aura and exilus polarities', () => {
    const slots = createWarframeSlots(mesa)
    expect(slots).toHaveLength(10)
    expect(slots[0].factoryPolarity).toBe('naramon')
    expect(slots[2].factoryPolarity).toBe('none')
    expect(slots[auraSlotIndex].factoryPolarity).toBe('madurai')
    expect(slots[exilusSlotIndex].factoryPolarity).toBe('none')
  })

  it('round-trips a Warframe build through a WFB1 code', () => {
    const slots = createWarframeSlots(mesa)
    slots[0] = { ...slots[0], modId: intensify.uniqueName, rank: 5 }
    slots[auraSlotIndex] = { ...slots[auraSlotIndex], modId: aura.uniqueName, rank: 3 }
    const arcanes = createArcaneSlots()
    arcanes[0] = { arcaneId: grace.uniqueName, rank: 5 }
    const state = { frameId: mesa.uniqueName, reactor: true, slots, arcanes }

    const decoded = decodeBuildCode(encodeBuildCode({ v: 1, itens: [toWarframeBuildItem(state)] }))
    expect(restoreWarframeBuild(decoded.itens[0], catalog)).toEqual(state)
  })

  it('rejects mods placed in an incompatible slot', () => {
    const slots = createWarframeSlots(mesa)
    slots[0] = { ...slots[0], modId: aura.uniqueName }
    const item = toWarframeBuildItem({ frameId: mesa.uniqueName, reactor: false, slots, arcanes: createArcaneSlots() })
    expect(() => restoreWarframeBuild(item, catalog)).toThrow('não pode ser usado')
  })

  it('rejects arcane ranks above the maximum', () => {
    const item = toWarframeBuildItem({
      frameId: mesa.uniqueName,
      reactor: false,
      slots: createWarframeSlots(mesa),
      arcanes: [{ arcaneId: grace.uniqueName, rank: 6 }, { arcaneId: null, rank: 0 }],
    })
    expect(() => restoreWarframeBuild(item, catalog)).toThrow('excede o máximo')
  })
})
