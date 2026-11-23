import { Database, Plus, type LucideIcon } from 'lucide-react'
import type { ModRecord } from '../types'

export const polarityOptions = [
  ['none', 'Sem polaridade'],
  ['madurai', 'Madurai'],
  ['naramon', 'Naramon'],
  ['vazarin', 'Vazarin'],
  ['zenurik', 'Zenurik'],
  ['unairu', 'Unairu'],
  ['penjaga', 'Penjaga'],
  ['umbra', 'Umbra'],
  ['universal', 'Omni'],
] as const

export function matchesSlotPolarity(slotPolarity: string, modPolarity: string): boolean {
  if (slotPolarity === 'universal' || slotPolarity === 'any') return modPolarity !== 'umbra'
  return slotPolarity === modPolarity || modPolarity === 'any'
}

export function imageUrl(imageName?: string): string | undefined {
  return imageName ? `https://cdn.warframestat.us/img/${imageName.replace(/^\//, '')}` : undefined
}

export function formatNumber(value?: number, fractionDigits = 2): string {
  if (value === undefined || !Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('pt-PT', { maximumFractionDigits: fractionDigits }).format(value)
}

export function formatPercent(value?: number): string {
  return value === undefined ? '—' : `${formatNumber(value * 100)}%`
}

export function ItemImage({ name, imageName, className = '' }: { name: string; imageName?: string; className?: string }) {
  const source = imageUrl(imageName)
  return (
    <div className={`item-image ${className}`}>
      {source ? (
        <img src={source} alt="" loading="lazy" onError={(event) => event.currentTarget.remove()} />
      ) : null}
      <span aria-hidden="true">{name.slice(0, 1)}</span>
    </div>
  )
}

export function ModRow({
  mod,
  active,
  alreadyEquipped,
  canEquip,
  onSelect,
  onEquip,
}: {
  mod: ModRecord
  active: boolean
  alreadyEquipped: boolean
  canEquip: boolean
  onSelect: () => void
  onEquip: () => void
}) {
  return (
    <div className={`catalog-row mod-row ${active ? 'is-selected' : ''}`}>
      <button className="mod-row-select" onClick={onSelect} type="button" aria-pressed={active}>
        <ItemImage name={mod.name} imageName={mod.imageName} />
        <span className="row-copy">
          <span className="row-title">{mod.name}</span>
          <span className="row-meta">{mod.type ?? 'Mod'} · {mod.polarity}</span>
        </span>
        <span className="drain-tag">{mod.baseDrain}</span>
      </button>
      <button
        className="mod-add-button"
        onClick={onEquip}
        type="button"
        disabled={!canEquip || alreadyEquipped}
        title={alreadyEquipped ? 'Este mod já está na build' : 'Adicionar à build'}
        aria-label={`Adicionar ${mod.name} à build`}
      >
        {alreadyEquipped ? <span className="installed-mark">✓</span> : <Plus size={15} />}
      </button>
    </div>
  )
}

export function Stat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="stat-cell">
      <span className="stat-icon"><Icon size={15} strokeWidth={1.7} /></span>
      <span className="stat-label">{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="empty-state">
      <span className="empty-mark"><Database size={19} strokeWidth={1.5} /></span>
      <strong>{title}</strong>
      <p>{detail}</p>
    </div>
  )
}
