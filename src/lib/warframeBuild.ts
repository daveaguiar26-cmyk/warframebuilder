import type { ArcaneRecord, ModRecord, WarframeRecord } from '../types'
import type { BuildModSlot } from '../store/useCatalogStore'
import type { BuildCodeArcane, BuildCodeItem } from './buildCode'
import { filterModsForWarframe, type WarframeSlotKind } from './modCompatibility'

export const warframeRank = 30
export const auraSlotIndex = 8
export const exilusSlotIndex = 9
export const warframeSlotCount = 10
export const arcaneSlotCount = 2

export interface ArcaneSlot {
  arcaneId: string | null
  rank: number
}

export interface WarframeBuildState {
  frameId: string
  reactor: boolean
  slots: BuildModSlot[]
  arcanes: ArcaneSlot[]
}

export const knownPolarities = new Set([
  'none', 'madurai', 'naramon', 'vazarin', 'zenurik', 'unairu', 'penjaga', 'umbra', 'universal',
])

export function slotKindAt(index: number): WarframeSlotKind {
  if (index === auraSlotIndex) return 'aura'
  if (index === exilusSlotIndex) return 'exilus'
  return 'normal'
}

function factoryPolarityAt(frame: WarframeRecord, index: number): string {
  if (index === auraSlotIndex) return frame.aura ?? 'none'
  if (index === exilusSlotIndex) return frame.exilusPolarity ?? 'none'
  return frame.polarities?.[index] ?? 'none'
}

export function createWarframeSlots(frame?: WarframeRecord): BuildModSlot[] {
  return Array.from({ length: warframeSlotCount }, (_, index) => {
    const factoryPolarity = frame ? factoryPolarityAt(frame, index) : 'none'
    return { modId: null, rank: 0, polarity: factoryPolarity, factoryPolarity }
  })
}

export function createArcaneSlots(): ArcaneSlot[] {
  return Array.from({ length: arcaneSlotCount }, () => ({ arcaneId: null, rank: 0 }))
}

export function arcaneMaxRank(arcane: ArcaneRecord): number {
  return Math.max(0, (arcane.levelStats?.length ?? 1) - 1)
}

export function toWarframeBuildItem(state: WarframeBuildState): BuildCodeItem {
  return {
    tipo: 'warframe',
    id: state.frameId,
    rank: warframeRank,
    catalyst: state.reactor,
    slots: state.slots.map(({ polarity, modId, rank }) => ({ polarity, modId, rank })),
    arcanos: state.arcanes.map(({ arcaneId, rank }): BuildCodeArcane => ({ id: arcaneId, rank })),
  }
}

export function restoreWarframeBuild(
  item: BuildCodeItem,
  catalog: { warframes: WarframeRecord[]; mods: ModRecord[]; arcanes: ArcaneRecord[] },
): WarframeBuildState {
  const frame = catalog.warframes.find((entry) => entry.uniqueName === item.id)
  if (!frame) throw new Error('O Warframe do código não existe no catálogo local.')
  if (item.slots.length !== warframeSlotCount) throw new Error('A build de Warframe tem de conter dez slots.')

  const modsById = new Map(catalog.mods.map((mod) => [mod.uniqueName, mod]))
  const usedModIds = item.slots.flatMap((slot) => slot.modId ? [slot.modId] : [])
  if (new Set(usedModIds).size !== usedModIds.length) throw new Error('A build contém o mesmo mod mais do que uma vez.')

  const slots = item.slots.map((slot, index) => {
    if (!knownPolarities.has(slot.polarity)) throw new Error(`A polaridade do slot ${index + 1} não é reconhecida.`)
    const mod = slot.modId ? modsById.get(slot.modId) : undefined
    if (slot.modId && !mod) throw new Error(`O mod do slot ${index + 1} não existe no catálogo local.`)
    if (mod && slot.rank > mod.fusionLimit) throw new Error(`O rank do mod ${mod.name} excede o máximo.`)
    if (mod && filterModsForWarframe([mod], frame, slotKindAt(index)).length === 0) {
      throw new Error(`O mod ${mod.name} não pode ser usado neste slot.`)
    }
    return { modId: slot.modId, rank: slot.rank, polarity: slot.polarity, factoryPolarity: factoryPolarityAt(frame, index) }
  })

  const arcanesById = new Map(catalog.arcanes.map((arcane) => [arcane.uniqueName, arcane]))
  const arcanes = createArcaneSlots().map((empty, index) => {
    const saved = item.arcanos?.[index]
    if (!saved || !saved.id) return empty
    const arcane = arcanesById.get(saved.id)
    if (!arcane) throw new Error(`O arcane ${index + 1} não existe no catálogo local.`)
    if (saved.rank > arcaneMaxRank(arcane)) throw new Error(`O rank do arcane ${arcane.name} excede o máximo.`)
    return { arcaneId: saved.id, rank: saved.rank }
  })

  return { frameId: frame.uniqueName, reactor: item.catalyst, slots, arcanes }
}
