import { create } from 'zustand'
import type { CompanionRecord } from '../types'
import type { BuildModSlot } from './useCatalogStore'
import { createCompanionSlots, type CompanionBuildState } from '../lib/companionBuild'

interface CompanionState {
  query: string
  companionId: string | null
  reactor: boolean
  slots: BuildModSlot[]
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
  setQuery: (query) => set({ query }),
  selectCompanion: (companion) => set((state) => state.companionId === companion.uniqueName ? state : {
    companionId: companion.uniqueName,
    reactor: false,
    slots: createCompanionSlots(companion),
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
  restore: ({ companionId, reactor, slots }) => set({ companionId, reactor, slots }),
}))
