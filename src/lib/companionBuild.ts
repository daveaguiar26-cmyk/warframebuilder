import type { CompanionRecord, ModRecord } from '../types'
import type { BuildModSlot } from '../store/useCatalogStore'
import type { BuildCodeItem } from './buildCode'
import { filterModsForCompanion } from './modCompatibility'
import { knownPolarities } from './warframeBuild'

export const companionRank = 30
export const companionSlotCount = 10

export interface CompanionBuildState {
  companionId: string
  reactor: boolean
  slots: BuildModSlot[]
}

export function createCompanionSlots(companion?: CompanionRecord): BuildModSlot[] {
  return Array.from({ length: companionSlotCount }, (_, index) => {
    const factoryPolarity = companion?.polarities?.[index] ?? 'none'
    return { modId: null, rank: 0, polarity: factoryPolarity, factoryPolarity }
  })
}

export function toCompanionBuildItem(state: CompanionBuildState): BuildCodeItem {
  return {
    tipo: 'companheiro',
    id: state.companionId,
    rank: companionRank,
    catalyst: state.reactor,
    slots: state.slots.map(({ polarity, modId, rank }) => ({ polarity, modId, rank })),
  }
}

export function restoreCompanionBuild(
  item: BuildCodeItem,
  catalog: { companions: CompanionRecord[]; mods: ModRecord[] },
): CompanionBuildState {
  const companion = catalog.companions.find((entry) => entry.uniqueName === item.id)
  if (!companion) throw new Error('O companheiro do código não existe no catálogo local.')
  if (item.slots.length !== companionSlotCount) throw new Error('A build de companheiro tem de conter dez slots.')

  const modsById = new Map(catalog.mods.map((mod) => [mod.uniqueName, mod]))
  const usedModIds = item.slots.flatMap((slot) => slot.modId ? [slot.modId] : [])
  if (new Set(usedModIds).size !== usedModIds.length) throw new Error('A build contém o mesmo mod mais do que uma vez.')

  const slots = item.slots.map((slot, index) => {
    if (!knownPolarities.has(slot.polarity)) throw new Error(`A polaridade do slot ${index + 1} não é reconhecida.`)
    const mod = slot.modId ? modsById.get(slot.modId) : undefined
    if (slot.modId && !mod) throw new Error(`O mod do slot ${index + 1} não existe no catálogo local.`)
    if (mod && slot.rank > mod.fusionLimit) throw new Error(`O rank do mod ${mod.name} excede o máximo.`)
    if (mod && filterModsForCompanion([mod], companion.kind).length === 0) {
      throw new Error(`O mod ${mod.name} não pode ser usado neste companheiro.`)
    }
    return { modId: slot.modId, rank: slot.rank, polarity: slot.polarity, factoryPolarity: companion.polarities?.[index] ?? 'none' }
  })

  return { companionId: companion.uniqueName, reactor: item.catalyst, slots }
}
