import { describe, expect, it } from 'vitest'
import type { WarframeRecord } from '../types'
import { calculateWarframeStats, getEnergyCostMultiplier, getRank30BaseStats } from './warframe'

const mesa: WarframeRecord = {
  uniqueName: '/Lotus/Powersuits/Cowgirl/Cowgirl',
  name: 'Mesa',
  health: 365,
  shield: 180,
  armor: 105,
  power: 100,
  abilities: [],
}

const inaros: WarframeRecord = { ...mesa, name: 'Inaros', health: 2110, shield: 0, armor: 200 }
const nidus: WarframeRecord = { ...mesa, name: 'Nidus', health: 675, shield: 0, armor: 300 }

function upgrade(name: string, ...stats: string[]) {
  return { upgrade: { name, levelStats: [{ stats }] }, rank: 0 }
}

describe('warframe calculations', () => {
  it('uses the wiki rank 30 values (Mesa: 465 / 280 / 105 / 150)', () => {
    expect(getRank30BaseStats(mesa)).toEqual({ health: 465, shield: 280, armor: 105, energy: 150 })
  })

  it('keeps shieldless frames at 0 shield (Inaros: 2310 health, 0 shield)', () => {
    const base = getRank30BaseStats(inaros)
    expect(base.health).toBe(2310)
    expect(base.shield).toBe(0)
  })

  it('applies the Nidus rank-up exception (+100 armor, +15% strength)', () => {
    expect(getRank30BaseStats(nidus)).toEqual({ health: 775, shield: 0, armor: 400, energy: 150 })
    expect(calculateWarframeStats(nidus).strength).toBeCloseTo(1.15)
  })

  it('applies percentage mods to rank 30 base values', () => {
    const stats = calculateWarframeStats(mesa, [
      upgrade('Vitality', '+100% Health'),
      upgrade('Redirection', '+100% Shield Capacity'),
      upgrade('Steel Fiber', '+100% Armor'),
      upgrade('Primed Flow', '+185% Energy Max'),
    ])
    expect(stats.health).toBe(930)
    expect(stats.shield).toBe(560)
    expect(stats.armor).toBe(210)
    expect(stats.energy).toBeCloseTo(427.5)
  })

  it('sums ability attributes, including negative ones', () => {
    const stats = calculateWarframeStats(mesa, [
      upgrade('Blind Rage', '+99% Ability Strength', '-55% Ability Efficiency'),
      upgrade('Transient Fortitude', '+55% Ability Strength', '-27.5% Ability Duration'),
      upgrade('Stretch', '+82.5% Ability Range'),
    ])
    expect(stats.strength).toBeCloseTo(2.54)
    expect(stats.duration).toBeCloseTo(0.725)
    expect(stats.range).toBeCloseTo(1.825)
    expect(stats.efficiency).toBeCloseTo(0.45)
    expect(stats.energyCostMultiplier).toBeCloseTo(1.55)
  })

  it('limits the energy cost between 25% and 175%', () => {
    expect(getEnergyCostMultiplier(1)).toBe(1)
    expect(getEnergyCostMultiplier(1.9)).toBe(0.25)
    expect(getEnergyCostMultiplier(0.1)).toBe(1.75)
  })

  it('reports conditional effects as ignored', () => {
    const stats = calculateWarframeStats(mesa, [
      upgrade('Power Drift', '+15% Ability Strength', '+30% Chance to Resist Knockdown'),
      upgrade('Arcane Grace', 'On Damaged:\\n6% chance for +4% Health Regen/s for 6s'),
    ])
    expect(stats.strength).toBeCloseTo(1.15)
    expect(stats.ignoredEffects).toHaveLength(2)
  })

  it('rejects ranks outside the level table', () => {
    expect(() => calculateWarframeStats(mesa, [{ ...upgrade('Flow', '+100% Energy Max'), rank: 3 }])).toThrow(RangeError)
  })
})
