import { parseLibraryJson, type LibraryEntry } from './library'

const storageKey = 'wfb.savedBuilds.v1'

export interface SavedBuild extends LibraryEntry {
  guardadaEm: string
}

// O browser pode bloquear o armazenamento (modo privado, dados apagados): falha em silêncio.
export function loadSavedBuilds(storage: Pick<Storage, 'getItem'> = localStorage): SavedBuild[] {
  try {
    const raw = storage.getItem(storageKey)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap((item: unknown) => {
      const [entry] = parseLibraryJson([item])
      if (!entry) return []
      const savedAt = (item as { guardadaEm?: unknown }).guardadaEm
      return [{ ...entry, guardadaEm: typeof savedAt === 'string' ? savedAt : '' }]
    })
  } catch {
    return []
  }
}

export function storeSavedBuilds(builds: SavedBuild[], storage: Pick<Storage, 'setItem'> = localStorage): boolean {
  try {
    storage.setItem(storageKey, JSON.stringify(builds))
    return true
  } catch {
    return false
  }
}

// Um nome repetido substitui a build anterior com esse nome, em vez de criar duplicados.
export function upsertSavedBuild(builds: SavedBuild[], build: SavedBuild): SavedBuild[] {
  const name = build.nome.trim().toLocaleLowerCase('pt-PT')
  return [build, ...builds.filter((item) => item.nome.trim().toLocaleLowerCase('pt-PT') !== name)]
}
