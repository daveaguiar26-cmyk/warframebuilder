import { describe, expect, it } from 'vitest'
import type { CompanionRecord } from '../types'
import { calculateCompanionStats } from './companion'
import { modularCompanions } from '../data/companionData'

const carrier: CompanionRecord = {
  uniqueName: '/Lotus/Types/Sentinels/SentinelPowersuits/CarrierPowerSuit',
  name: 'Carrier',
  kind: 'Sentinel',
  health: 560,
  shield: 250,
  armor: 80,
}

function upgrade(name: string, stat: string) {
  return { upgrade: { name, levelStats: [{ stats: [stat] }] }, rank: 0 }
}

describe('companion calculations', () => {
  it('uses catalog values as rank 30 stats', () => {
    expect(calculateCompanionStats(carrier)).toEqual({ health: 560, shield: 250, armor: 80, ignoredEffects: [] })
  })

  it('applies Enhanced Vitality, Calculated Redirection and Metal Fiber', () => {
    const stats = calculateCompanionStats(carrier, [
      upgrade('Enhanced Vitality', '+250% Health'),
      upgrade('Calculated Redirection', '+250% Shield Capacity'),
      upgrade('Metal Fiber', '+250% Armor'),
    ])
    expect(stats.health).toBe(1960)
    expect(stats.shield).toBe(875)
    expect(stats.armor).toBe(280)
  })

  it('ignores precepts and other non-percentage effects', () => {
    const stats = calculateCompanionStats(carrier, [upgrade('Primed Regen', 'Sentinel recovery time reduced by 35s.')])
    expect(stats.health).toBe(560)
    expect(stats.ignoredEffects).toHaveLength(1)
  })
})

describe('modular companion stats (gilded, rank 30)', () => {
  const [moa, hound] = modularCompanions

  it('applies MOA core and gyro modifiers; total stays 1190', () => {
    const stats = calculateCompanionStats(moa, [], { modelo: 'Para', nucleo: 'Lehan', giroscopio: 'Atheca', suporte: 'Drimper' })
    expect(stats.health).toBeCloseTo(472.5)
    expect(stats.health + stats.shield + stats.armor).toBeCloseTo(1190)
  })

  it('matches the wiki gilded table for Hound Adlet + Cela (420 / 585 / 315)', () => {
    const stats = calculateCompanionStats(hound, [], { modelo: 'Hec', nucleo: 'Adlet', suporte: 'Cela', estabilizador: 'Frak' })
    expect(stats.health).toBeCloseTo(420)
    expect(stats.shield).toBeCloseTo(585)
    expect(stats.armor).toBeCloseTo(315)
  })
})
