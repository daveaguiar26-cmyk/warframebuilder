import { describe, expect, it } from 'vitest'
import type { ModRecord } from '../types'
import { calculateCapacity, getRankedDrain, getSlotDrain } from './capacity'

function mod(overrides: Partial<ModRecord> = {}): ModRecord {
  return {
    uniqueName: '/test/mod',
    name: 'Test Mod',
    baseDrain: 4,
    polarity: 'madurai',
    fusionLimit: 10,
    ...overrides,
  }
}

describe('mod capacity', () => {
  it('uses the rank-specific base drain', () => {
    expect(getRankedDrain(mod(), 10)).toBe(14)
  })

  it('halves a matching drain and rounds up', () => {
    expect(getSlotDrain({ index: 0, polarity: 'madurai', mod: mod({ baseDrain: 13 }), rank: 0 })).toBe(7)
  })

  it('adds the briefing table penalty for a mismatched polarity', () => {
    expect(getSlotDrain({ index: 0, polarity: 'naramon', mod: mod({ baseDrain: 14 }), rank: 0 })).toBe(18)
    expect(getSlotDrain({ index: 0, polarity: 'naramon', mod: mod({ baseDrain: 5, fusionLimit: 0 }), rank: 0 })).toBe(6)
  })

  it('does not alter drain in an unpolarized slot', () => {
    expect(getSlotDrain({ index: 0, mod: mod(), rank: 2 })).toBe(6)
  })

  it('treats a universal slot as matching all non-Umbra mods', () => {
    expect(getSlotDrain({ index: 0, polarity: 'universal', mod: mod(), rank: 0 })).toBe(2)
    expect(getSlotDrain({ index: 0, polarity: 'universal', mod: mod({ polarity: 'umbra' }), rank: 0 })).toBe(5)
  })

  it('doubles capacity with a catalyst and counts changed factory polarities', () => {
    const result = calculateCapacity({
      rank: 30,
      catalyst: true,
      slots: [
        { index: 0, polarity: 'madurai', factoryPolarity: 'madurai', mod: mod(), rank: 10 },
        { index: 1, polarity: 'vazarin', factoryPolarity: 'none' },
      ],
    })

    expect(result.baseCapacity).toBe(60)
    expect(result.usedCapacity).toBe(7)
    expect(result.formaRequired).toBe(1)
  })

  it('adds Aura capacity with the selected 20 percent mismatch penalty', () => {
    const result = calculateCapacity({
      rank: 30,
      catalyst: false,
      slots: [{ index: 0, kind: 'aura', polarity: 'naramon', mod: mod({ baseDrain: 2, fusionLimit: 5 }), rank: 5 }],
    })

    expect(result.bonusCapacity).toBe(6)
    expect(result.usedCapacity).toBe(0)
  })
})
