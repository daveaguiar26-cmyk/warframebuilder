import { buildCodePrefix } from './buildCode'

export interface LibraryEntry {
  nome: string
  autor: string
  descricao: string
  codigo: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toEntry(value: unknown): LibraryEntry | null {
  if (!isRecord(value)) return null
  const text = (key: string) => typeof value[key] === 'string' ? (value[key] as string).trim() : ''
  // Na folha basta o código; "nome" pode vir como nome, arma, warframe, item ou companheiro.
  const nome = ['nome', 'arma', 'warframe', 'item', 'companheiro', 'pet'].map(text).find(Boolean) ?? ''
  const entry = { nome, autor: text('autor'), descricao: text('descricao'), codigo: text('codigo') }
  if (!entry.codigo.startsWith(buildCodePrefix)) return null
  return entry
}

export function parseLibraryJson(value: unknown): LibraryEntry[] {
  const list = isRecord(value) && Array.isArray(value.builds) ? value.builds : value
  if (!Array.isArray(list)) throw new Error('O ficheiro da biblioteca tem de conter uma lista de builds.')
  return list.flatMap((item) => toEntry(item) ?? [])
}

// RFC 4180: campos entre aspas podem ter vírgulas, quebras de linha e aspas duplicadas ("").
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"'
        index += 1
      } else if (char === '"') {
        quoted = false
      } else {
        field += char
      }
    } else if (char === '"') {
      quoted = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') index += 1
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }

  if (field || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((cells) => cells.some((cell) => cell.trim()))
}

export function parseLibraryCsv(text: string): LibraryEntry[] {
  const [header, ...rows] = parseCsvRows(text.replace(/^﻿/, ''))
  if (!header) return []
  const columns = header.map((name) => name.trim().toLocaleLowerCase('pt-PT').normalize('NFD').replace(/[̀-ͯ]/g, ''))
  if (!columns.includes('codigo')) {
    throw new Error('A folha tem de ter a coluna "codigo".')
  }
  return rows.flatMap((cells) => toEntry(Object.fromEntries(columns.map((name, index) => [name, cells[index] ?? '']))) ?? [])
}

// Folha partilhada "qualquer pessoa com o link pode ver"; o endpoint gviz devolve CSV com CORS.
const librarySheetId = '1GZoEui1HJ1Sf8wkRWhSpD8XsBnVXQgoq6A-bo0FwtwQ'

export const libraryCsvUrl: string = import.meta.env.VITE_LIBRARY_CSV_URL
  || `https://docs.google.com/spreadsheets/d/${librarySheetId}/gviz/tq?tqx=out:csv`

export async function loadLibrary(baseUrl: string): Promise<{ entries: LibraryEntry[]; source: string }> {
  if (libraryCsvUrl) {
    const response = await fetch(libraryCsvUrl)
    if (!response.ok) throw new Error('Não foi possível ler a folha do Google Sheets.')
    const text = await response.text()
    // Folha ainda sem cabeçalhos (nenhuma resposta ao formulário): biblioteca vazia, não erro.
    return { entries: text.trim() ? parseLibraryCsv(text) : [], source: 'Google Sheets' }
  }

  const response = await fetch(`${baseUrl}data/builds.json`)
  if (!response.ok) throw new Error('Não foi possível ler builds.json.')
  return { entries: parseLibraryJson(await response.json()), source: 'builds.json' }
}

// Apps Script publicado como aplicação Web ("Qualquer pessoa"); acrescenta uma linha à folha.
const librarySaveUrl = 'https://script.google.com/macros/s/AKfycbxwL1fR21LwfgCluNQzh4mIEzvC_0LYVx3VA3dC7F3zIcBAJ87W6AZ-YYEU-jdNWJGIDQ/exec'

export async function saveBuildToSheet(nome: string, codigo: string): Promise<void> {
  // text/plain evita o pedido de preflight CORS, que o Apps Script não suporta.
  const response = await fetch(librarySaveUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ nome, codigo }),
  })
  const result = await response.json().catch(() => null) as { ok?: boolean; erro?: string } | null
  if (!response.ok || !result?.ok) throw new Error(result?.erro ?? 'A folha não aceitou a build.')
}
