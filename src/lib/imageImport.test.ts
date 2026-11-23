import { describe, expect, it } from 'vitest'
import type { ModRecord } from '../types'
import { approximateFind, compact, detectBuildFromText, findNamesInText } from './imageImport'

function mod(name: string, type: string, path = name.replaceAll(' ', ''), fusionLimit = 10): ModRecord {
  return { uniqueName: `/Lotus/Upgrades/Mods/${path}`, name, type, baseDrain: 4, polarity: 'madurai', fusionLimit }
}

const serration = mod('Serration', 'Primary Mod', 'Rifle/Serration')
const amalgam = mod('Amalgam Serration', 'Primary Mod', 'Rifle/AmalgamSerration')
const intensify = mod('Intensify', 'Warframe Mod', 'Warframe/Intensify')
const intensifyBeginner = mod('Intensify', 'Warframe Mod', 'Warframe/Beginner/Intensify', 3)
const umbral = mod('Umbral Intensify', 'Warframe Mod', 'Warframe/UmbralIntensify')
const streamline = mod('Streamline', 'Warframe Mod', 'Warframe/Streamline')

const catalog = {
  weapons: [{ uniqueName: '/braton', name: 'Braton', category: 'Primary' as const, type: 'Rifle' }],
  warframes: [{ uniqueName: '/mesa', name: 'Mesa', health: 365, shield: 180, armor: 105, power: 100, abilities: [] }],
  companions: [],
  mods: [serration, amalgam, intensify, intensifyBeginner, umbral, streamline],
}

describe('image import text matching', () => {
  it('normalises OCR text', () => {
    expect(compact('Amalgam\nSERRATION!')).toBe('AMALGAMSERRATION')
  })

  it('does not count a short name inside a longer one', () => {
    expect(findNamesInText('AMALGAM SERRATION', [serration, amalgam]).map((entry) => entry.name)).toEqual(['Amalgam Serration'])
    // Um nome contido noutro já encontrado é ignorado (no jogo, as variantes excluem a base).
    expect(findNamesInText('AMALGAM SERRATION\nSERRATION', [serration, amalgam])).toHaveLength(1)
  })

  it('tolerates small OCR errors in long names', () => {
    expect(findNamesInText('STREAMLlNE', [streamline])).toHaveLength(1)
    expect(findNamesInText('SERRATI0N', [serration])).toHaveLength(1)
    // Letras a mais ou a menos, comuns em OCR sobre fundos com textura.
    expect(findNamesInText('GALVANIZD ELEMENTTALIST', [{ name: 'Galvanized Elementalist' }])).toHaveLength(1)
    expect(findNamesInText('Shockng Touch', [{ name: 'Shocking Touch' }])).toHaveLength(1)
  })

  it('does not match unrelated short words', () => {
    expect(findNamesInText('RANGE SLASH TOTAL', [serration, streamline])).toHaveLength(0)
  })

  it('detects a Warframe build and ignores internal mod variants', () => {
    const result = detectBuildFromText('MESA\nUMBRAL\nINTENSIFY\nINTENSIFY STREAMLINE', catalog)
    expect(result.item).toEqual({ kind: 'warframe', id: '/mesa', name: 'Mesa' })
    // Pela ordem de leitura da imagem.
    expect(result.mods.map((entry) => entry.uniqueName)).toEqual([umbral.uniqueName, streamline.uniqueName])
  })

  it('detects a weapon build', () => {
    const result = detectBuildFromText('BRATON  SERRATION', catalog)
    expect(result.item?.kind).toBe('arma')
    expect(result.mods).toEqual([serration])
  })
})

describe('image import with real screenshot text', () => {
  const melee = { uniqueName: '/ichor', name: 'Dual Ichor', category: 'Melee' as const, type: 'Dual Swords' }
  const meleeMod = (name: string, path: string) => mod(name, 'Melee Mod', `Melee/${path}`)
  const pressure = meleeMod('Pressure Point', 'WeaponMeleeDamageMod')
  const primedPressure = meleeMod('Primed Pressure Point', 'Expert/WeaponMeleeDamageModExpert')
  const galvanizedSteel = meleeMod('Galvanized Steel', 'Expert/WeaponCritChanceSPMod')
  const tiger = { ...mod('Swirling Tiger', 'Stance Mod', 'Stances/SwirlingTiger'), compatName: 'Dual Swords' }
  const followThrough = mod('Follow Through', 'Warframe Mod', 'Warframe/FollowThrough')
  const screenshot = {
    weapons: [melee],
    warframes: [],
    companions: [],
    mods: [pressure, primedPressure, galvanizedSteel, tiger, followThrough],
  }

  it('reads Primed/Galvanized mods, keeps the stance and drops stat-panel false positives', () => {
    const text = 'UPGRADES/DUAL ICHOR [30]\nFollow Through 50%\nSwirling Tiger 10\nGalvanized Steel 6 Primed Pressure\nPoint 7'
    const result = detectBuildFromText(text, screenshot)
    expect(result.item?.name).toBe('Dual Ichor')
    expect(result.mods.map((entry) => entry.name)).toEqual(['Swirling Tiger', 'Galvanized Steel', 'Primed Pressure Point'])
  })
})

describe('approximateFind', () => {
  it('finds a pattern with one missing letter', () => {
    expect(approximateFind('SEISMICWAVE', 'XXSEISMCWAVEXX', 2)).toMatchObject({ end: 12 })
  })

  it('returns nothing above the error limit', () => {
    expect(approximateFind('SEISMICWAVE', 'MAGNETICRUSH', 2)).toBeUndefined()
  })
})

describe('names split across two lines', () => {
  it('joins the top line of a card with its bottom line further down (OCR reads row by row)', () => {
    const text = 'Galvanized\nPrimed Smite Y\nPrimed Pressure\nCritical Damage\n~~ Elementalist . -\nInfested\nPoint'
    const names = [
      { name: 'Galvanized Elementalist' },
      { name: 'Primed Smite Infested' },
      { name: 'Primed Pressure Point' },
      { name: 'Pressure Point' },
    ]
    expect(findNamesInText(text, names).map((entry) => entry.name))
      .toEqual(['Galvanized Elementalist', 'Primed Smite Infested', 'Primed Pressure Point'])
  })
})
