import type { ArcaneRecord, ModRecord, WarframeRecord } from '../types'

/** Ganho total ao chegar ao ranque 30 (wiki Warframes, "Leveling Up"). */
export const rank30Bonus = { health: 100, shield: 100, energy: 50 } as const

export interface WarframeBaseStats {
  health: number
  shield: number
  armor: number
  energy: number
}

export interface WarframeStats extends WarframeBaseStats {
  strength: number
  duration: number
  range: number
  efficiency: number
  /** Multiplicador aplicado ao custo de energia das habilidades. */
  energyCostMultiplier: number
  ignoredEffects: string[]
}

export interface RankedWarframeUpgrade {
  upgrade: Pick<ModRecord | ArcaneRecord, 'name' | 'levelStats'>
  rank: number
}

type BonusKey = 'health' | 'shield' | 'armor' | 'energy' | 'strength' | 'duration' | 'range' | 'efficiency'

const statNames: Record<string, BonusKey> = {
  health: 'health',
  'shield capacity': 'shield',
  armor: 'armor',
  'energy max': 'energy',
  'ability strength': 'strength',
  'ability duration': 'duration',
  'ability range': 'range',
  'ability efficiency': 'efficiency',
}

/** Valores base no ranque 30. Warframes sem escudo (ex.: Inaros) continuam com 0. */
export function getRank30BaseStats(frame: WarframeRecord): WarframeBaseStats {
  return {
    health: frame.health + rank30Bonus.health,
    shield: frame.shield > 0 ? frame.shield + rank30Bonus.shield : 0,
    armor: frame.armor,
    energy: frame.power + rank30Bonus.energy,
  }
}

function applyStat(bonuses: Record<BonusKey, number>, ignored: string[], rawStat: string): void {
  let unmatched = false
  for (const line of rawStat.replace(/\\n/g, '\n').split('\n')) {
    const stat = line.replace(/<[^>]*>/g, '').trim()
    if (!stat) continue
    const match = stat.match(/^([+-]?\d+(?:\.\d+)?)%\s+(.+)$/)
    const key = match ? statNames[match[2].trim().toLocaleLowerCase('en-US')] : undefined
    if (!match || !key) {
      unmatched = true
      continue
    }
    bonuses[key] += Number(match[1]) / 100
  }
  if (unmatched) ignored.push(rawStat.replace(/\\n/g, ' '))
}

export function getEnergyCostMultiplier(efficiency: number): number {
  return Math.min(1.75, Math.max(0.25, 2 - efficiency))
}

export function calculateWarframeStats(
  frame: WarframeRecord,
  upgrades: RankedWarframeUpgrade[] = [],
): WarframeStats {
  const bonuses: Record<BonusKey, number> = {
    health: 0, shield: 0, armor: 0, energy: 0, strength: 0, duration: 0, range: 0, efficiency: 0,
  }
  const ignoredEffects: string[] = []

  for (const { upgrade, rank } of upgrades) {
    const levels = upgrade.levelStats ?? []
    if (!Number.isInteger(rank) || rank < 0 || (levels.length > 0 && rank >= levels.length)) {
      throw new RangeError(`Rank ${rank} is invalid for ${upgrade.name}.`)
    }
    for (const stat of levels[rank]?.stats ?? []) applyStat(bonuses, ignoredEffects, stat)
  }

  const base = getRank30BaseStats(frame)
  const efficiency = 1 + bonuses.efficiency

  return {
    health: base.health * (1 + bonuses.health),
    shield: base.shield * (1 + bonuses.shield),
    armor: base.armor * (1 + bonuses.armor),
    energy: base.energy * (1 + bonuses.energy),
    strength: 1 + bonuses.strength,
    duration: 1 + bonuses.duration,
    range: 1 + bonuses.range,
    efficiency,
    energyCostMultiplier: getEnergyCostMultiplier(efficiency),
    ignoredEffects,
  }
}
