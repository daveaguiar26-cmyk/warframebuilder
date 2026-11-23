/**
 * Reconhecimento de builds a partir do texto lido (OCR) de uma captura do ecrã de mods do jogo.
 * Só os nomes são fiáveis: ranques e polaridades têm de ser confirmados pelo utilizador.
 */
import type { CompanionRecord, ModRecord, WarframeRecord, WeaponRecord } from '../types'
import { companionWeaponType } from '../types'
import { filterModsForCompanion, filterModsForWarframe, filterModsForWeapon, isAuraMod, withoutInternalVariants } from './modCompatibility'

export type DetectedKind = 'arma' | 'warframe' | 'companheiro'

export interface DetectedItem {
  kind: DetectedKind
  id: string
  name: string
}

export interface ImageImportResult {
  item?: DetectedItem
  mods: ModRecord[]
}

/** Só letras e dígitos, em maiúsculas e sem acentos: os cartões do jogo mostram os nomes em maiúsculas. */
export function compact(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

/**
 * Procura aproximada (algoritmo de Sellers): distância de edição mínima do padrão a qualquer
 * trecho do texto, aceitando letras trocadas, a mais ou a menos. Devolve o trecho encontrado.
 */
export function approximateFind(pattern: string, text: string, maxErrors: number): { start: number; end: number } | undefined {
  const length = pattern.length
  let previous = Array.from({ length: length + 1 }, (_, index) => index)
  let best: { distance: number; end: number } | undefined
  for (let column = 0; column < text.length; column += 1) {
    const current = [0]
    for (let row = 1; row <= length; row += 1) {
      const substitution = previous[row - 1] + (pattern[row - 1] === text[column] ? 0 : 1)
      current[row] = Math.min(substitution, previous[row] + 1, current[row - 1] + 1)
    }
    if (current[length] <= maxErrors && (!best || current[length] < best.distance)) {
      best = { distance: current[length], end: column }
      if (best.distance === 0) break
    }
    previous = current
  }
  if (!best) return undefined
  return { start: Math.max(0, best.end - length + 1), end: best.end + 1 }
}

/** Erros de OCR tolerados conforme o tamanho do nome (sem espaços). */
function tolerance(length: number): number {
  if (length < 5) return 0
  if (length < 8) return 1
  if (length < 12) return 2
  return 3
}

interface Named { name: string }

/**
 * Procura nomes no texto, do mais longo para o mais curto, e consome o trecho encontrado
 * para que "Serration" não seja também contado dentro de "Amalgam Serration".
 * O resultado vem pela ordem de leitura da imagem (posição no texto).
 */
export function findNamesInText<T extends Named>(text: string, candidates: T[]): T[] {
  let haystack = compact(text)
  const sorted = [...candidates]
    .map((candidate) => ({ candidate, key: compact(candidate.name) }))
    .filter(({ key }) => key.length >= 4)
    .sort((a, b) => b.key.length - a.key.length)

  const found: Array<{ candidate: T; position: number }> = []
  const seenKeys = new Set<string>()
  for (const { candidate, key } of sorted) {
    if (seenKeys.has(key)) continue
    const exact = haystack.indexOf(key)
    const match = exact !== -1
      ? { start: exact, end: exact + key.length }
      : approximateFind(key, haystack, tolerance(key.length))
    if (!match) continue
    const position = match.start
    seenKeys.add(key)
    found.push({ candidate, position })
    haystack = haystack.slice(0, match.start) + '#'.repeat(match.end - match.start) + haystack.slice(match.end)
  }
  return found.sort((a, b) => a.position - b.position).map(({ candidate }) => candidate)
}

export interface ImportCatalog {
  weapons: WeaponRecord[]
  warframes: WarframeRecord[]
  companions: CompanionRecord[]
  mods: ModRecord[]
}

/** Ignora variantes internas e, com nomes repetidos, fica a versão com mais ranques. */
function playableMods(mods: ModRecord[]): ModRecord[] {
  const byName = new Map<string, ModRecord>()
  for (const mod of withoutInternalVariants(mods)) {
    const current = byName.get(mod.name)
    if (!current || mod.fusionLimit > current.fusionLimit) byName.set(mod.name, mod)
  }
  return [...byName.values()]
}

/** Mods que o item aceita (inclui Stance, Aura, mods de garras e Postura), para descartar falsos positivos. */
function compatibleWith(item: DetectedItem, catalog: ImportCatalog, mods: ModRecord[]): ModRecord[] {
  if (item.kind === 'arma') {
    const weapon = catalog.weapons.find((entry) => entry.uniqueName === item.id)
    if (!weapon) return mods
    const allowed = new Set(filterModsForWeapon(catalog.mods, weapon).map((mod) => mod.uniqueName))
    return mods.filter((mod) => allowed.has(mod.uniqueName) || (mod.type === 'Stance Mod' && weapon.category === 'Melee'))
  }
  if (item.kind === 'warframe') {
    const frame = catalog.warframes.find((entry) => entry.uniqueName === item.id)
    if (!frame) return mods
    const allowed = new Set([
      ...filterModsForWarframe(catalog.mods, frame),
      ...filterModsForWarframe(catalog.mods, frame, 'aura'),
    ].map((mod) => mod.uniqueName))
    return mods.filter((mod) => allowed.has(mod.uniqueName) || isAuraMod(mod))
  }
  const companion = catalog.companions.find((entry) => entry.uniqueName === item.id)
  if (!companion) return mods
  const allowed = new Set(filterModsForCompanion(catalog.mods, companion.kind).map((mod) => mod.uniqueName))
  return mods.filter((mod) => allowed.has(mod.uniqueName)
    || (companion.kind === 'Beast' && (mod.type === 'Posture Mod' || mod.uniqueName.includes('/Sentinel/Kubrow/'))))
}

function kindFromMods(mods: ModRecord[]): DetectedKind | undefined {
  const counts = new Map<DetectedKind, number>()
  for (const mod of mods) {
    const kind: DetectedKind | undefined = mod.type === 'Warframe Mod'
      ? 'warframe'
      : mod.type === 'Companion Mod' || mod.type === 'Posture Mod'
        ? 'companheiro'
        : mod.type && /Primary|Secondary|Shotgun|Melee|Stance/.test(mod.type) ? 'arma' : undefined
    if (kind) counts.set(kind, (counts.get(kind) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
}

export function detectBuildFromText(text: string, catalog: ImportCatalog): ImageImportResult {
  const items: DetectedItem[] = [
    ...catalog.weapons
      .filter((weapon) => weapon.type !== companionWeaponType)
      .map((weapon) => ({ kind: 'arma' as const, id: weapon.uniqueName, name: weapon.name })),
    ...catalog.warframes.map((frame) => ({ kind: 'warframe' as const, id: frame.uniqueName, name: frame.name })),
    ...catalog.companions.map((companion) => ({ kind: 'companheiro' as const, id: companion.uniqueName, name: companion.name })),
  ]

  const mods = findNamesInText(text, playableMods(catalog.mods))
  const modKind = kindFromMods(mods)
  const itemMatches = findNamesInText(text, items)
  // Com várias correspondências, prefere o tipo coerente com os mods e o nome mais longo.
  const item = itemMatches
    .sort((a, b) => Number(b.kind === modKind) - Number(a.kind === modKind) || b.name.length - a.name.length)[0]

  return { item, mods: item ? compatibleWith(item, catalog, mods) : mods }
}
