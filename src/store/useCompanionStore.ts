import { create } from 'zustand'
import type { CompanionRecord, WeaponRecord } from '../types'
import type { BuildModSlot } from './useCatalogStore'
import { createCompanionSlots, createWeaponSlots, type CompanionBuildState } from '../lib/companionBuild'
import { beastClaws, defaultParts, getCompanionPolarities, type CompanionParts } from '../data/companionData'

/** Que grelha de slots uma acção altera: a do companheiro ou a da arma. */
export type SlotTarget = 'companion' | 'weapon'

interface CompanionState {
  query: string
  companionId: string | null
  reactor: boolean
  slots: BuildModSlot[]
  weaponId: string | null
  parts: CompanionParts
  weaponSlots: BuildModSlot[]
  weaponCatalyst: boolean
  setQuery: (query: string) => void
  selectCompanion: (companion: CompanionRecord) => void
  setPart: (companion: CompanionRecord, slot: string, value: string) => void
  /** Escolhe a arma (sentinela/MOA) ou repõe os slots quando a arma fixa muda (Hound). */
  setWeapon: (weapon: WeaponRecord | null, selectable: boolean) => void
  equipMod: (target: SlotTarget, slotIndex: number, modId: string) => boolean
  removeMod: (target: SlotTarget, slotIndex: number) => void
  setModRank: (target: SlotTarget, slotIndex: number, rank: number) => void
  setSlotPolarity: (target: SlotTarget, slotIndex: number, polarity: string) => void
  setReactor: (reactor: boolean) => void
  setWeaponCatalyst: (catalyst: boolean) => void
  restore: (state: CompanionBuildState) => void
}

function updateSlot(slots: BuildModSlot[], index: number, change: Partial<BuildModSlot>): BuildModSlot[] {
  return slots.map((slot, current) => current === index ? { ...slot, ...change } : slot)
}

const slotKey = (target: SlotTarget) => target === 'weapon' ? 'weaponSlots' as const : 'slots' as const
const patch = (target: SlotTarget, slots: BuildModSlot[]): Partial<CompanionState> =>
  target === 'weapon' ? { weaponSlots: slots } : { slots }

export const useCompanionStore = create<CompanionState>((set) => ({
  query: '',
  companionId: null,
  reactor: false,
  slots: createCompanionSlots(),
  weaponId: null,
  parts: {},
  weaponSlots: createWeaponSlots(),
  weaponCatalyst: false,
  setQuery: (query) => set({ query }),
  selectCompanion: (companion) => set((state) => state.companionId === companion.uniqueName ? state : {
    companionId: companion.uniqueName,
    reactor: false,
    slots: createCompanionSlots(companion, defaultParts(companion.kind)),
    weaponId: null,
    parts: defaultParts(companion.kind),
    weaponSlots: createWeaponSlots(companion.kind === 'Beast' ? beastClaws[companion.name] : undefined),
    weaponCatalyst: false,
  }),
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
  setWeapon: (weapon, selectable) => set({
    weaponId: selectable ? weapon?.uniqueName ?? null : null,
    weaponSlots: createWeaponSlots(weapon ?? undefined),
    weaponCatalyst: false,
  }),
  equipMod: (target, slotIndex, modId) => {
    let equipped = false
    set((state) => {
      const slots = state[slotKey(target)]
      if (slots.some((slot) => slot.modId === modId) || slots[slotIndex]?.modId !== null) return state
      equipped = true
      return patch(target, updateSlot(slots, slotIndex, { modId, rank: 0 }))
    })
    return equipped
  },
  removeMod: (target, slotIndex) => set((state) => patch(target, updateSlot(state[slotKey(target)], slotIndex, { modId: null, rank: 0 }))),
  setModRank: (target, slotIndex, rank) => set((state) => patch(target, updateSlot(state[slotKey(target)], slotIndex, { rank }))),
  setSlotPolarity: (target, slotIndex, polarity) => set((state) => patch(target, updateSlot(state[slotKey(target)], slotIndex, { polarity }))),
  setReactor: (reactor) => set({ reactor }),
  setWeaponCatalyst: (weaponCatalyst) => set({ weaponCatalyst }),
  restore: ({ companionId, reactor, slots, weaponId, parts, weaponSlots, weaponCatalyst }) =>
    set({ companionId, reactor, slots, weaponId, parts, weaponSlots, weaponCatalyst }),
}))
