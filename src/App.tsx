import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowUpRight,
  Boxes,
  CircleHelp,
  Crosshair,
  Database,
  Filter,
  Layers3,
  Plus,
  Search,
  Shield,
  Swords,
  Trash2,
  X,
  Zap,
} from 'lucide-react'
import { calculateCapacity, getRankedDrain, getSlotDrain } from './engine/capacity'
import type { DamageType, ModSlot, RankedWeaponMod } from './engine/types'
import { calculateWeaponStats } from './engine/weapon'
import { searchItems } from './lib/search'
import { useCatalogStore, type WeaponFilter } from './store/useCatalogStore'
import type { CatalogData, ModRecord, WeaponRecord } from './types'

const emptyCatalog: CatalogData = {
  generatedAt: null,
  source: '@wfcd/items',
  weapons: [],
  mods: [],
}

const weaponFilters: Array<{ label: string; value: WeaponFilter }> = [
  { label: 'Todas', value: 'All' },
  { label: 'Primárias', value: 'Primary' },
  { label: 'Secundárias', value: 'Secondary' },
  { label: 'Corpo a corpo', value: 'Melee' },
]

const categoryNames: Record<string, string> = {
  Primary: 'Primária',
  Secondary: 'Secundária',
  Melee: 'Corpo a corpo',
}

const polarityOptions = [
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

const damageNames: Record<string, string> = {
  impact: 'Impacto',
  puncture: 'Perfuração',
  slash: 'Corte',
  heat: 'Fogo',
  cold: 'Gelo',
  electricity: 'Electricidade',
  toxin: 'Toxina',
  blast: 'Explosivo',
  corrosive: 'Corrosivo',
  gas: 'Gás',
  magnetic: 'Magnético',
  radiation: 'Radiação',
  viral: 'Viral',
  void: 'Vácuo',
  tau: 'Tau',
  true: 'Verdadeiro',
  untyped: 'Não classificado',
}

function isCompatibleMod(weapon: WeaponRecord, mod: ModRecord): boolean {
  const targets = [weapon.name, weapon.type, weapon.category]
    .filter(Boolean)
    .map((value) => value!.toLocaleLowerCase('en-US'))
  const compatibility = mod.compatName?.toLocaleLowerCase('en-US')
  if (compatibility) return targets.includes(compatibility)

  const modType = mod.type?.replace(/\s+Mod$/, '').trim().toLocaleLowerCase('en-US')
  return modType !== undefined && targets.includes(modType)
}

function matchesSlotPolarity(slotPolarity: string, modPolarity: string): boolean {
  if (slotPolarity === 'universal' || slotPolarity === 'any') return modPolarity !== 'umbra'
  return slotPolarity === modPolarity || modPolarity === 'any'
}

function imageUrl(imageName?: string): string | undefined {
  return imageName ? `https://cdn.warframestat.us/img/${imageName.replace(/^\//, '')}` : undefined
}

function formatNumber(value?: number, fractionDigits = 2): string {
  if (value === undefined || !Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('pt-PT', { maximumFractionDigits: fractionDigits }).format(value)
}

function formatPercent(value?: number): string {
  return value === undefined ? '—' : `${formatNumber(value * 100)}%`
}

function ItemImage({ name, imageName, className = '' }: { name: string; imageName?: string; className?: string }) {
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

function WeaponRow({ weapon, active, onSelect }: { weapon: WeaponRecord; active: boolean; onSelect: () => void }) {
  return (
    <button className={`catalog-row weapon-row ${active ? 'is-selected' : ''}`} onClick={onSelect} type="button">
      <ItemImage name={weapon.name} imageName={weapon.imageName} />
      <span className="row-copy">
        <span className="row-title">{weapon.name}</span>
        <span className="row-meta">{categoryNames[weapon.category] ?? weapon.category}</span>
      </span>
      <ArrowUpRight aria-hidden="true" className="row-arrow" size={14} />
    </button>
  )
}

function ModRow({
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

function Stat({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string }) {
  return (
    <div className="stat-cell">
      <span className="stat-icon"><Icon size={15} strokeWidth={1.7} /></span>
      <span className="stat-label">{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="empty-state">
      <span className="empty-mark"><Database size={19} strokeWidth={1.5} /></span>
      <strong>{title}</strong>
      <p>{detail}</p>
    </div>
  )
}

export default function App() {
  const [catalog, setCatalog] = useState<CatalogData>(emptyCatalog)
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [modPickerSlot, setModPickerSlot] = useState<number | null>(null)
  const {
    weaponFilter,
    weaponQuery,
    modQuery,
    selectedWeaponId,
    selectedModId,
    buildSlots,
    itemRank,
    catalyst,
    setWeaponFilter,
    setWeaponQuery,
    setModQuery,
    selectWeapon,
    selectMod,
    equipModInSlot,
    removeModFromSlot,
    setModRank,
    setSlotPolarity,
    setItemRank,
    setCatalyst,
  } = useCatalogStore()

  useEffect(() => {
    let cancelled = false

    fetch(`${import.meta.env.BASE_URL}data/catalog.json`)
      .then((response) => {
        if (!response.ok) throw new Error('Não foi possível carregar o catálogo local.')
        return response.json() as Promise<CatalogData>
      })
      .then((data) => {
        if (!cancelled) setCatalog(data)
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setCatalogLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const weapons = useMemo(() => {
    const matching = searchItems(catalog.weapons, weaponQuery)
    return matching.filter((weapon) => weaponFilter === 'All' || weapon.category === weaponFilter)
  }, [catalog.weapons, weaponFilter, weaponQuery])

  const selectedWeapon = catalog.weapons.find((weapon) => weapon.uniqueName === selectedWeaponId)
  const selectedMod = catalog.mods.find((mod) => mod.uniqueName === selectedModId)
  const compatibleMods = useMemo(
    () => selectedWeapon ? catalog.mods.filter((mod) => isCompatibleMod(selectedWeapon, mod)) : catalog.mods,
    [catalog.mods, selectedWeapon],
  )
  const mods = useMemo(() => searchItems(compatibleMods, modQuery), [compatibleMods, modQuery])
  const modsById = useMemo(() => new Map(catalog.mods.map((mod) => [mod.uniqueName, mod])), [catalog.mods])
  const buildModSlots = useMemo<ModSlot[]>(() => buildSlots.map((slot, index) => ({
    index,
    polarity: slot.polarity,
    factoryPolarity: slot.factoryPolarity,
    kind: 'normal',
    mod: slot.modId ? modsById.get(slot.modId) : undefined,
    rank: slot.rank,
  })), [buildSlots, modsById])
  const equippedMods = useMemo<RankedWeaponMod[]>(() => buildModSlots.flatMap((slot) =>
    slot.mod ? [{ slotIndex: slot.index, mod: slot.mod, rank: slot.rank ?? 0 }] : [],
  ), [buildModSlots])
  const weaponStats = useMemo(
    () => selectedWeapon ? calculateWeaponStats({ weapon: selectedWeapon, mods: equippedMods }) : null,
    [equippedMods, selectedWeapon],
  )
  const capacity = calculateCapacity({ rank: itemRank, catalyst, slots: buildModSlots })
  const isCapacityExceeded = capacity.remainingCapacity < 0
  const isEmpty = catalog.weapons.length === 0 && catalog.mods.length === 0
  const updatedLabel = catalogLoading
    ? 'a carregar'
    : catalog.generatedAt
    ? new Intl.DateTimeFormat('pt-PT', { dateStyle: 'medium' }).format(new Date(catalog.generatedAt))
    : 'por actualizar'

  function equipMod(mod: ModRecord, slotIndex: number): void {
    if (!selectedWeapon) return
    if (equipModInSlot(slotIndex, mod.uniqueName)) {
      selectMod(mod.uniqueName)
      setModPickerSlot(null)
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Warframe Builder, início">
          <span className="brand-mark"><Crosshair size={21} strokeWidth={1.7} /></span>
          <span className="brand-name">WARFRAME<span>BUILDER</span></span>
          <span className="brand-version">ALPHA 01</span>
        </a>

        <nav className="main-nav" aria-label="Secções principais">
          <button type="button" className="nav-item" disabled><Shield size={15} />Warframes<span className="nav-soon">BREVEMENTE</span></button>
          <button type="button" className="nav-item is-active" aria-current="page"><Swords size={15} />Armas</button>
          <button type="button" className="nav-item" disabled><Boxes size={15} />Companheiros<span className="nav-soon">BREVEMENTE</span></button>
          <button type="button" className="nav-item" disabled><Layers3 size={15} />Biblioteca<span className="nav-soon">BREVEMENTE</span></button>
        </nav>

        <div className="topbar-meta">
          <span className={`data-indicator ${catalogLoading || isEmpty ? 'is-waiting' : ''}`} />
          <span className="data-label">DADOS LOCAIS <b>·</b> {updatedLabel}</span>
          <a className="help-link" href="https://github.com/WFCD/warframe-items" target="_blank" rel="noreferrer" title="Origem dos dados do jogo">
            <CircleHelp size={17} />
          </a>
        </div>
      </header>

      <section className="page-heading" id="top">
        <div>
          <div className="eyebrow"><span>01</span> / ARSENAL</div>
          <h1>Pesquisa de equipamento</h1>
          <p>Armas e mods, consultados a partir de dados locais do jogo.</p>
        </div>
        <div className="catalog-counts" aria-label="Tamanho do catálogo">
          <span><b>{catalog.weapons.length.toLocaleString('pt-PT')}</b> armas</span>
          <i />
          <span><b>{catalog.mods.length.toLocaleString('pt-PT')}</b> mods</span>
        </div>
      </section>

      <section className="catalog-layout" aria-label="Pesquisa de armas e mods">
        <aside className="panel weapons-panel">
          <div className="panel-heading">
            <div className="panel-title-wrap"><span className="panel-index">A</span><h2>Arsenal</h2></div>
            <span className="panel-count">{weapons.length.toLocaleString('pt-PT')}</span>
          </div>

          <label className="search-box">
            <Search size={16} aria-hidden="true" />
            <input
              value={weaponQuery}
              onChange={(event) => setWeaponQuery(event.target.value)}
              placeholder="Pesquisar arma..."
              aria-label="Pesquisar armas"
            />
            <kbd>/</kbd>
          </label>

          <div className="filter-label"><Filter size={12} /> CLASSE</div>
          <div className="weapon-filters" role="group" aria-label="Filtrar por classe de arma">
            {weaponFilters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                className={weaponFilter === filter.value ? 'filter-chip is-active' : 'filter-chip'}
                onClick={() => setWeaponFilter(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {selectedWeapon && (
            <div className="weapon-loadout">
              <div className="weapon-summary">
                <ItemImage name={selectedWeapon.name} imageName={selectedWeapon.imageName} />
                <div>
                  <span>{categoryNames[selectedWeapon.category] ?? selectedWeapon.category}</span>
                  <strong>{selectedWeapon.name}</strong>
                  <small>{selectedWeapon.type ?? 'Arma'} · Ranque {itemRank}</small>
                </div>
              </div>
              <div className="loadout-controls">
                <label>
                  <span>RANQUE</span>
                  <select value={itemRank} onChange={(event) => setItemRank(Number(event.target.value))} aria-label="Ranque da arma">
                    {Array.from({ length: 31 }, (_, rank) => <option key={rank} value={rank}>{rank}</option>)}
                  </select>
                </label>
                <label className="catalyst-toggle">
                  <input type="checkbox" checked={catalyst} onChange={(event) => setCatalyst(event.target.checked)} />
                  <span>Catalyst</span>
                </label>
              </div>
              <div className={`capacity-block ${isCapacityExceeded ? 'is-over-capacity' : ''}`}>
                <div className="capacity-heading"><span>CAPACIDADE</span><strong>{capacity.usedCapacity} <i>/</i> {capacity.totalCapacity}</strong></div>
                <div
                  className="capacity-track"
                  role="progressbar"
                  aria-label="Capacidade de mods utilizada"
                  aria-valuemin={0}
                  aria-valuemax={capacity.totalCapacity}
                  aria-valuenow={capacity.usedCapacity}
                >
                  <span style={{ width: `${capacity.totalCapacity ? Math.min(100, capacity.usedCapacity / capacity.totalCapacity * 100) : 0}%` }} />
                </div>
                <div className="capacity-footer">
                  <span>Formas <b>{capacity.formaRequired}</b></span>
                  <span>{capacity.remainingCapacity < 0 ? `${Math.abs(capacity.remainingCapacity)} a mais` : `${capacity.remainingCapacity} livre`}</span>
                </div>
              </div>
            </div>
          )}


          {selectedWeapon && (
            <div className="weapon-loadout">
              <div className="weapon-summary">
                <ItemImage name={selectedWeapon.name} imageName={selectedWeapon.imageName} />
                <div>
                  <span>{categoryNames[selectedWeapon.category] ?? selectedWeapon.category}</span>
                  <strong>{selectedWeapon.name}</strong>
                  <small>{selectedWeapon.type ?? 'Arma'} · Ranque {itemRank}</small>
                </div>
              </div>
              <div className="loadout-controls">
                <label>
                  <span>RANQUE</span>
                  <select value={itemRank} onChange={(event) => setItemRank(Number(event.target.value))} aria-label="Ranque da arma">
                    {Array.from({ length: 31 }, (_, rank) => <option key={rank} value={rank}>{rank}</option>)}
                  </select>
                </label>
                <label className="catalyst-toggle">
                  <input type="checkbox" checked={catalyst} onChange={(event) => setCatalyst(event.target.checked)} />
                  <span>Catalyst instalado</span>
                </label>
              </div>
              <div className={`capacity-block ${isCapacityExceeded ? 'is-over-capacity' : ''}`}>
                <div className="capacity-heading"><span>CAPACIDADE</span><strong>{capacity.usedCapacity} <i>/</i> {capacity.totalCapacity}</strong></div>
                <div
                  className="capacity-track"
                  role="progressbar"
                  aria-label="Capacidade de mods utilizada"
                  aria-valuemin={0}
                  aria-valuemax={capacity.totalCapacity}
                  aria-valuenow={capacity.usedCapacity}
                >
                  <span style={{ width: `${capacity.totalCapacity ? Math.min(100, capacity.usedCapacity / capacity.totalCapacity * 100) : 0}%` }} />
                </div>
                <div className="capacity-footer">
                  <span>FORMAS NECESSÁRIAS <b>{capacity.formaRequired}</b></span>
                  <span>{capacity.remainingCapacity < 0 ? `${Math.abs(capacity.remainingCapacity)} A MAIS` : `${capacity.remainingCapacity} LIVRE`}</span>
                </div>
              </div>
            </div>
          )}
          <div className="list-heading"><span>ARMAS DISPONÍVEIS</span><span>{weapons.length}</span></div>
          <div className="weapon-list">
            {weapons.length ? weapons.slice(0, 200).map((weapon) => (
              <WeaponRow
                key={weapon.uniqueName}
                weapon={weapon}
                active={weapon.uniqueName === selectedWeaponId}
                onSelect={() => {
                  selectWeapon(weapon.uniqueName, weapon.polarities)
                  selectMod(null)
                }}
              />
            )) : catalogLoading ? (
              <EmptyState title="A carregar catálogo" detail="A ler o catálogo estático do jogo." />
            ) : isEmpty ? (
              <EmptyState title="Catálogo vazio" detail="Execute npm run update-data para gerar a lista local de armas e mods." />
            ) : (
              <EmptyState title="Sem resultados" detail="Altere a pesquisa ou escolha outra classe de arma." />
            )}
          </div>
          {weapons.length > 200 && <p className="list-limit">A mostrar 200 de {weapons.length} resultados. Refine a pesquisa.</p>}
        </aside>

        <section className="panel detail-panel" aria-live="polite">
          {selectedWeapon ? (
            <>
              <div className="detail-topline"><span>REGISTO DO ITEM</span><span className="item-id">{selectedWeapon.uniqueName.split('/').filter(Boolean).at(-1)}</span></div>
              <div className="weapon-hero">
                <ItemImage name={selectedWeapon.name} imageName={selectedWeapon.imageName} className="hero-image" />
                <div className="weapon-identification">
                  <span className="category-tag">{categoryNames[selectedWeapon.category] ?? selectedWeapon.category}</span>
                  <h2>{selectedWeapon.name}</h2>
                  <p>{selectedWeapon.type ?? 'Arma'}{selectedWeapon.masteryReq !== undefined ? ` · Maestria ${selectedWeapon.masteryReq}` : ''}</p>
                </div>
              </div>

              <div className="section-rule build-section-heading"><span>MODS DA BUILD</span><span>{equippedMods.length} / 8</span></div>
              <div className="build-slot-grid" aria-label="Slots de mods da build">
                {buildModSlots.map((slot, index) => {
                  const mod = slot.mod
                  const polarityMatch = mod && slot.polarity !== 'none'
                    ? matchesSlotPolarity(slot.polarity ?? 'none', mod.polarity)
                    : null
                  const slotCost = mod ? getSlotDrain(slot) : 0
                  const rankedDrain = mod ? getRankedDrain(mod, slot.rank ?? 0) : 0

                  return (
                    <div className={`build-slot ${mod ? 'has-mod' : 'is-empty'}`} key={index}>
                      <div className="build-slot-head">
                        <span>SLOT {String(index + 1).padStart(2, '0')}</span>
                        {mod && (
                          <button
                            className="slot-remove-button"
                            type="button"
                            onClick={() => removeModFromSlot(index)}
                            title={`Remover ${mod.name}`}
                            aria-label={`Remover ${mod.name} do slot ${index + 1}`}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                      {mod ? (
                        <>
                          <ItemImage name={mod.name} imageName={mod.imageName} className="slot-image" />
                          <strong className="slot-mod-name" title={mod.name}>{mod.name}</strong>
                          <div className="slot-controls">
                            <select
                              value={slot.rank ?? 0}
                              onChange={(event) => setModRank(index, Number(event.target.value))}
                              aria-label={`Ranque de ${mod.name} no slot ${index + 1}`}
                            >
                              {Array.from({ length: mod.fusionLimit + 1 }, (_, rank) => (
                                <option key={rank} value={rank}>R{rank}</option>
                              ))}
                            </select>
                            <select
                              value={slot.polarity ?? 'none'}
                              onChange={(event) => setSlotPolarity(index, event.target.value)}
                              aria-label={`Polaridade do slot ${index + 1}`}
                            >
                              {polarityOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                            </select>
                          </div>
                          <span className={`slot-drain ${polarityMatch === null ? '' : polarityMatch ? 'is-matching' : 'is-mismatched'}`}>
                            {slotCost} <small>/ {rankedDrain}</small>
                          </span>
                        </>
                      ) : (
                        <>
                          <button
                            className="empty-slot-add"
                            type="button"
                            disabled={!selectedWeapon}
                            onClick={() => setModPickerSlot(index)}
                            aria-label={`Adicionar mod ao slot ${index + 1}`}
                          >
                            <Plus size={16} />
                            <span>Adicionar mod</span>
                          </button>
                          <select
                            value={slot.polarity ?? 'none'}
                            onChange={(event) => setSlotPolarity(index, event.target.value)}
                            aria-label={`Polaridade do slot ${index + 1}`}
                          >
                            {polarityOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                          </select>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="section-rule"><span>ESTATÍSTICAS DA BUILD</span><span>{equippedMods.length ? 'COM MODS' : 'BASE'}</span></div>
              <div className="section-rule lower-rule"><span>DANO POR TIPO</span><span>SEM INIMIGO</span></div>
              <div className="damage-breakdown">
                {Object.entries(weaponStats?.damage ?? {}).filter(([, value]) => (value ?? 0) > 0).map(([type, value]) => (
                  <span key={type}>{damageNames[type as DamageType] ?? type} <b>{formatNumber(value)}</b></span>
                ))}
              </div>

              {weaponStats?.ignoredEffects.length ? (
                <p className="raw-data-note">Alguns efeitos condicionais não entram no cálculo: {weaponStats.ignoredEffects.join(' · ')}</p>
              ) : null}
            </>
          ) : (
            <div className="detail-empty">
              <div className="reticle"><Crosshair size={42} strokeWidth={1.2} /></div>
              <span className="eyebrow">SELECCIONAR EQUIPAMENTO</span>
              <h2>{catalogLoading ? 'A carregar arsenal.' : isEmpty ? 'A preparar o arsenal.' : 'Escolha uma arma.'}</h2>
              <p>{catalogLoading ? 'A abrir os dados locais do jogo.' : isEmpty ? 'Depois de actualizar os dados, pesquise e abra qualquer arma para consultar os seus valores base.' : 'Os valores base e os detalhes da arma aparecem aqui.'}</p>
              <div className="detail-hint"><span>SEM SIMULADOR</span><i />MOTOR AINDA NÃO LIGADO À VISTA</div>
            </div>
          )}
        </section>

        <aside className="panel stats-panel">
          <div className="panel-heading">
            <div className="panel-title-wrap"><span className="panel-index mod-index">B</span><h2>Estatísticas</h2></div>
          </div>
          {selectedWeapon && weaponStats ? (
            <>
              <div className="reference-dps">
                <span>DPS DE REFERÊNCIA · SEM RECARGA</span>
                <strong>{formatNumber(weaponStats.referenceDps, 0)}</strong>
                <small>{formatNumber(weaponStats.totalDamage)} × {formatNumber(weaponStats.averageCriticalMultiplier)} × {formatNumber(weaponStats.multishot)} × {formatNumber(weaponStats.fireRate)}</small>
              </div>
              <div className="side-stats-grid">
                <Stat icon={Zap} label="Dano total / projéctil" value={formatNumber(weaponStats.totalDamage)} />
                <Stat icon={Crosshair} label="Chance crítica" value={formatPercent(weaponStats.criticalChance)} />
                <Stat icon={Activity} label="Multiplicador crítico" value={`${formatNumber(weaponStats.criticalMultiplier)}×`} />
                <Stat icon={Activity} label="Crítico médio" value={`${formatNumber(weaponStats.averageCriticalMultiplier)}×`} />
                <Stat icon={CircleHelp} label="Chance de estado" value={formatPercent(weaponStats.statusChance)} />
                <Stat icon={Layers3} label="Multishot" value={`${formatNumber(weaponStats.multishot)}×`} />
                <Stat icon={Swords} label="Cadência" value={`${formatNumber(weaponStats.fireRate)} /s`} />
              </div>
            </>
          ) : (
            <EmptyState title="Escolha uma arma" detail="As estatísticas calculadas aparecem aqui." />
          )}
        </aside>
      </section>

      {modPickerSlot !== null && selectedWeapon && (
        <div className="picker-backdrop" onClick={(event) => event.target === event.currentTarget && setModPickerSlot(null)}>
          <section className="mod-picker" role="dialog" aria-modal="true" aria-labelledby="mod-picker-title">
            <header className="picker-header">
              <div><span className="eyebrow">BUILD · SLOT {String(modPickerSlot + 1).padStart(2, '0')}</span><h2 id="mod-picker-title">Adicionar mod</h2></div>
              <button type="button" className="picker-close" onClick={() => setModPickerSlot(null)} aria-label="Fechar selector de mods"><X size={18} /></button>
            </header>
            <label className="search-box picker-search">
              <Search size={16} aria-hidden="true" />
              <input value={modQuery} onChange={(event) => setModQuery(event.target.value)} placeholder="Pesquisar mods compatíveis..." aria-label="Pesquisar mods compatíveis" autoFocus />
              <kbd>/</kbd>
            </label>
            <div className="list-heading"><span>{selectedWeapon.name.toLocaleUpperCase('pt-PT')} · MODS COMPATÍVEIS</span><span>{mods.length}</span></div>
            <div className="mod-picker-list">
              {mods.length ? mods.slice(0, 200).map((mod) => (
                <ModRow
                  key={mod.uniqueName}
                  mod={mod}
                  active={mod.uniqueName === selectedModId}
                  alreadyEquipped={buildSlots.some((slot) => slot.modId === mod.uniqueName)}
                  canEquip
                  onSelect={() => selectMod(mod.uniqueName)}
                  onEquip={() => equipMod(mod, modPickerSlot)}
                />
              )) : (
                <EmptyState title="Sem resultados" detail="Tente outro nome ou efeito de mod." />
              )}
            </div>
            {mods.length > 200 && <p className="list-limit">A mostrar 200 de {mods.length} resultados. Refine a pesquisa.</p>}
            {selectedMod && (
              <div className="picker-selected">
                <div><strong>{selectedMod.name}</strong><span>{selectedMod.type ?? 'Mod'} · {selectedMod.polarity}</span></div>
                <button type="button" disabled={buildSlots.some((slot) => slot.modId === selectedMod.uniqueName)} onClick={() => equipMod(selectedMod, modPickerSlot)}>
                  <Plus size={14} /> Instalar
                </button>
              </div>
            )}
          </section>
        </div>
      )}

      <footer className="statusbar">
        <span><span className={`status-dot ${catalogLoading || isEmpty ? 'is-waiting' : ''}`} />CATÁLOGO {catalogLoading ? 'A CARREGAR' : isEmpty ? 'POR GERAR' : 'PRONTO'}</span>
        <span><Database size={13} />{catalog.source} <b>·</b> ficheiros estáticos</span>
        <span className="status-right"><a href="https://wiki.warframe.com/w/Mod" target="_blank" rel="noreferrer">Wiki oficial <ArrowUpRight size={12} /></a></span>
      </footer>
    </main>
  )
}
