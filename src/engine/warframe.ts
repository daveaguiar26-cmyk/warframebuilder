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

interface RankUpGain { health: number; shield: number; armor: number; energy: number; strength?: number }

/**
 * Excepções da tabela "Rank-Up Exceptions" (wiki Warframes, lida até ao Nidus em 23/11/2026).
 * Ganho total no ranque 30: vida | escudo | armadura | energia.
 */
const g = (health: number, shield: number, armor: number, energy: number, strength?: number): RankUpGain =>
  ({ health, shield, armor, energy, strength })
export const rankUpExceptions: Record<string, RankUpGain> = {
  Baruuk: g(100, 100, 0, 100), 'Baruuk Prime': g(100, 100, 0, 100),
  'Chroma Prime': g(100, 100, 0, 100),
  Dante: g(90, 90, 0, 70),
  Garuda: g(100, 100, 0, 100), 'Garuda Prime': g(100, 100, 0, 100),
  Grendel: g(200, 0, 0, 50), 'Grendel Prime': g(200, 0, 0, 50),
  Hildryn: g(100, 500, 0, 0), 'Hildryn Prime': g(100, 500, 0, 0),
  Inaros: g(200, 0, 0, 50), 'Inaros Prime': g(200, 0, 0, 50),
  Koumei: g(100, 100, 0, 100),
  Kullervo: g(200, 0, 100, 50),
  Lavos: g(200, 100, 100, 0), 'Lavos Prime': g(200, 100, 100, 0),
  Narin: g(100, 100, 0, 100),
  Nezha: g(100, 50, 0, 50), 'Nezha Prime': g(100, 50, 0, 50),
  Nidus: g(100, 0, 100, 50, 0.15), 'Nidus Prime': g(100, 0, 100, 50, 0.15),
}

function getRankUpGain(frame: WarframeRecord): RankUpGain {
  return rankUpExceptions[frame.name] ?? {
    health: rank30Bonus.health,
    shield: frame.shield > 0 ? rank30Bonus.shield : 0,
    armor: 0,
    energy: rank30Bonus.energy,
  }
}

/** Valores base no ranque 30. Warframes sem escudo continuam com 0. */
export function getRank30BaseStats(frame: WarframeRecord): WarframeBaseStats {
  const gain = getRankUpGain(frame)
  return {
    health: frame.health + gain.health,
    shield: frame.shield + gain.shield,
    armor: frame.armor + gain.armor,
    energy: frame.power + gain.energy,
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
  const rankStrength = getRankUpGain(frame).strength ?? 0

  return {
    health: base.health * (1 + bonuses.health),
    shield: base.shield * (1 + bonuses.shield),
    armor: base.armor * (1 + bonuses.armor),
    energy: base.energy * (1 + bonuses.energy),
    strength: 1 + rankStrength + bonuses.strength,
    duration: 1 + bonuses.duration,
    range: 1 + bonuses.range,
    efficiency,
    energyCostMultiplier: getEnergyCostMultiplier(efficiency),
    ignoredEffects,
  }
}
