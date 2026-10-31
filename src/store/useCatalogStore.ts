import { create } from 'zustand'
import type { WeaponCategory } from '../types'

export type WeaponFilter = 'All' | WeaponCategory

export interface BuildModSlot {
  modId: string | null
  rank: number
  polarity: string
  factoryPolarity: string
}

const modSlotCount = 8

function createBuildSlots(polarities: string[] = []): BuildModSlot[] {
  return Array.from({ length: modSlotCount }, (_, index) => {
    const factoryPolarity = polarities[index] ?? 'none'
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
  selectWeapon: (id: string | null, polarities?: string[]) => void
  selectMod: (id: string | null) => void
  addModToBuild: (modId: string) => boolean
  equipModInSlot: (slotIndex: number, modId: string) => boolean
  removeModFromSlot: (slotIndex: number) => void
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
  selectWeapon: (selectedWeaponId, polarities = []) => set((state) => {
    if (state.selectedWeaponId === selectedWeaponId) return state
    return {
      selectedWeaponId,
      buildSlots: createBuildSlots(polarities),
      itemRank: 30,
      catalyst: false,
    }
  }),
  selectMod: (selectedModId) => set({ selectedModId }),
  addModToBuild: (modId) => {
    let added = false
    set((state) => {
      if (state.buildSlots.some((slot) => slot.modId === modId)) return state
      const emptyIndex = state.buildSlots.findIndex((slot) => slot.modId === null)
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
