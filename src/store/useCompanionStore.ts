import { create } from 'zustand'
import type { CompanionRecord } from '../types'
import type { BuildModSlot } from './useCatalogStore'
import { createCompanionSlots, type CompanionBuildState } from '../lib/companionBuild'
import { defaultParts, getCompanionPolarities, type CompanionParts } from '../data/companionData'

interface CompanionState {
  query: string
  companionId: string | null
  reactor: boolean
  slots: BuildModSlot[]
  weaponId: string | null
  parts: CompanionParts
  setPart: (companion: CompanionRecord, slot: string, value: string) => void
  setWeapon: (weaponId: string | null) => void
  setQuery: (query: string) => void
  selectCompanion: (companion: CompanionRecord) => void
  equipMod: (slotIndex: number, modId: string) => boolean
  removeMod: (slotIndex: number) => void
  setModRank: (slotIndex: number, rank: number) => void
  setSlotPolarity: (slotIndex: number, polarity: string) => void
  setReactor: (reactor: boolean) => void
  restore: (state: CompanionBuildState) => void
}

function updateSlot(slots: BuildModSlot[], index: number, change: Partial<BuildModSlot>): BuildModSlot[] {
  return slots.map((slot, current) => current === index ? { ...slot, ...change } : slot)
}

export const useCompanionStore = create<CompanionState>((set) => ({
  query: '',
  companionId: null,
  reactor: false,
  slots: createCompanionSlots(),
  weaponId: null,
  parts: {},
  setPart: (companion, slot, value) => set((state) => {
    const parts = { ...state.parts, [slot]: value }
    const polarities = getCompanionPolarities(companion, parts)
    return {
      parts,
      slots: state.slots.map((entry, index) => {
        const factoryPolarity = polarities[index] ?? 'none'
        const polarity = entry.polarity === entry.factoryPolarity ? factoryPolarity : entry.polarity
        return { ...entry, factoryPolarity, polarity }
      }),
    }
  }),
  setWeapon: (weaponId) => set({ weaponId }),
  setQuery: (query) => set({ query }),
  selectCompanion: (companion) => set((state) => state.companionId === companion.uniqueName ? state : {
    companionId: companion.uniqueName,
    reactor: false,
    slots: createCompanionSlots(companion, defaultParts(companion.kind)),
    weaponId: null,
    parts: defaultParts(companion.kind),
  }),
  equipMod: (slotIndex, modId) => {
    let equipped = false
    set((state) => {
      if (state.slots.some((slot) => slot.modId === modId) || state.slots[slotIndex]?.modId !== null) return state
      equipped = true
      return { slots: updateSlot(state.slots, slotIndex, { modId, rank: 0 }) }
    })
    return equipped
  },
  removeMod: (slotIndex) => set((state) => ({ slots: updateSlot(state.slots, slotIndex, { modId: null, rank: 0 }) })),
  setModRank: (slotIndex, rank) => set((state) => ({ slots: updateSlot(state.slots, slotIndex, { rank }) })),
  setSlotPolarity: (slotIndex, polarity) => set((state) => ({ slots: updateSlot(state.slots, slotIndex, { polarity }) })),
  setReactor: (reactor) => set({ reactor }),
  restore: ({ companionId, reactor, slots, weaponId, parts }) => set({ companionId, reactor, slots, weaponId, parts }),
}))
