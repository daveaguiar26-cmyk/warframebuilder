import type { CompanionRecord } from '../types'
import { sumUpgradeBonuses, type RankedWarframeUpgrade } from './warframe'

export interface CompanionStats {
  health: number
  shield: number
  armor: number
  ignoredEffects: string[]
}

/** Os dados já trazem os valores de ranque 30; os mods somam percentagens a esses valores. */
export function calculateCompanionStats(companion: CompanionRecord, upgrades: RankedWarframeUpgrade[] = []): CompanionStats {
  const { bonuses, ignoredEffects } = sumUpgradeBonuses(upgrades)
  return {
    health: companion.health * (1 + bonuses.health),
    shield: companion.shield * (1 + bonuses.shield),
    armor: companion.armor * (1 + bonuses.armor),
    ignoredEffects,
  }
}
