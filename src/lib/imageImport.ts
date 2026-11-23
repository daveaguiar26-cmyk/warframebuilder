/**
 * Reconhecimento de builds a partir do texto lido (OCR) de uma captura do ecrã de mods do jogo.
 * Só os nomes são fiáveis: ranques e polaridades têm de ser confirmados pelo utilizador.
 */
import type { CompanionRecord, ModRecord, WarframeRecord, WeaponRecord } from '../types'
import { companionWeaponType } from '../types'

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

function hammingWithin(a: string, b: string, maxErrors: number): boolean {
  let errors = 0
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index] && (errors += 1) > maxErrors) return false
  }
  return true
}

/** Erros de OCR tolerados: nenhum até 6 letras, depois 1 por cada 7 letras. */
function tolerance(length: number): number {
  return length < 7 ? 0 : Math.floor(length / 7)
}

interface Named { name: string }

/**
 * Procura nomes no texto, do mais longo para o mais curto, e consome o trecho encontrado
 * para que "Serration" não seja também contado dentro de "Amalgam Serration".
 */
export function findNamesInText<T extends Named>(text: string, candidates: T[]): T[] {
  let haystack = compact(text)
  const sorted = [...candidates]
    .map((candidate) => ({ candidate, key: compact(candidate.name) }))
    .filter(({ key }) => key.length >= 4)
    .sort((a, b) => b.key.length - a.key.length)

  const found: T[] = []
  const seenKeys = new Set<string>()
  for (const { candidate, key } of sorted) {
    if (seenKeys.has(key)) continue
    let position = haystack.indexOf(key)
    const maxErrors = tolerance(key.length)
    if (position === -1 && maxErrors > 0) {
      for (let start = 0; start + key.length <= haystack.length; start += 1) {
        if (hammingWithin(key, haystack.slice(start, start + key.length), maxErrors)) {
          position = start
          break
        }
      }
    }
    if (position === -1) continue
    seenKeys.add(key)
    found.push(candidate)
    haystack = haystack.slice(0, position) + '#'.repeat(key.length) + haystack.slice(position + key.length)
  }
  return found
}

export interface ImportCatalog {
  weapons: WeaponRecord[]
  warframes: WarframeRecord[]
  companions: CompanionRecord[]
  mods: ModRecord[]
}

/** Ignora variantes internas (Beginner/Intermediate/Expert) que repetem o nome do mod. */
function playableMods(mods: ModRecord[]): ModRecord[] {
  const internal = /\/(Beginner|Intermediate|Expert)\//
  const byName = new Map<string, ModRecord>()
  for (const mod of mods) {
    if (internal.test(mod.uniqueName)) continue
    const current = byName.get(mod.name)
    // Com nomes repetidos, fica a versão com mais ranques (a actual).
    if (!current || mod.fusionLimit > current.fusionLimit) byName.set(mod.name, mod)
  }
  return [...byName.values()]
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

  return { item, mods }
}
