import { describe, expect, it } from 'vitest'
import { searchItems } from './search'

const records = [
  { name: 'Serration', type: 'Rifle Mod', description: 'Dano de arma' },
  { name: 'Point Strike', type: 'Rifle Mod', description: 'Chance crítica' },
]

describe('searchItems', () => {
  it('finds records by name without case sensitivity', () => {
    expect(searchItems(records, 'sErRa')).toEqual([records[0]])
  })

  it('finds records by description without diacritics', () => {
    expect(searchItems(records, 'chance critica')).toEqual([records[1]])
  })

  it('returns all records for an empty query', () => {
    expect(searchItems(records, '  ')).toEqual(records)
  })
})
