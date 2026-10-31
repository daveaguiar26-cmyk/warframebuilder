import { describe, expect, it } from 'vitest'
import { buildCodePrefix, decodeBuildCode, encodeBuildCode, type BuildCodeV1 } from './buildCode'

const sampleBuild: BuildCodeV1 = {
  v: 1,
  itens: [{
    tipo: 'arma',
    id: '/Lotus/Weapons/Tenno/LongGuns/Braton/Braton',
    rank: 30,
    catalyst: true,
    slots: [
      { polarity: 'madurai', modId: '/Lotus/Upgrades/Mods/Rifle/WeaponDamageAmountMod', rank: 10 },
      { polarity: 'none', modId: null, rank: 0 },
    ],
  }],
}

describe('WFB1 build codes', () => {
  it('encodes a compact prefixed code and restores the original build', () => {
    const code = encodeBuildCode(sampleBuild)
    expect(code.startsWith(buildCodePrefix)).toBe(true)
    expect(code).not.toMatch(/\s/)
    expect(decodeBuildCode(code)).toEqual(sampleBuild)
  })

  it('rejects an unknown or missing prefix', () => {
    expect(() => decodeBuildCode('WFB2:abc')).toThrow('WFB1:')
    expect(() => decodeBuildCode('')).toThrow('WFB1:')
  })

  it('rejects invalid compressed data', () => {
    expect(() => decodeBuildCode(`${buildCodePrefix}not-valid-data`)).toThrow()
  })

  it('rejects invalid item and slot structures', () => {
    const invalidBuild = { v: 1, itens: [{ ...sampleBuild.itens[0], slots: [{ polarity: 'madurai', modId: null, rank: -1 }] }] }
    const compressedInvalid = encodeBuildCode as unknown as (value: unknown) => string
    expect(() => compressedInvalid(invalidBuild)).toThrow()
  })
})
