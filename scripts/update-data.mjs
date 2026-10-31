import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import Items from '@wfcd/items'

const outputPath = fileURLToPath(new URL('../src/data/catalog.json', import.meta.url))
const excludedTags = new Set(['Amp', 'Kitgun', 'Zaw'])
const itemCatalog = new Items({
  category: ['Primary', 'Secondary', 'Melee', 'Mods'],
  resolveComponents: false,
})

const weapons = itemCatalog
  .filter((item) => ['Primary', 'Secondary', 'Melee'].includes(item.category))
  .filter((item) => {
    const tags = item.tags ?? []
    return !excludedTags.has(item.type ?? '') && !tags.some((tag) => excludedTags.has(tag))
  })
  .map((item) => ({
    uniqueName: item.uniqueName,
    name: item.name,
    category: item.category,
    type: item.type,
    imageName: item.imageName,
    masteryReq: item.masteryReq,
    totalDamage: item.totalDamage,
    damage: item.damage,
    criticalChance: item.criticalChance,
    criticalMultiplier: item.criticalMultiplier,
    statusChance: item.statusChance,
    multishot: item.multishot,
    fireRate: item.fireRate,
    magazineSize: item.magazineSize,
    reloadTime: item.reloadTime,
    polarities: item.polarities,
  }))

const mods = itemCatalog
  .filter((item) => item.category === 'Mods' && typeof item.baseDrain === 'number')
  .map((item) => ({
    uniqueName: item.uniqueName,
    name: item.name,
    type: item.type,
    imageName: item.imageName,
    description: item.description,
    baseDrain: item.baseDrain,
    polarity: item.polarity,
    fusionLimit: item.fusionLimit,
    isExilus: item.isExilus,
    levelStats: item.levelStats,
  }))

const catalog = {
  generatedAt: new Date().toISOString(),
  source: '@wfcd/items',
  weapons,
  mods,
}

await writeFile(outputPath, `${JSON.stringify(catalog, null, 2)}\n`)
console.log(`Catálogo actualizado: ${weapons.length} armas e ${mods.length} mods.`)
