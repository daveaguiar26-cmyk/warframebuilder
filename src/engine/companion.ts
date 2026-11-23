import { getCompanionBaseStats, type CompanionParts } from '../data/companionData'
import type { CompanionRecord } from '../types'
import { sumUpgradeBonuses, type RankedWarframeUpgrade } from './warframe'

export interface CompanionStats {
  health: number
  shield: number
  armor: number
  ignoredEffects: string[]
}

/** Os dados já trazem os valores de ranque 30; os mods somam percentagens a esses valores. */
export function calculateCompanionStats(
  companion: CompanionRecord,
  upgrades: RankedWarframeUpgrade[] = [],
  parts: CompanionParts = {},
): CompanionStats {
  const { bonuses, ignoredEffects } = sumUpgradeBonuses(upgrades)
  const base = getCompanionBaseStats(companion, parts)
  return {
    health: base.health * (1 + bonuses.health),
    shield: base.shield * (1 + bonuses.shield),
    armor: base.armor * (1 + bonuses.armor),
    ignoredEffects,
  }
}
