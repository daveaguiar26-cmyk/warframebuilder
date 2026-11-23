import { useMemo, useState } from 'react'
import { Activity, ArrowUpRight, Copy, Crosshair, Heart, Layers3, Plus, Save, Search, Shield, Swords, Trash2, X, Zap } from 'lucide-react'
import { calculateCapacity, getRankedDrain, getSlotDrain } from '../engine/capacity'
import { calculateCompanionStats } from '../engine/companion'
import { calculateWeaponStats } from '../engine/weapon'
import type { ModSlot, RankedWeaponMod } from '../engine/types'
import { encodeBuildCode } from '../lib/buildCode'
import {
  canChooseWeapon,
  companionRank,
  filterModsForCompanionWeaponRecord,
  getCompanionWeapon,
  getRoboticWeapons,
  hasWeaponMods,
  isBeastClaws,
  postureSlotIndex,
  toCompanionBuildItems,
} from '../lib/companionBuild'
import { modularCompanions, partLabels, partOptions, type PartOption } from '../data/companionData'
import { filterModsForCompanion } from '../lib/modCompatibility'
import { searchItems } from '../lib/search'
import { useCompanionStore, type SlotTarget } from '../store/useCompanionStore'
import type { BuildModSlot } from '../store/useCatalogStore'
import type { CatalogData, CompanionRecord } from '../types'
import { EmptyState, ItemImage, ModRow, Stat, formatNumber, formatPercent, matchesSlotPolarity, polarityOptions } from '../ui/common'

const kindNames = { Sentinel: 'Sentinela', Beast: 'Besta', MOA: 'MOA', Hound: 'Hound' } as const

function describePart(option: PartOption): string {
  const changes = (['health', 'shield', 'armor'] as const)
    .filter((key) => option[key] !== undefined && option[key] !== 0)
    .map((key) => {
      const value = option[key] ?? 0
      const label = { health: 'Vida', shield: 'Escudo', armor: 'Armadura' }[key]
      return Math.abs(value) >= 1 ? `${label} ${value}` : `${label} ${value > 0 ? '+' : ''}${Math.round(value * 100)}%`
    })
  if (option.polarity) changes.push(option.polarity)
  if ('weapon' in option) changes.push(String(option.weapon))
  return changes.length ? `${option.name} (${changes.join(', ')})` : option.name
}

interface CompanionViewProps {
  catalog: CatalogData
  catalogLoading: boolean
  onSave: (nome: string, code: string) => Promise<void>
}

function CompanionRow({ companion, active, onSelect }: { companion: CompanionRecord; active: boolean; onSelect: () => void }) {
  return (
    <button className={`catalog-row weapon-row ${active ? 'is-selected' : ''}`} onClick={onSelect} type="button">
      <ItemImage name={companion.name} imageName={companion.imageName} />
      <span className="row-copy">
        <span className="row-title">{companion.name}</span>
        <span className="row-meta">{kindNames[companion.kind]}</span>
      </span>
      <ArrowUpRight aria-hidden="true" className="row-arrow" size={14} />
    </button>
  )
}

export function CompanionView({ catalog, catalogLoading, onSave }: CompanionViewProps) {
  const companions = useMemo(() => [...(catalog.companions ?? []), ...modularCompanions], [catalog.companions])
  const {
    query, companionId, reactor, slots, weaponId, parts, weaponSlots, weaponCatalyst,
    setQuery, setWeapon, setPart, selectCompanion, equipMod, removeMod, setModRank, setSlotPolarity, setReactor, setWeaponCatalyst,
  } = useCompanionStore()
  const [picker, setPicker] = useState<{ target: SlotTarget; index: number } | null>(null)
  const [tab, setTab] = useState<'companheiro' | 'arma'>('companheiro')
  const [modQuery, setModQuery] = useState('')
  const [saveName, setSaveName] = useState('')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState('')

  const visible = useMemo(() => searchItems(companions, query), [companions, query])
  const companion = companions.find((entry) => entry.uniqueName === companionId)
  const modsById = useMemo(() => new Map(catalog.mods.map((mod) => [mod.uniqueName, mod])), [catalog.mods])
  const toModSlots = (entries: BuildModSlot[]): ModSlot[] => entries.map((slot, index) => ({
    index,
    polarity: slot.polarity,
    factoryPolarity: slot.factoryPolarity,
    kind: 'normal',
    mod: slot.modId ? modsById.get(slot.modId) : undefined,
    rank: slot.rank,
  }))
  const modSlots = useMemo(() => toModSlots(slots), [slots, modsById])
  const rawWeaponModSlots = useMemo(() => toModSlots(weaponSlots), [weaponSlots, modsById])
  const rankedMods = (entries: ModSlot[]): RankedWeaponMod[] =>
    entries.flatMap((slot) => slot.mod ? [{ slotIndex: slot.index, mod: slot.mod, rank: slot.rank ?? 0 }] : [])

  const stats = useMemo(() => companion
    ? calculateCompanionStats(companion, modSlots.flatMap((slot) => slot.mod ? [{ upgrade: slot.mod, rank: slot.rank ?? 0 }] : []), parts)
    : null, [companion, modSlots, parts])
  const capacity = calculateCapacity({ rank: companionRank, catalyst: reactor, slots: modSlots })
  const roboticWeapons = useMemo(() => getRoboticWeapons(catalog.weapons), [catalog.weapons])
  const weapon = companion ? getCompanionWeapon(companion, { weaponId, parts }, catalog.weapons) : undefined
  const weaponModdable = hasWeaponMods(weapon)
  // O slot de Postura das garras funciona como uma Stance: dá capacidade em vez de a gastar.
  const weaponModSlots = useMemo(() => rawWeaponModSlots.map((slot): ModSlot =>
    isBeastClaws(weapon) && slot.index === postureSlotIndex ? { ...slot, kind: 'stance' } : slot,
  ), [rawWeaponModSlots, weapon])
  const buildCode = companion
    ? encodeBuildCode({ v: 1, itens: toCompanionBuildItems({ companionId: companion.uniqueName, reactor, slots, weaponId, parts, weaponSlots, weaponCatalyst }, weapon) })
    : ''
  // Garras de bestas: os mods do companheiro (Bite, Maul...) aplicam-se às garras.
  const weaponStats = useMemo(() => {
    if (!weapon) return null
    return calculateWeaponStats({ weapon, mods: rankedMods(weaponModSlots.filter((slot) => slot.kind !== 'stance')) })
  }, [weapon, weaponModSlots])
  const weaponCapacity = calculateCapacity({ rank: companionRank, catalyst: weaponCatalyst, slots: weaponModSlots })
  const pickerMods = useMemo(() => {
    if (!companion || !picker) return []
    const compatible = picker.target === 'weapon'
      ? (weapon ? filterModsForCompanionWeaponRecord(catalog.mods, weapon, picker.index) : [])
      : filterModsForCompanion(catalog.mods, companion.kind)
    return searchItems(compatible, modQuery)
  }, [catalog.mods, companion, picker, weapon, modQuery])

  function changePart(target: CompanionRecord, slot: string, value: string): void {
    setPart(target, slot, value)
    if (target.kind === 'Hound' && slot === 'modelo') {
      setWeapon(getCompanionWeapon(target, { weaponId: null, parts: { ...parts, modelo: value } }, catalog.weapons) ?? null, false)
    }
  }

  async function save(): Promise<void> {
    const nome = saveName.trim()
    if (!buildCode || !nome || saving) return
    setSaving(true)
    setFeedback('A guardar na biblioteca...')
    try {
      await onSave(nome, buildCode)
      setFeedback(`"${nome}" guardada na biblioteca partilhada`)
      setSaveName('')
    } catch (error) {
      setFeedback(`Não foi possível guardar: ${error instanceof Error ? error.message : 'erro desconhecido'}. Tente novamente.`)
    } finally {
      setSaving(false)
    }
  }

  async function copyCode(): Promise<void> {
    try {
      await navigator.clipboard.writeText(buildCode)
      setFeedback('Código copiado')
    } catch {
      setFeedback('Não foi possível copiar neste browser')
    }
  }

  function renderSlot(slot: ModSlot, target: SlotTarget) {
    const { mod, index } = slot
    const polarityMatch = mod && slot.polarity !== 'none' ? matchesSlotPolarity(slot.polarity ?? 'none', mod.polarity) : null
    const matchClass = polarityMatch === null ? '' : polarityMatch ? 'is-matching' : 'is-mismatched'
    const rankedDrain = mod ? getRankedDrain(mod, slot.rank ?? 0) : 0
    const slotCost = mod ? getSlotDrain(slot) : 0
    const polaritySelect = (
      <select value={slot.polarity ?? 'none'} onChange={(event) => setSlotPolarity(target, index, event.target.value)} aria-label={`Polaridade do slot ${index + 1}`}>
        {polarityOptions.map(([value, name]) => <option key={value} value={value}>{name}</option>)}
      </select>
    )
    return (
      <div className={`build-slot ${mod ? 'has-mod' : 'is-empty'} ${matchClass}`} key={index}>
        <div className="build-slot-head">
          <span>{slot.kind === 'stance' ? 'POSTURA' : `SLOT ${String(index + 1).padStart(2, '0')}`}</span>
          {mod && <button className="slot-remove-button" type="button" onClick={() => removeMod(target, index)} aria-label={`Remover ${mod.name}`}><Trash2 size={12} /></button>}
        </div>
        {mod ? (
          <>
            <ItemImage name={mod.name} imageName={mod.imageName} className="slot-image" />
            <strong className="slot-mod-name" title={mod.name}>{mod.name}</strong>
            <div className="slot-controls">
              <select value={slot.rank ?? 0} onChange={(event) => setModRank(target, index, Number(event.target.value))} aria-label={`Ranque de ${mod.name}`}>
                {Array.from({ length: mod.fusionLimit + 1 }, (_, rank) => <option key={rank} value={rank}>R{rank}</option>)}
              </select>
              {polaritySelect}
            </div>
            <span className={`slot-drain ${matchClass}`}>{rankedDrain !== slotCost ? <small>{rankedDrain} → </small> : null}{slotCost}</span>
          </>
        ) : (
          <>
            <button className="empty-slot-add" type="button" onClick={() => { setModQuery(''); setPicker({ target, index }) }} aria-label={`Adicionar mod ao slot ${index + 1}`}>
              <Plus size={16} /><span>Adicionar mod</span>
            </button>
            {polaritySelect}
          </>
        )}
      </div>
    )
  }

  return (
    <>
      <section className="page-heading" id="top">
        <div>
          <div className="eyebrow"><span>03</span> / COMPANHEIROS</div>
          <h1>Editor de companheiro</h1>
          <p>Sentinelas, bestas, MOA e Hound no ranque 30, cada um com a sua arma.</p>
        </div>
        <div className="catalog-counts"><span><b>{companions.length}</b> companheiros</span></div>
      </section>

      <section className="catalog-layout" aria-label="Editor de companheiro">
        <aside className="panel weapons-panel">
          <div className="panel-heading">
            <div className="panel-title-wrap"><span className="panel-index">A</span><h2>Companheiros</h2></div>
            <span className="panel-count">{visible.length}</span>
          </div>
          <label className="search-box">
            <Search size={16} aria-hidden="true" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar companheiro..." aria-label="Pesquisar companheiros" />
          </label>

          {companion && (
            <div className="weapon-loadout">
              <div className="loadout-controls">
                <label><span>RANQUE</span><strong className="fixed-rank">{companionRank}</strong></label>
                <label className="catalyst-toggle">
                  <input type="checkbox" checked={reactor} onChange={(event) => setReactor(event.target.checked)} />
                  <span>Reactor</span>
                </label>
              </div>
              <div className={`capacity-block ${capacity.remainingCapacity < 0 ? 'is-over-capacity' : ''}`}>
                <div className="capacity-heading"><span>CAPACIDADE</span><strong>{capacity.usedCapacity} <i>/</i> {capacity.totalCapacity}</strong></div>
                <div className="capacity-track" role="progressbar" aria-label="Capacidade de mods utilizada" aria-valuemin={0} aria-valuemax={capacity.totalCapacity} aria-valuenow={capacity.usedCapacity}>
                  <span style={{ width: `${capacity.totalCapacity ? Math.min(100, capacity.usedCapacity / capacity.totalCapacity * 100) : 0}%` }} />
                </div>
                <div className="capacity-footer">
                  <span>Formas <b>{capacity.formaRequired}</b></span>
                  <span>{capacity.remainingCapacity < 0 ? `${Math.abs(capacity.remainingCapacity)} a mais` : `${capacity.remainingCapacity} livre`}</span>
                </div>
              </div>
            </div>
          )}

          <div className="list-heading"><span>DISPONÍVEIS</span><span>{visible.length}</span></div>
          <div className="weapon-list">
            {visible.length ? visible.map((entry) => (
              <CompanionRow key={entry.uniqueName} companion={entry} active={entry.uniqueName === companionId} onSelect={() => selectCompanion(entry)} />
            )) : catalogLoading ? (
              <EmptyState title="A carregar catálogo" detail="A ler o catálogo estático do jogo." />
            ) : companions.length === 0 ? (
              <EmptyState title="Sem companheiros no catálogo" detail="Execute npm run update-data para acrescentar companheiros ao catálogo local." />
            ) : (
              <EmptyState title="Sem resultados" detail="Altere a pesquisa." />
            )}
          </div>
        </aside>

        <section className="panel detail-panel" aria-live="polite">
          {companion && stats ? (
            <>
              <div className="detail-topline"><span>REGISTO DO ITEM</span><span className="item-id">{companion.uniqueName.split('/').filter(Boolean).at(-1)}</span></div>
              <div className="weapon-hero">
                <ItemImage name={companion.name} imageName={companion.imageName} className="hero-image" />
                <div className="weapon-identification">
                  <span className="category-tag">{kindNames[companion.kind]} · R{companionRank}</span>
                  <h2>{companion.name}</h2>
                  <p>{companion.masteryReq ? `Maestria ${companion.masteryReq}` : 'Companheiro'}</p>
                </div>
              </div>

              <div className="weapon-filters companion-tabs" role="tablist" aria-label="Secções do companheiro">
                <button type="button" role="tab" aria-selected={tab === 'companheiro'} className={tab === 'companheiro' ? 'filter-chip is-active' : 'filter-chip'} onClick={() => setTab('companheiro')}>Companheiro</button>
                <button type="button" role="tab" aria-selected={tab === 'arma'} className={tab === 'arma' ? 'filter-chip is-active' : 'filter-chip'} onClick={() => setTab('arma')}>Arma{weapon ? ` · ${weapon.name}` : ''}</button>
              </div>
              {tab === 'companheiro' ? (
                <>
              {(companion.kind === 'MOA' || companion.kind === 'Hound') && (
                <>
                  <div className="section-rule lower-rule"><span>PEÇAS</span><span>GILDED · RANQUE 30</span></div>
                  <div className="arcane-grid">
                    {Object.entries(partOptions[companion.kind]).map(([slot, options]) => (
                      <label className="arcane-slot" key={slot}>
                        <span className="arcane-label">{partLabels[slot].toLocaleUpperCase('pt-PT')}</span>
                        <select value={parts[slot] ?? ''} onChange={(event) => changePart(companion, slot, event.target.value)} aria-label={partLabels[slot]}>
                          {options.map((option) => <option key={option.name} value={option.name}>{describePart(option)}</option>)}
                        </select>
                      </label>
                    ))}
                  </div>
                </>
              )}

              <div className="section-rule build-section-heading"><span>MODS DA BUILD</span><span>{modSlots.filter((slot) => slot.mod).length} / {modSlots.length}</span></div>
              <div className="build-slot-grid">{modSlots.map((slot) => renderSlot(slot, 'companion'))}</div>

                </>
              ) : (
                <>
              <div className="section-rule lower-rule"><span>ARMA</span><span>{canChooseWeapon(companion) ? 'ARMA ROBÓTICA' : companion.kind === 'Hound' ? 'DEFINIDA PELO MODELO' : 'GARRAS'}</span></div>
              <div className="arcane-slot">
                {canChooseWeapon(companion) ? (
                  <select value={weaponId ?? ''} onChange={(event) => setWeapon(roboticWeapons.find((entry) => entry.uniqueName === event.target.value) ?? null, true)} aria-label="Arma do companheiro">
                    <option value="">Sem arma</option>
                    {roboticWeapons.map((entry) => <option key={entry.uniqueName} value={entry.uniqueName}>{entry.name}</option>)}
                  </select>
                ) : (
                  <strong className="slot-mod-name">{weapon?.name ?? 'Sem dados de arma'}</strong>
                )}
                {weapon && weaponStats && (
                  <div className="side-stats-grid">
                    <Stat icon={Zap} label="DPS de referência" value={weapon.fireRate ? formatNumber(weaponStats.referenceDps, 0) : '—'} />
                    <Stat icon={Zap} label="Dano total" value={formatNumber(weaponStats.totalDamage)} />
                    <Stat icon={Crosshair} label="Chance crítica" value={formatPercent(weaponStats.criticalChance)} />
                    <Stat icon={Activity} label="Multiplicador crítico" value={`${formatNumber(weaponStats.criticalMultiplier)}×`} />
                    <Stat icon={Activity} label="Chance de estado" value={formatPercent(weaponStats.statusChance)} />
                    <Stat icon={Layers3} label="Multishot" value={`${formatNumber(weaponStats.multishot)}×`} />
                    <Stat icon={Swords} label="Cadência" value={weapon.fireRate ? `${formatNumber(weaponStats.fireRate)} /s` : '—'} />
                  </div>
                )}
                {weapon && !weapon.fireRate && <p className="arcane-effect">A wiki não indica a velocidade de ataque destas garras, por isso não há DPS de referência.</p>}
              </div>

              {weapon && weaponModdable && (
                <>
                  <div className="section-rule lower-rule">
                    <span>MODS DA ARMA</span>
                    <span>{weaponCapacity.usedCapacity} / {weaponCapacity.totalCapacity} · FORMAS {weaponCapacity.formaRequired}</span>
                  </div>
                  <label className="catalyst-toggle">
                    <input type="checkbox" checked={weaponCatalyst} onChange={(event) => setWeaponCatalyst(event.target.checked)} />
                    <span>Catalyst</span>
                  </label>
                  <div className="build-slot-grid">{weaponModSlots.map((slot) => renderSlot(slot, 'weapon'))}</div>
                  {weaponStats?.ignoredEffects.length ? (
                    <p className="raw-data-note">Efeitos da arma fora do cálculo: {weaponStats.ignoredEffects.join(' · ')}</p>
                  ) : null}
                </>
              )}

                </>
              )}

              <div className="build-code-section">
                <div className="section-rule"><span>GUARDAR BUILD</span><span>BIBLIOTECA</span></div>
                <form className="build-code-controls" onSubmit={(event) => { event.preventDefault(); save() }}>
                  <input aria-label="Nome da build" value={saveName} onChange={(event) => setSaveName(event.target.value)} placeholder={`Nome da build, ex.: ${companion.name} tanque`} maxLength={60} />
                  <button type="submit" disabled={!saveName.trim() || saving}><Save size={14} />{saving ? 'A guardar...' : 'Guardar na biblioteca'}</button>
                  <button type="button" className="command-button" onClick={copyCode}><Copy size={14} />Copiar código</button>
                </form>
                {feedback && <small className="code-feedback" role="status">{feedback}</small>}
              </div>

              {stats.ignoredEffects.length ? (
                <p className="raw-data-note">Preceitos e efeitos condicionais ficam fora do cálculo: {stats.ignoredEffects.join(' · ')}</p>
              ) : null}
            </>
          ) : (
            <div className="detail-empty">
              <span className="eyebrow">SELECCIONAR COMPANHEIRO</span>
              <h2>{catalogLoading ? 'A carregar.' : 'Escolha um companheiro.'}</h2>
              <p>Os stats no ranque 30 com os mods aplicados aparecem aqui.</p>
            </div>
          )}
        </section>

        <aside className="panel stats-panel">
          <div className="panel-heading">
            <div className="panel-title-wrap"><span className="panel-index mod-index">B</span><h2>Estatísticas</h2></div>
          </div>
          {companion && stats ? (
            <div className="side-stats-grid">
              <Stat icon={Heart} label="Vida" value={formatNumber(stats.health, 0)} />
              <Stat icon={Shield} label="Escudo" value={formatNumber(stats.shield, 0)} />
              <Stat icon={Activity} label="Armadura" value={formatNumber(stats.armor, 0)} />
            </div>
          ) : (
            <EmptyState title="Escolha um companheiro" detail="As estatísticas calculadas aparecem aqui." />
          )}
        </aside>
      </section>

      {picker && companion && (
        <div className="picker-backdrop" onClick={(event) => event.target === event.currentTarget && setPicker(null)}>
          <section className="mod-picker" role="dialog" aria-modal="true" aria-labelledby="companion-mod-picker-title">
            <header className="picker-header">
              <div><span className="eyebrow">{(picker.target === 'weapon' && weapon ? weapon.name : companion.name).toLocaleUpperCase('pt-PT')} · SLOT {picker.index + 1}</span><h2 id="companion-mod-picker-title">Adicionar mod</h2></div>
              <button type="button" className="picker-close" onClick={() => setPicker(null)} aria-label="Fechar selector de mods"><X size={18} /></button>
            </header>
            <label className="search-box picker-search">
              <Search size={16} aria-hidden="true" />
              <input value={modQuery} onChange={(event) => setModQuery(event.target.value)} placeholder="Pesquisar mods compatíveis..." aria-label="Pesquisar mods compatíveis" autoFocus />
            </label>
            <div className="list-heading"><span>MODS COMPATÍVEIS</span><span>{pickerMods.length}</span></div>
            <div className="mod-picker-list">
              {pickerMods.length ? pickerMods.slice(0, 200).map((mod) => (
                <ModRow
                  key={mod.uniqueName}
                  mod={mod}
                  active={false}
                  alreadyEquipped={(picker.target === 'weapon' ? weaponSlots : slots).some((slot) => slot.modId === mod.uniqueName)}
                  canEquip
                  onSelect={() => undefined}
                  onEquip={() => { if (equipMod(picker.target, picker.index, mod.uniqueName)) setPicker(null) }}
                />
              )) : <EmptyState title="Sem resultados" detail="Tente outro nome ou efeito de mod." />}
            </div>
          </section>
        </div>
      )}
    </>
  )
}
