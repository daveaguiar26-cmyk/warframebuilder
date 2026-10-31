import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'

export const buildCodePrefix = 'WFB1:'

export interface BuildCodeSlot {
  polarity: string
  modId: string | null
  rank: number
}

export interface BuildCodeItem {
  tipo: string
  id: string
  rank: number
  catalyst: boolean
  slots: BuildCodeSlot[]
}

export interface BuildCodeV1 {
  v: 1
  itens: BuildCodeItem[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isBuildCodeSlot(value: unknown): value is BuildCodeSlot {
  return isRecord(value)
    && typeof value.polarity === 'string'
    && (typeof value.modId === 'string' || value.modId === null)
    && Number.isInteger(value.rank)
    && Number(value.rank) >= 0
}

function isBuildCodeItem(value: unknown): value is BuildCodeItem {
  return isRecord(value)
    && typeof value.tipo === 'string'
    && typeof value.id === 'string'
    && value.id.length > 0
    && Number.isInteger(value.rank)
    && Number(value.rank) >= 0
    && typeof value.catalyst === 'boolean'
    && Array.isArray(value.slots)
    && value.slots.every(isBuildCodeSlot)
}

function isBuildCodeV1(value: unknown): value is BuildCodeV1 {
  return isRecord(value)
    && value.v === 1
    && Array.isArray(value.itens)
    && value.itens.every(isBuildCodeItem)
}

export function encodeBuildCode(build: BuildCodeV1): string {
  if (!isBuildCodeV1(build)) throw new TypeError('A build não corresponde ao formato WFB1.')
  const compressed = compressToEncodedURIComponent(JSON.stringify(build))
  if (!compressed) throw new Error('Não foi possível comprimir a build.')
  return `${buildCodePrefix}${compressed}`
}

export function decodeBuildCode(value: string): BuildCodeV1 {
  const code = value.trim()
  if (!code.startsWith(buildCodePrefix)) {
    throw new Error(`O código tem de começar por ${buildCodePrefix}.`)
  }

  const json = decompressFromEncodedURIComponent(code.slice(buildCodePrefix.length))
  if (!json) throw new Error('O código está vazio ou não é válido.')

  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('O conteúdo do código não é JSON válido.')
  }

  if (!isBuildCodeV1(parsed)) throw new Error('A estrutura do código WFB1 não é válida.')
  return parsed
}
