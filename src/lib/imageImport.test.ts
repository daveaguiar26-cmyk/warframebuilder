import { describe, expect, it } from 'vitest'
import type { ModRecord } from '../types'
import { compact, detectBuildFromText, findNamesInText } from './imageImport'

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
    expect(findNamesInText('AMALGAM SERRATION  SERRATION', [serration, amalgam])).toHaveLength(2)
  })

  it('tolerates small OCR errors in long names', () => {
    expect(findNamesInText('STREAMLlNE', [streamline])).toHaveLength(1)
    expect(findNamesInText('SERRATI0N', [serration])).toHaveLength(1)
  })

  it('detects a Warframe build and ignores internal mod variants', () => {
    const result = detectBuildFromText('MESA\nUMBRAL\nINTENSIFY\nINTENSIFY STREAMLINE', catalog)
    expect(result.item).toEqual({ kind: 'warframe', id: '/mesa', name: 'Mesa' })
    // Pela ordem de leitura da imagem.
    expect(result.mods.map((entry) => entry.uniqueName)).toEqual([umbral.uniqueName, intensify.uniqueName, streamline.uniqueName])
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
