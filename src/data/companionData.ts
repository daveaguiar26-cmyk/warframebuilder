/**
 * Dados de companheiros que não existem em @wfcd/items, copiados à mão da wiki oficial
 * (verificação: 23/11/2026). Fontes em FORMULAS.md.
 */
import type { CompanionRecord, WeaponRecord } from '../types'

export interface StatModifier { health: number; shield: number; armor: number }
export interface PartOption extends Partial<StatModifier> { name: string; polarity?: string }

/** https://wiki.warframe.com/w/Claws_(Beast). A página não indica velocidade de ataque. */
const claw = (companion: string, damage: Record<string, number>, criticalChance: number, criticalMultiplier: number, statusChance: number): WeaponRecord => ({
  uniqueName: `/Builder/BeastClaws/${companion.replaceAll(' ', '')}`,
  name: `Garras de ${companion}`,
  category: 'Melee',
  type: 'Beast Claws',
  damage,
  totalDamage: Object.values(damage).reduce((total, value) => total + value, 0),
  criticalChance,
  criticalMultiplier,
  statusChance,
})

export const beastClaws: Record<string, WeaponRecord> = Object.fromEntries([
  claw('Chesa Kubrow', { impact: 275 }, 0.15, 1.5, 0.15),
  claw('Huras Kubrow', { slash: 350 }, 0.2, 3.5, 0.05),
  claw('Raksa Kubrow', { puncture: 250 }, 0.075, 2.5, 0.2),
  claw('Sahasa Kubrow', { impact: 300 }, 0.1, 3, 0.05),
  claw('Sunika Kubrow', { slash: 550 }, 0.075, 3.5, 0.075),
  claw('Helminth Charger', { slash: 200, toxin: 50 }, 0.075, 2.5, 0.25),
  claw('Vizier Predasite', { impact: 150, corrosive: 150 }, 0.05, 3, 0.3),
  claw('Pharaoh Predasite', { puncture: 162, gas: 162 }, 0.075, 2.5, 0.25),
  claw('Medjay Predasite', { slash: 175, viral: 175 }, 0.1, 3, 0.2),
  claw('Adarza Kavat', { puncture: 45, slash: 45 }, 0.3, 2.5, 0.05),
  claw('Smeeta Kavat', { slash: 80 }, 0.2, 2, 0.075),
  claw('Vasca Kavat', { slash: 110 }, 0.15, 2, 0.25),
  claw('Sly Vulpaphyla', { impact: 40, magnetic: 40 }, 0.2, 2, 0.2),
  claw('Crescent Vulpaphyla', { puncture: 50, electricity: 50 }, 0.225, 2, 0.175),
  claw('Panzer Vulpaphyla', { slash: 45, toxin: 45 }, 0.25, 2, 0.125),
].map((weapon) => [weapon.name.replace('Garras de ', ''), weapon]))

/** https://wiki.warframe.com/w/MOA_(Companion). Valores das tabelas-resumo (gilded, ranque 30). */
export const moaBase: StatModifier = { health: 350, shield: 350, armor: 350 }
export const moaCores: PartOption[] = [
  { name: 'Drex', health: 0.1, shield: 0.15, armor: 0.05 },
  { name: 'Krisys', health: 0.1, shield: 0.05, armor: 0.15 },
  { name: 'Alcrom', health: 0.1, shield: 0.1, armor: 0.1 },
  { name: 'Lehan', health: 0.15, shield: 0, armor: 0.15 },
]
export const moaGyros: PartOption[] = [
  { name: 'Trux', health: 0.05, shield: -0.05, armor: 0.1 },
  { name: 'Harpen', health: 0.05, shield: 0.1, armor: -0.05 },
  { name: 'Aegron', health: -0.05, shield: 0.05, armor: 0.1 },
  { name: 'Hextra', health: 0.1, shield: 0.05, armor: -0.05 },
  { name: 'Munit', health: 0.1, shield: -0.05, armor: 0.05 },
  { name: 'Atheca', health: 0.2, shield: -0.05, armor: -0.05 },
  { name: 'Phazor', health: -0.05, shield: 0.1, armor: 0.05 },
  { name: 'Tyli', health: 0.1, shield: -0.1, armor: 0.1 },
]
export const moaBrackets: PartOption[] = [
  { name: 'Drimper' },
  { name: 'Gauth', polarity: 'naramon' },
  { name: 'Hona', polarity: 'naramon' },
  { name: 'Jonsin', polarity: 'madurai' },
  { name: 'Tian', polarity: 'vazarin' },
]
export const moaModels: PartOption[] = [{ name: 'Para' }, { name: 'Lambeo' }, { name: 'Oloro' }, { name: 'Nychus' }]

/** https://wiki.warframe.com/w/Hound_(Companion). Núcleo define a base; Bracket gilded (valores duplicados). */
export const houndCores: Array<PartOption & StatModifier> = [
  { name: 'Adlet', health: 350, shield: 450, armor: 350 },
  { name: 'Garmr', health: 350, shield: 350, armor: 450 },
  { name: 'Raiju', health: 450, shield: 350, armor: 350 },
]
export const houndBrackets: PartOption[] = [
  { name: 'Cela', health: 0.2, shield: 0.3, armor: -0.1 },
  { name: 'Urga', health: 0.3, shield: -0.1, armor: 0.2 },
  { name: 'Zubb', health: -0.1, shield: 0.2, armor: 0.3 },
]
export const houndStabilizers: PartOption[] = [
  { name: 'Frak', polarity: 'vazarin' },
  { name: 'Hinta', polarity: 'madurai' },
  { name: 'Wanz', polarity: 'naramon' },
]
/** O modelo do Hound define a arma (nome igual ao do catálogo). */
export const houndModels: Array<PartOption & { weapon: string }> = [
  { name: 'Bhaira', weapon: 'Lacerten' },
  { name: 'Dorma', weapon: 'Batoten' },
  { name: 'Hec', weapon: 'Akaten' },
]

export const houndWeaponNames = new Set(houndModels.map((model) => model.weapon))

/** Companheiros modulares: não existem como item único no catálogo. */
export const modularCompanions: CompanionRecord[] = [
  { uniqueName: '/Builder/Companions/MOA', name: 'MOA', kind: 'MOA', health: 350, shield: 350, armor: 350, polarities: ['penjaga', 'penjaga', 'penjaga', 'penjaga'] },
  { uniqueName: '/Builder/Companions/Hound', name: 'Hound', kind: 'Hound', health: 350, shield: 350, armor: 350, polarities: ['penjaga', 'penjaga', 'penjaga', 'penjaga'] },
]

export type CompanionParts = Record<string, string>

export const partOptions: Record<'MOA' | 'Hound', Record<string, PartOption[]>> = {
  MOA: { modelo: moaModels, nucleo: moaCores, giroscopio: moaGyros, suporte: moaBrackets },
  Hound: { modelo: houndModels, nucleo: houndCores, suporte: houndBrackets, estabilizador: houndStabilizers },
}

export const partLabels: Record<string, string> = {
  modelo: 'Modelo', nucleo: 'Núcleo', giroscopio: 'Giroscópio', suporte: 'Suporte (Bracket)', estabilizador: 'Estabilizador',
}

export function defaultParts(kind: CompanionRecord['kind']): CompanionParts {
  if (kind !== 'MOA' && kind !== 'Hound') return {}
  return Object.fromEntries(Object.entries(partOptions[kind]).map(([slot, options]) => [slot, options[0].name]))
}

function findPart(kind: 'MOA' | 'Hound', slot: string, parts: CompanionParts): PartOption | undefined {
  return partOptions[kind][slot]?.find((option) => option.name === parts[slot])
}

/** Vida/escudo/armadura de ranque 30 antes dos mods. */
export function getCompanionBaseStats(companion: CompanionRecord, parts: CompanionParts = {}): StatModifier {
  if (companion.kind === 'MOA') {
    const core = findPart('MOA', 'nucleo', parts)
    const gyro = findPart('MOA', 'giroscopio', parts)
    const factor = (key: keyof StatModifier) => 1 + (core?.[key] ?? 0) + (gyro?.[key] ?? 0)
    return { health: moaBase.health * factor('health'), shield: moaBase.shield * factor('shield'), armor: moaBase.armor * factor('armor') }
  }
  if (companion.kind === 'Hound') {
    const core = houndCores.find((option) => option.name === parts.nucleo) ?? houndCores[0]
    const bracket = findPart('Hound', 'suporte', parts)
    const factor = (key: keyof StatModifier) => 1 + (bracket?.[key] ?? 0)
    return { health: core.health * factor('health'), shield: core.shield * factor('shield'), armor: core.armor * factor('armor') }
  }
  return { health: companion.health, shield: companion.shield, armor: companion.armor }
}

/** Polaridades de fábrica: 4 Penjaga + a do suporte (MOA) ou estabilizador (Hound). */
export function getCompanionPolarities(companion: CompanionRecord, parts: CompanionParts = {}): string[] {
  const base = companion.polarities ?? []
  if (companion.kind === 'MOA') {
    const polarity = findPart('MOA', 'suporte', parts)?.polarity
    return polarity ? [...base, polarity] : base
  }
  if (companion.kind === 'Hound') {
    const polarity = findPart('Hound', 'estabilizador', parts)?.polarity
    return polarity ? [...base, polarity] : base
  }
  return base
}

export function isValidParts(kind: CompanionRecord['kind'], parts: CompanionParts): boolean {
  if (kind !== 'MOA' && kind !== 'Hound') return Object.keys(parts).length === 0
  const slots = partOptions[kind]
  return Object.keys(slots).every((slot) => slots[slot].some((option) => option.name === parts[slot]))
    && Object.keys(parts).every((slot) => slot in slots)
}

/**
 * Mods aceites por cada arma de companheiro (frase "This weapon accepts ... Mods" de cada página
 * da wiki, ex.: https://wiki.warframe.com/w/Laser_Rifle). Variantes Prime/Prisma usam a base.
 */
export interface CompanionWeaponClass {
  category: 'Primary' | 'Secondary' | 'Melee'
  /** Tipos de mod aceites, comparados com as pastas de mods (rifle, shotgun, pistol, sniper, melee). */
  modTypes: string[]
}

const rifle: CompanionWeaponClass = { category: 'Primary', modTypes: ['Rifle'] }
export const companionWeaponClasses: Record<string, CompanionWeaponClass> = {
  'Laser Rifle': rifle,
  Artax: rifle,
  Stinger: rifle,
  Verglas: rifle,
  'Deth Machine Rifle': rifle,
  Cryotra: rifle,
  Helstrum: rifle,
  Multron: rifle,
  Tazicor: rifle,
  Vulcax: rifle,
  Vulklok: { category: 'Primary', modTypes: ['Rifle', 'Sniper'] },
  Sweeper: { category: 'Primary', modTypes: ['Shotgun'] },
  'Burst Laser': { category: 'Secondary', modTypes: ['Pistol'] },
  Deconstructor: { category: 'Melee', modTypes: ['Melee'] },
  Akaten: { category: 'Melee', modTypes: ['Melee'] },
  Batoten: { category: 'Melee', modTypes: ['Melee'] },
  Lacerten: { category: 'Melee', modTypes: ['Melee'] },
}

export function getCompanionWeaponClass(weaponName: string): CompanionWeaponClass | undefined {
  const baseName = weaponName.replace(/^(Prime|Prisma) /, '').replace(/ Prime$/, '')
  return companionWeaponClasses[baseName]
}
