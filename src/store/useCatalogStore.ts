import { create } from 'zustand'
import type { WeaponCategory } from '../types'

export type WeaponFilter = 'All' | WeaponCategory

interface CatalogState {
  weaponFilter: WeaponFilter
  weaponQuery: string
  modQuery: string
  selectedWeaponId: string | null
  selectedModId: string | null
  setWeaponFilter: (filter: WeaponFilter) => void
  setWeaponQuery: (query: string) => void
  setModQuery: (query: string) => void
  selectWeapon: (id: string | null) => void
  selectMod: (id: string | null) => void
}

export const useCatalogStore = create<CatalogState>((set) => ({
  weaponFilter: 'All',
  weaponQuery: '',
  modQuery: '',
  selectedWeaponId: null,
  selectedModId: null,
  setWeaponFilter: (weaponFilter) => set({ weaponFilter }),
  setWeaponQuery: (weaponQuery) => set({ weaponQuery }),
  setModQuery: (modQuery) => set({ modQuery }),
  selectWeapon: (selectedWeaponId) => set({ selectedWeaponId }),
  selectMod: (selectedModId) => set({ selectedModId }),
}))
