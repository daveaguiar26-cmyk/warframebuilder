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
}

export interface ModRecord {
  uniqueName: string
  name: string
  type?: string
  imageName?: string
  description?: string
  baseDrain: number
  polarity: string
  fusionLimit: number
  isExilus?: boolean
  levelStats?: Array<{ stats: string[] }>
}

export interface CatalogData {
  generatedAt: string | null
  source: string
  weapons: WeaponRecord[]
  mods: ModRecord[]
}
