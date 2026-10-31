import { beforeEach, describe, expect, it } from 'vitest'
import { useCatalogStore } from './useCatalogStore'

describe('build editor store', () => {
  beforeEach(() => {
    useCatalogStore.getState().selectWeapon(null)
  })

  it('creates eight slots and applies factory polarities in catalog order', () => {
    useCatalogStore.getState().selectWeapon('/test/weapon', ['madurai', 'vazarin'])
    const slots = useCatalogStore.getState().buildSlots

    expect(slots).toHaveLength(8)
    expect(slots[0].polarity).toBe('madurai')
    expect(slots[1].factoryPolarity).toBe('vazarin')
    expect(slots[2].polarity).toBe('none')
  })

  it('adds a mod to the first free slot and prevents duplicates', () => {
    const store = useCatalogStore.getState()
    store.selectWeapon('/test/weapon')

    expect(useCatalogStore.getState().addModToBuild('/test/mod')).toBe(true)
    expect(useCatalogStore.getState().addModToBuild('/test/mod')).toBe(false)
    expect(useCatalogStore.getState().buildSlots[0]).toMatchObject({ modId: '/test/mod', rank: 0 })
  })

  it('equips a selected mod in an empty slot and rejects occupied slots', () => {
    const store = useCatalogStore.getState()
    store.selectWeapon('/test/weapon')

    expect(store.equipModInSlot(3, '/test/first')).toBe(true)
    expect(useCatalogStore.getState().equipModInSlot(3, '/test/second')).toBe(false)
    expect(useCatalogStore.getState().equipModInSlot(4, '/test/first')).toBe(false)
    expect(useCatalogStore.getState().buildSlots[3].modId).toBe('/test/first')
  })

  it('updates ranks, slot polarities, catalyst and item rank', () => {
    const store = useCatalogStore.getState()
    store.selectWeapon('/test/weapon')
    store.setModRank(0, 5)
    store.setSlotPolarity(0, 'universal')
    store.setCatalyst(true)
    store.setItemRank(25)

    expect(useCatalogStore.getState()).toMatchObject({ itemRank: 25, catalyst: true })
    expect(useCatalogStore.getState().buildSlots[0]).toMatchObject({ rank: 5, polarity: 'universal' })
  })

  it('removes a mod from its slot', () => {
    const store = useCatalogStore.getState()
    store.selectWeapon('/test/weapon')
    store.addModToBuild('/test/mod')
    store.removeModFromSlot(0)

    expect(useCatalogStore.getState().buildSlots[0].modId).toBeNull()
  })

  it('restores a complete build in one state update', () => {
    const store = useCatalogStore.getState()
    store.restoreBuild('/test/weapon', 24, true, [
      { modId: '/test/mod', rank: 8, polarity: 'madurai', factoryPolarity: 'naramon' },
      ...Array.from({ length: 7 }, () => ({ modId: null, rank: 0, polarity: 'none', factoryPolarity: 'none' })),
    ])

    expect(useCatalogStore.getState()).toMatchObject({
      selectedWeaponId: '/test/weapon',
      selectedModId: null,
      itemRank: 24,
      catalyst: true,
    })
    expect(useCatalogStore.getState().buildSlots[0]).toMatchObject({ modId: '/test/mod', rank: 8 })
  })
})
