import { create } from 'zustand'
import type { WarframeRecord } from '../types'
import type { BuildModSlot } from './useCatalogStore'
import { createArcaneSlots, createWarframeSlots, type ArcaneSlot, type WarframeBuildState } from '../lib/warframeBuild'

interface WarframeState {
  frameQuery: string
  frameId: string | null
  reactor: boolean
  slots: BuildModSlot[]
  arcanes: ArcaneSlot[]
  setFrameQuery: (query: string) => void
  selectFrame: (frame: WarframeRecord) => void
  equipMod: (slotIndex: number, modId: string) => boolean
  removeMod: (slotIndex: number) => void
  setModRank: (slotIndex: number, rank: number) => void
  setSlotPolarity: (slotIndex: number, polarity: string) => void
  setReactor: (reactor: boolean) => void
  setArcane: (slotIndex: number, arcaneId: string | null) => void
  setArcaneRank: (slotIndex: number, rank: number) => void
  restore: (state: WarframeBuildState) => void
}

function updateAt<T>(items: T[], index: number, change: (item: T) => T): T[] {
  return items.map((item, current) => current === index ? change(item) : item)
}

export const useWarframeStore = create<WarframeState>((set) => ({
  frameQuery: '',
  frameId: null,
  reactor: false,
  slots: createWarframeSlots(),
  arcanes: createArcaneSlots(),
  setFrameQuery: (frameQuery) => set({ frameQuery }),
  selectFrame: (frame) => set((state) => state.frameId === frame.uniqueName ? state : {
    frameId: frame.uniqueName,
    reactor: false,
    slots: createWarframeSlots(frame),
    arcanes: createArcaneSlots(),
  }),
  equipMod: (slotIndex, modId) => {
    let equipped = false
    set((state) => {
      if (state.slots.some((slot) => slot.modId === modId) || state.slots[slotIndex]?.modId !== null) return state
      equipped = true
      return { slots: updateAt(state.slots, slotIndex, (slot) => ({ ...slot, modId, rank: 0 })) }
    })
    return equipped
  },
  removeMod: (slotIndex) => set((state) => ({
    slots: updateAt(state.slots, slotIndex, (slot) => ({ ...slot, modId: null, rank: 0 })),
  })),
  setModRank: (slotIndex, rank) => set((state) => ({
    slots: updateAt(state.slots, slotIndex, (slot) => ({ ...slot, rank })),
  })),
  setSlotPolarity: (slotIndex, polarity) => set((state) => ({
    slots: updateAt(state.slots, slotIndex, (slot) => ({ ...slot, polarity })),
  })),
  setReactor: (reactor) => set({ reactor }),
  setArcane: (slotIndex, arcaneId) => set((state) => {
    if (arcaneId && state.arcanes.some((arcane, index) => index !== slotIndex && arcane.arcaneId === arcaneId)) return state
    return { arcanes: updateAt(state.arcanes, slotIndex, () => ({ arcaneId, rank: 0 })) }
  }),
  setArcaneRank: (slotIndex, rank) => set((state) => ({
    arcanes: updateAt(state.arcanes, slotIndex, (arcane) => ({ ...arcane, rank })),
  })),
  restore: ({ frameId, reactor, slots, arcanes }) => set({ frameId, reactor, slots, arcanes }),
}))
