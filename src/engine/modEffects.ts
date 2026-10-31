import type { ModRecord } from '../types'
import type { DamageType, RankedModEffects } from './types'

const damageTypes = new Set<DamageType>([
  'impact', 'puncture', 'slash', 'heat', 'cold', 'electricity', 'toxin',
  'blast', 'corrosive', 'gas', 'magnetic', 'radiation', 'viral', 'void', 'tau', 'true',
])

const damageTypeAliases: Record<string, DamageType> = {
  electric: 'electricity',
  electricity: 'electricity',
  puncture: 'puncture',
  impact: 'impact',
  slash: 'slash',
  toxin: 'toxin',
  cold: 'cold',
  heat: 'heat',
  blast: 'blast',
  corrosive: 'corrosive',
  gas: 'gas',
  magnetic: 'magnetic',
  radiation: 'radiation',
  viral: 'viral',
  void: 'void',
  tau: 'tau',
  true: 'true',
}

function emptyEffects(): RankedModEffects {
  return {
    baseDamage: 0,
    physicalDamage: {},
    elementalDamage: {},
    elementalOrder: [],
    criticalChance: 0,
    criticalDamage: 0,
    statusChance: 0,
    multishot: 0,
    fireRate: 0,
    attackSpeed: 0,
    ignoredEffects: [],
  }
}

function getDamageType(stat: string): DamageType | undefined {
  const name = stat.toLocaleLowerCase('en-US').trim()
  const damageType = damageTypeAliases[name]
  return damageType && damageTypes.has(damageType) ? damageType : undefined
}

function add(target: Record<string, number>, key: string, value: number): void {
  target[key] = (target[key] ?? 0) + value
}

function applyStat(effects: RankedModEffects, rawStat: string): void {
  const stat = rawStat.replace(/<[^>]*>/g, '').trim()
  const match = stat.match(/^([+-]?\d+(?:\.\d+)?)%\s+(.+)$/)
  if (!match) {
    effects.ignoredEffects.push(rawStat)
    return
  }

  const bonus = Number(match[1]) / 100
  const name = match[2].trim()
  const normalizedName = name.toLocaleLowerCase('en-US')

  if (normalizedName === 'damage') {
    effects.baseDamage += bonus
    return
  }
  if (normalizedName === 'critical chance') {
    effects.criticalChance += bonus
    return
  }
  if (normalizedName === 'critical damage') {
    effects.criticalDamage += bonus
    return
  }
  if (normalizedName === 'status chance') {
    effects.statusChance += bonus
    return
  }
  if (normalizedName === 'multishot') {
    effects.multishot += bonus
    return
  }
  if (normalizedName === 'fire rate') {
    effects.fireRate += bonus
    return
  }
  if (normalizedName === 'attack speed') {
    effects.attackSpeed += bonus
    return
  }

  const damageType = getDamageType(name)
  if (damageType === 'impact' || damageType === 'puncture' || damageType === 'slash') {
    add(effects.physicalDamage, damageType, bonus)
    return
  }
  if (damageType) {
    add(effects.elementalDamage, damageType, bonus)
    effects.elementalOrder.push({ type: damageType, bonus })
    return
  }

  effects.ignoredEffects.push(rawStat)
}

export function getRankedModEffects(mod: ModRecord, rank: number): RankedModEffects {
  if (!Number.isInteger(rank) || rank < 0 || rank > mod.fusionLimit) {
    throw new RangeError(`Rank ${rank} is invalid for ${mod.name}.`)
  }

  const effects = emptyEffects()
  for (const stat of mod.levelStats?.[rank]?.stats ?? []) {
    applyStat(effects, stat)
  }
  return effects
}
