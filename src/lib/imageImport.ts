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

interface LineMatch { line: number; start: number; end: number }

/** Procura exacta e depois aproximada numa só linha. */
function findInLine(key: string, line: string): { start: number; end: number } | undefined {
  const exact = line.indexOf(key)
  if (exact !== -1) return { start: exact, end: exact + key.length }
  return approximateFind(key, line, tolerance(key.length))
}

function findInLines(key: string, lines: string[], from = 0, accept?: (line: string, match: { start: number; end: number }) => boolean): LineMatch | undefined {
  for (let index = from; index < lines.length; index += 1) {
    const match = findInLine(key, lines[index])
    if (match && (!accept || accept(lines[index], match))) return { line: index, ...match }
  }
  return undefined
}

/** Letras soltas que o OCR junta ao início ou fim de uma linha (molduras dos cartões). */
const edgeSlack = 3

/**
 * Nomes em duas linhas no cartão ("Primed Pressure" / "Point") saem separados no texto, porque o
 * OCR lê a linha de cima de todos os cartões antes da de baixo. Aceita-se o início do nome no fim
 * de uma linha e o resto no início de uma linha mais abaixo.
 */
function findSplit(words: string[], lines: string[]): LineMatch[] | undefined {
  for (let split = 1; split < words.length; split += 1) {
    const head = compact(words.slice(0, split).join(''))
    const tail = compact(words.slice(split).join(''))
    if (head.length < 4 || tail.length < 4) continue
    let from = 0
    while (from < lines.length) {
      const headMatch = findInLines(head, lines, from, (line, match) => line.length - match.end <= edgeSlack)
      if (!headMatch) break
      const tailMatch = findInLines(tail, lines, headMatch.line + 1, (_, match) => match.start <= edgeSlack)
      if (tailMatch) return [headMatch, tailMatch]
      from = headMatch.line + 1
    }
  }
  return undefined
}

function trigrams(value: string): Set<string> {
  const result = new Set<string>()
  for (let index = 0; index + 3 <= value.length; index += 1) result.add(value.slice(index, index + 3))
  return result
}

/**
 * Procura nomes no texto do OCR, linha a linha, do mais longo para o mais curto.
 * - Um nome que esteja contido noutro já encontrado é ignorado ("Pressure Point" dentro de
 *   "Primed Pressure Point"): no jogo, as variantes Primed/Umbral excluem a versão base.
 * - O trecho usado é apagado da linha, para não servir a outro nome.
 * O resultado vem pela ordem de leitura da imagem (linha onde o nome começa).
 */
export function findNamesInText<T extends Named>(text: string, candidates: T[]): T[] {
  const lines = text.split(/\r?\n/).map(compact).filter((line) => line.length > 0)
  const available = trigrams(lines.join('|'))
  const sorted = [...candidates]
    .map((candidate) => ({ candidate, key: compact(candidate.name), words: candidate.name.split(/\s+/) }))
    .filter(({ key }) => key.length >= 4)
    .sort((a, b) => b.key.length - a.key.length)

  const found: Array<{ candidate: T; position: number; key: string }> = []
  for (const { candidate, key, words } of sorted) {
    if (found.some((entry) => entry.key.includes(key))) continue
    // Filtro rápido: pelo menos 40% dos trigramas do nome têm de existir no texto.
    const keyTrigrams = [...trigrams(key)]
    if (keyTrigrams.length && keyTrigrams.filter((gram) => available.has(gram)).length / keyTrigrams.length < 0.4) continue

    const whole = findInLines(key, lines)
    const parts = whole ? [whole] : findSplit(words, lines)
    if (!parts) continue
    // Ordem de leitura: linha e, na mesma linha, posição do início do nome.
    found.push({ candidate, position: parts[0].line * 10_000 + parts[0].start, key })
    for (const part of parts) {
      const line = lines[part.line]
      lines[part.line] = line.slice(0, part.start) + '#'.repeat(part.end - part.start) + line.slice(part.end)
    }
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

  const candidates = playableMods(catalog.mods)
  const itemMatches = findNamesInText(text, items)
  if (itemMatches.length === 1) {
    // Item conhecido: só se procuram mods compatíveis, para que um falso positivo não gaste
    // texto de um mod verdadeiro.
    const item = itemMatches[0]
    return { item, mods: findNamesInText(text, compatibleWith(item, catalog, candidates)) }
  }

  const mods = findNamesInText(text, candidates)
  const modKind = kindFromMods(mods)
  // Com várias correspondências, prefere o tipo coerente com os mods e o nome mais longo.
  const item = itemMatches
    .sort((a, b) => Number(b.kind === modKind) - Number(a.kind === modKind) || b.name.length - a.name.length)[0]
  return { item, mods: item ? compatibleWith(item, catalog, mods) : mods }
}
