import { describe, expect, it } from 'vitest'
import type { CompanionRecord } from '../types'
import { calculateCompanionStats } from './companion'

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
