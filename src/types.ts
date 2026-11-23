export type WeaponCategory = 'Primary' | 'Secondary' | 'Melee'

export interface WeaponRecord {
  uniqueName: string
  name: string
  category: WeaponCategory
  type?: string
  imageName?: string
  masteryReq?: number
  totalDamage?: number
  damage?: Record<string, number>
  criticalChance?: number
  criticalMultiplier?: number
  statusChance?: number
  multishot?: number
  fireRate?: number
  magazineSize?: number
  reloadTime?: number
  polarities?: string[]
  /** Polaridade de fábrica do slot de Stance (corpo a corpo). */
  stancePolarity?: string
}

/** Armas de sentinela: geridas no separador Companheiros. */
export const companionWeaponType = 'Companion Weapon'

export interface ModRecord {
  uniqueName: string
  name: string
  type?: string
  imageName?: string
  description?: string
  compatName?: string
  baseDrain: number
  polarity: string
  fusionLimit: number
  isExilus?: boolean
  /** Mod de utilidade: pode ir para o slot Exilus de uma arma. */
  isUtility?: boolean
  levelStats?: Array<{ stats: string[] }>
}

export interface AbilityRecord {
  uniqueName: string
  name: string
  description?: string
  imageName?: string
}

export interface WarframeRecord {
  uniqueName: string
  name: string
  imageName?: string
  masteryReq?: number
  /** Valores de ranque 0, tal como vêm de @wfcd/items. */
  health: number
  shield: number
  armor: number
  power: number
  sprintSpeed?: number
  aura?: string
  exilusPolarity?: string
  polarities?: string[]
  passiveDescription?: string
  abilities: AbilityRecord[]
}

export interface ArcaneRecord {
  uniqueName: string
  name: string
  imageName?: string
  rarity?: string
  levelStats?: Array<{ stats: string[] }>
}

export type CompanionKind = 'Sentinel' | 'Beast' | 'MOA' | 'Hound'

export interface CompanionRecord {
  uniqueName: string
  name: string
  kind: CompanionKind
  imageName?: string
  masteryReq?: number
  /** Valores de ranque 30 (desde o Update 34 os dados já trazem os valores finais). */
  health: number
  shield: number
  armor: number
  polarities?: string[]
}

export interface CatalogData {
  generatedAt: string | null
  source: string
  weapons: WeaponRecord[]
  mods: ModRecord[]
  warframes?: WarframeRecord[]
  arcanes?: ArcaneRecord[]
  companions?: CompanionRecord[]
}
