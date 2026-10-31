import { describe, expect, it } from 'vitest'
import { loadSavedBuilds, storeSavedBuilds, upsertSavedBuild, type SavedBuild } from './savedBuilds'

function memoryStorage() {
  const data = new Map<string, string>()
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => void data.set(key, value) }
}

const build: SavedBuild = { nome: 'Braton', autor: '', descricao: '', codigo: 'WFB1:abc', guardadaEm: '2026-10-31T10:00:00.000Z' }

describe('saved builds', () => {
  it('stores and reloads builds', () => {
    const storage = memoryStorage()
    expect(storeSavedBuilds([build], storage)).toBe(true)
    expect(loadSavedBuilds(storage)).toEqual([build])
  })

  it('returns an empty list for missing, corrupt or blocked storage', () => {
    expect(loadSavedBuilds(memoryStorage())).toEqual([])
    expect(loadSavedBuilds({ getItem: () => '{nope' })).toEqual([])
    expect(loadSavedBuilds({ getItem: () => { throw new Error('blocked') } })).toEqual([])
    expect(storeSavedBuilds([build], { setItem: () => { throw new Error('quota') } })).toBe(false)
  })

  it('replaces a build with the same name and puts it first', () => {
    const other = { ...build, nome: 'Soma' }
    const updated = { ...build, nome: ' braton ', codigo: 'WFB1:new' }
    expect(upsertSavedBuild([other, build], updated)).toEqual([updated, other])
  })
})
