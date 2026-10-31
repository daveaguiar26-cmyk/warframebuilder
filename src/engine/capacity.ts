import type { ModRecord } from '../types'
import type { CapacitySummary, ItemCapacityInput, ModSlot } from './types'

export function getRankedDrain(mod: ModRecord, rank: number): number {
  if (!Number.isInteger(rank) || rank < 0 || rank > mod.fusionLimit) {
    throw new RangeError(`Rank ${rank} is invalid for ${mod.name}.`)
  }
  return Math.abs(mod.baseDrain) + rank
}

function hasMatchingPolarity(slotPolarity: string | undefined, modPolarity: string): boolean {
  if (!slotPolarity || slotPolarity === 'none') return false
  if (modPolarity === 'any') return true
  if (slotPolarity === 'universal' || slotPolarity === 'any') return modPolarity !== 'umbra'
  return slotPolarity === modPolarity
}

export function getSlotDrain(slot: ModSlot): number {
  if (!slot.mod || slot.kind === 'aura' || slot.kind === 'stance') return 0

  const drain = getRankedDrain(slot.mod, slot.rank ?? 0)
  if (!slot.polarity || slot.polarity === 'none') return drain
  if (hasMatchingPolarity(slot.polarity, slot.mod.polarity)) return Math.ceil(drain / 2)
  return drain + Math.round(drain * 0.25)
}

function getGrantedCapacity(slot: ModSlot): number {
  if (!slot.mod || (slot.kind !== 'aura' && slot.kind !== 'stance')) return 0

  const bonus = getRankedDrain(slot.mod, slot.rank ?? 0)
  if (!slot.polarity || slot.polarity === 'none') return bonus
  if (hasMatchingPolarity(slot.polarity, slot.mod.polarity)) return bonus * 2
  return Math.round(bonus * 0.8)
}

export function countRequiredFormas(slots: ModSlot[]): number {
  return slots.filter((slot) => (slot.polarity ?? 'none') !== (slot.factoryPolarity ?? 'none')).length
}

export function calculateCapacity(input: ItemCapacityInput): CapacitySummary {
  if (!Number.isInteger(input.rank) || input.rank < 0 || input.rank > 30) {
    throw new RangeError('Item rank must be an integer from 0 to 30.')
  }

  const baseCapacity = input.rank * (input.catalyst ? 2 : 1)
  const bonusCapacity = input.slots.reduce((total, slot) => total + getGrantedCapacity(slot), 0)
  const usedCapacity = input.slots.reduce((total, slot) => total + getSlotDrain(slot), 0)
  const totalCapacity = baseCapacity + bonusCapacity

  return {
    baseCapacity,
    bonusCapacity,
    totalCapacity,
    usedCapacity,
    remainingCapacity: totalCapacity - usedCapacity,
    formaRequired: countRequiredFormas(input.slots),
  }
}
