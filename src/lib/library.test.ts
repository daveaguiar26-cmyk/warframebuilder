import { describe, expect, it } from 'vitest'
import { parseCsvRows, parseLibraryCsv, parseLibraryJson } from './library'

describe('library sources', () => {
  it('reads builds from a JSON list or a { builds } object and skips invalid entries', () => {
    const entry = { nome: 'Braton crítico', autor: 'David', descricao: 'Teste', codigo: 'WFB1:abc' }
    expect(parseLibraryJson([entry, { nome: 'Sem código' }])).toEqual([entry])
    expect(parseLibraryJson([{ codigo: 'WFB1:x' }])).toEqual([{ nome: '', autor: '', descricao: '', codigo: 'WFB1:x' }])
    expect(parseLibraryJson({ builds: [entry] })).toEqual([entry])
    expect(() => parseLibraryJson({})).toThrow()
  })

  it('parses quoted CSV fields with commas, quotes and line breaks', () => {
    expect(parseCsvRows('a,b\r\n"x, y","diz ""olá""\nfim"\n')).toEqual([
      ['a', 'b'],
      ['x, y', 'diz "olá"\nfim'],
    ])
  })

  it('maps published sheet columns, accepting accents and extra columns', () => {
    const csv = '﻿Nome,Autor,Descrição,Código,Data\nBraton,Ana,"Crit, rápido",WFB1:abc,2026\nMá,Rui,,não é código,\n'
    expect(parseLibraryCsv(csv)).toEqual([{ nome: 'Braton', autor: 'Ana', descricao: 'Crit, rápido', codigo: 'WFB1:abc' }])
  })

  it('accepts a sheet with only the code and the item name', () => {
    expect(parseLibraryCsv('Arma,Código\nBraton,WFB1:abc\n,WFB1:def\n')).toEqual([
      { nome: 'Braton', autor: '', descricao: '', codigo: 'WFB1:abc' },
      { nome: '', autor: '', descricao: '', codigo: 'WFB1:def' },
    ])
  })

  it('rejects a sheet without the required columns', () => {
    expect(() => parseLibraryCsv('titulo,link\na,b')).toThrow('codigo')
  })
})
