export interface SearchableRecord {
  name: string
  type?: string
  category?: string
  description?: string
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-PT')
    .trim()
}

export function searchItems<T extends SearchableRecord>(items: T[], query: string): T[] {
  const term = normalize(query)
  if (!term) return items

  return items.filter((item) =>
    [item.name, item.type, item.category, item.description]
      .filter(Boolean)
      .some((value) => normalize(value!).includes(term)),
  )
}
