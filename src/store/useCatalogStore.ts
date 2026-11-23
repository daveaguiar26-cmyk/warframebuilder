import { create } from 'zustand'
import type { WeaponCategory } from '../types'

export type WeaponFilter = 'All' | WeaponCategory

export interface BuildModSlot {
  modId: string | null
  rank: number
  polarity: string
  factoryPolarity: string
}

/** 8 slots normais + Exilus (índice 8) + Stance (índice 9, só corpo a corpo). */
export const weaponNormalSlotCount = 8
export const weaponExilusSlotIndex = 8
export const weaponStanceSlotIndex = 9
const modSlotCount = 10

export function createBuildSlots(polarities: string[] = [], stancePolarity?: string): BuildModSlot[] {
  return Array.from({ length: modSlotCount }, (_, index) => {
    const factoryPolarity = index === weaponStanceSlotIndex
      ? stancePolarity ?? 'none'
      : index < weaponNormalSlotCount ? polarities[index] ?? 'none' : 'none'
    return { modId: null, rank: 0, polarity: factoryPolarity, factoryPolarity }
  })
}

interface CatalogState {
  weaponFilter: WeaponFilter
  weaponQuery: string
  modQuery: string
  selectedWeaponId: string | null
  selectedModId: string | null
  buildSlots: BuildModSlot[]
  itemRank: number
  catalyst: boolean
  setWeaponFilter: (filter: WeaponFilter) => void
  setWeaponQuery: (query: string) => void
  setModQuery: (query: string) => void
  selectWeapon: (id: string | null, polarities?: string[], stancePolarity?: string) => void
  selectMod: (id: string | null) => void
  addModToBuild: (modId: string) => boolean
  equipModInSlot: (slotIndex: number, modId: string) => boolean
  removeModFromSlot: (slotIndex: number) => void
  restoreBuild: (weaponId: string, itemRank: number, catalyst: boolean, slots: BuildModSlot[]) => void
  setModRank: (slotIndex: number, rank: number) => void
  setSlotPolarity: (slotIndex: number, polarity: string) => void
  setItemRank: (rank: number) => void
  setCatalyst: (hasCatalyst: boolean) => void
}

export const useCatalogStore = create<CatalogState>((set) => ({
  weaponFilter: 'All',
  weaponQuery: '',
  modQuery: '',
  selectedWeaponId: null,
  selectedModId: null,
  buildSlots: createBuildSlots(),
  itemRank: 30,
  catalyst: false,
  setWeaponFilter: (weaponFilter) => set({ weaponFilter }),
  setWeaponQuery: (weaponQuery) => set({ weaponQuery }),
  setModQuery: (modQuery) => set({ modQuery }),
  selectWeapon: (selectedWeaponId, polarities = [], stancePolarity) => set((state) => {
    if (state.selectedWeaponId === selectedWeaponId) return state
    return {
      selectedWeaponId,
      buildSlots: createBuildSlots(polarities, stancePolarity),
      itemRank: 30,
      catalyst: false,
    }
  }),
  selectMod: (selectedModId) => set({ selectedModId }),
  addModToBuild: (modId) => {
    let added = false
    set((state) => {
      if (state.buildSlots.some((slot) => slot.modId === modId)) return state
      const emptyIndex = state.buildSlots.findIndex((slot, index) => index < weaponNormalSlotCount && slot.modId === null)
      if (emptyIndex === -1) return state

      added = true
      return {
        buildSlots: state.buildSlots.map((slot, index) =>
          index === emptyIndex ? { ...slot, modId, rank: 0 } : slot,
        ),
      }
    })
    return added
  },
  equipModInSlot: (slotIndex, modId) => {
    let equipped = false
    set((state) => {
      if (state.buildSlots.some((slot) => slot.modId === modId)) return state
      if (!state.buildSlots[slotIndex] || state.buildSlots[slotIndex].modId !== null) return state

      equipped = true
      return {
        buildSlots: state.buildSlots.map((slot, index) =>
          index === slotIndex ? { ...slot, modId, rank: 0 } : slot,
        ),
      }
    })
    return equipped
  },
  removeModFromSlot: (slotIndex) => set((state) => ({
    buildSlots: state.buildSlots.map((slot, index) =>
      index === slotIndex ? { ...slot, modId: null, rank: 0 } : slot,
    ),
  })),
  restoreBuild: (selectedWeaponId, itemRank, catalyst, buildSlots) => set({
    selectedWeaponId,
    selectedModId: null,
    itemRank: Math.max(0, Math.min(30, itemRank)),
    catalyst,
    buildSlots,
  }),
  setModRank: (slotIndex, rank) => set((state) => ({
    buildSlots: state.buildSlots.map((slot, index) =>
      index === slotIndex ? { ...slot, rank } : slot,
    ),
  })),
  setSlotPolarity: (slotIndex, polarity) => set((state) => ({
    buildSlots: state.buildSlots.map((slot, index) =>
      index === slotIndex ? { ...slot, polarity } : slot,
    ),
  })),
  setItemRank: (itemRank) => set({ itemRank: Math.max(0, Math.min(30, itemRank)) }),
  setCatalyst: (catalyst) => set({ catalyst }),
}))
