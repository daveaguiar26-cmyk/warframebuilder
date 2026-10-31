import { describe, expect, it } from 'vitest'
import type { ModRecord, WeaponRecord } from '../types'
import { getRankedModEffects } from './modEffects'
import { calculateWeaponStats } from './weapon'

function makeMod(name: string, stat: string, polarity = 'madurai'): ModRecord {
  return {
    uniqueName: `/test/${name.toLocaleLowerCase().replaceAll(' ', '-')}`,
    name,
    baseDrain: 0,
    polarity,
    fusionLimit: 0,
    levelStats: [{ stats: [stat] }],
  }
}

const rifle: WeaponRecord = {
  uniqueName: '/test/rifle',
  name: 'Test Rifle',
  category: 'Primary',
  totalDamage: 100,
  damage: { impact: 30, puncture: 30, slash: 40 },
  criticalChance: 0.12,
  criticalMultiplier: 2,
  statusChance: 0.1,
  fireRate: 2,
}

describe('weapon calculations', () => {
  it('parses ranked mod stat strings from the item catalog', () => {
    const serration = makeMod('Serration', '+165% Damage')
    const effects = getRankedModEffects(serration, 0)
    expect(effects.baseDamage).toBe(1.65)
  })

  it('calculates the wiki average critical multiplier above 100 percent', () => {
    const stats = calculateWeaponStats({
      weapon: { ...rifle, criticalChance: 0.5 },
      mods: [{ slotIndex: 0, mod: makeMod('Point Strike', '+150% Critical Chance'), rank: 0 }],
    })

    expect(stats.criticalChance).toBe(1.25)
    expect(stats.averageCriticalMultiplier).toBeCloseTo(2.25)
  })

  it('combines elemental mods in slot order and applies damage mods', () => {
    const cold = makeMod('Cryo Rounds', '+90% <DT_COLD_COLOR>Cold')
    const heat = makeMod('Hellfire', '+90% <DT_FIRE_COLOR>Heat')
    const stats = calculateWeaponStats({
      weapon: rifle,
      mods: [
        { slotIndex: 0, mod: cold, rank: 0 },
        { slotIndex: 1, mod: heat, rank: 0 },
        { slotIndex: 2, mod: makeMod('Serration', '+165% Damage'), rank: 0 },
      ],
    })

    expect(stats.damage.blast).toBeCloseTo(477)
    expect(stats.damage.cold).toBeUndefined()
    expect(stats.damage.heat).toBeUndefined()
    expect(stats.totalDamage).toBeCloseTo(742)
  })

  it('reports status chance by damage share and theoretical reference DPS', () => {
    const stats = calculateWeaponStats({
      weapon: rifle,
      mods: [
        { slotIndex: 0, mod: makeMod('Serration', '+165% Damage'), rank: 0 },
        { slotIndex: 1, mod: makeMod('Point Strike', '+150% Critical Chance'), rank: 0 },
        { slotIndex: 2, mod: makeMod('Vital Sense', '+120% Critical Damage'), rank: 0 },
      ],
    })

    expect(stats.totalDamage).toBe(265)
    expect(stats.criticalChance).toBe(0.3)
    expect(stats.criticalMultiplier).toBe(4.4)
    expect(stats.averageCriticalMultiplier).toBeCloseTo(2.02)
    expect(stats.statusChanceByType.impact).toBeCloseTo(0.03)
    expect(stats.referenceDps).toBeCloseTo(1070.6)
  })

  it('keeps unsupported conditional effects out of the result and reports them', () => {
    const conditional = makeMod('Conditional', '+300% Damage while Invisible')
    const stats = calculateWeaponStats({ weapon: rifle, mods: [{ slotIndex: 0, mod: conditional, rank: 0 }] })
    expect(stats.totalDamage).toBe(100)
    expect(stats.ignoredEffects).toContain('Slot 1: +300% Damage while Invisible')
  })
})
