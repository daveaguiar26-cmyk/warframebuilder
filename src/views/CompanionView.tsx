import { useMemo, useState } from 'react'
import { Activity, ArrowUpRight, Copy, Crosshair, Heart, Layers3, Plus, Save, Search, Shield, Swords, Trash2, X, Zap } from 'lucide-react'
import { calculateCapacity, getRankedDrain, getSlotDrain } from '../engine/capacity'
import { calculateCompanionStats } from '../engine/companion'
import { calculateWeaponStats } from '../engine/weapon'
import type { ModSlot } from '../engine/types'
import { encodeBuildCode } from '../lib/buildCode'
import { companionRank, toCompanionBuildItems } from '../lib/companionBuild'
import { filterModsForCompanion } from '../lib/modCompatibility'
import { searchItems } from '../lib/search'
import { useCompanionStore } from '../store/useCompanionStore'
import { companionWeaponType, type CatalogData, type CompanionRecord } from '../types'
import { EmptyState, ItemImage, ModRow, Stat, formatNumber, formatPercent, matchesSlotPolarity, polarityOptions } from '../ui/common'

const kindNames = { Sentinel: 'Sentinela', Beast: 'Besta' } as const

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
  const companions = catalog.companions ?? []
  const {
    query, companionId, reactor, slots, weaponId,
    setQuery, setWeapon, selectCompanion, equipMod, removeMod, setModRank, setSlotPolarity, setReactor,
  } = useCompanionStore()
  const [pickerSlot, setPickerSlot] = useState<number | null>(null)
  const [modQuery, setModQuery] = useState('')
  const [saveName, setSaveName] = useState('')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState('')

  const visible = useMemo(() => searchItems(companions, query), [companions, query])
  const companion = companions.find((entry) => entry.uniqueName === companionId)
  const modsById = useMemo(() => new Map(catalog.mods.map((mod) => [mod.uniqueName, mod])), [catalog.mods])
  const modSlots = useMemo<ModSlot[]>(() => slots.map((slot, index) => ({
    index,
    polarity: slot.polarity,
    factoryPolarity: slot.factoryPolarity,
    kind: 'normal',
    mod: slot.modId ? modsById.get(slot.modId) : undefined,
    rank: slot.rank,
  })), [slots, modsById])

  const stats = useMemo(() => companion
    ? calculateCompanionStats(companion, modSlots.flatMap((slot) => slot.mod ? [{ upgrade: slot.mod, rank: slot.rank ?? 0 }] : []))
    : null, [companion, modSlots])
  const capacity = calculateCapacity({ rank: companionRank, catalyst: reactor, slots: modSlots })
  const buildCode = companion
    ? encodeBuildCode({ v: 1, itens: toCompanionBuildItems({ companionId: companion.uniqueName, reactor, slots, weaponId }) })
    : ''
  const companionWeapons = useMemo(
    () => catalog.weapons.filter((weapon) => weapon.type === companionWeaponType).sort((a, b) => a.name.localeCompare(b.name)),
    [catalog.weapons],
  )
  const weapon = companion?.kind === 'Sentinel' ? companionWeapons.find((entry) => entry.uniqueName === weaponId) : undefined
  const weaponStats = useMemo(() => weapon ? calculateWeaponStats({ weapon }) : null, [weapon])
  const pickerMods = useMemo(
    () => companion && pickerSlot !== null ? searchItems(filterModsForCompanion(catalog.mods, companion.kind), modQuery) : [],
    [catalog.mods, companion, pickerSlot, modQuery],
  )

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

  function renderSlot(slot: ModSlot) {
    const { mod, index } = slot
    const polarityMatch = mod && slot.polarity !== 'none' ? matchesSlotPolarity(slot.polarity ?? 'none', mod.polarity) : null
    const matchClass = polarityMatch === null ? '' : polarityMatch ? 'is-matching' : 'is-mismatched'
    const rankedDrain = mod ? getRankedDrain(mod, slot.rank ?? 0) : 0
    const slotCost = mod ? getSlotDrain(slot) : 0
    const polaritySelect = (
      <select value={slot.polarity ?? 'none'} onChange={(event) => setSlotPolarity(index, event.target.value)} aria-label={`Polaridade do slot ${index + 1}`}>
        {polarityOptions.map(([value, name]) => <option key={value} value={value}>{name}</option>)}
      </select>
    )
    return (
      <div className={`build-slot ${mod ? 'has-mod' : 'is-empty'} ${matchClass}`} key={index}>
        <div className="build-slot-head">
          <span>SLOT {String(index + 1).padStart(2, '0')}</span>
          {mod && <button className="slot-remove-button" type="button" onClick={() => removeMod(index)} aria-label={`Remover ${mod.name}`}><Trash2 size={12} /></button>}
        </div>
        {mod ? (
          <>
            <ItemImage name={mod.name} imageName={mod.imageName} className="slot-image" />
            <strong className="slot-mod-name" title={mod.name}>{mod.name}</strong>
            <div className="slot-controls">
              <select value={slot.rank ?? 0} onChange={(event) => setModRank(index, Number(event.target.value))} aria-label={`Ranque de ${mod.name}`}>
                {Array.from({ length: mod.fusionLimit + 1 }, (_, rank) => <option key={rank} value={rank}>R{rank}</option>)}
              </select>
              {polaritySelect}
            </div>
            <span className={`slot-drain ${matchClass}`}>{rankedDrain !== slotCost ? <small>{rankedDrain} → </small> : null}{slotCost}</span>
          </>
        ) : (
          <>
            <button className="empty-slot-add" type="button" onClick={() => { setModQuery(''); setPickerSlot(index) }} aria-label={`Adicionar mod ao slot ${index + 1}`}>
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
          <p>Sentinelas e bestas no ranque 30. As sentinelas incluem a respectiva arma.</p>
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

              <div className="section-rule build-section-heading"><span>MODS DA BUILD</span><span>{modSlots.filter((slot) => slot.mod).length} / {modSlots.length}</span></div>
              <div className="build-slot-grid">{modSlots.map(renderSlot)}</div>

              {companion.kind === 'Sentinel' && (
                <>
                  <div className="section-rule lower-rule"><span>ARMA DA SENTINELA</span><span>CALCULADA COMO ARMA</span></div>
                  <div className="arcane-slot">
                    <select value={weaponId ?? ''} onChange={(event) => setWeapon(event.target.value || null)} aria-label="Arma da sentinela">
                      <option value="">Sem arma</option>
                      {companionWeapons.map((entry) => <option key={entry.uniqueName} value={entry.uniqueName}>{entry.name}</option>)}
                    </select>
                    {weapon && weaponStats && (
                      <div className="side-stats-grid">
                        <Stat icon={Zap} label="DPS de referência" value={formatNumber(weaponStats.referenceDps, 0)} />
                        <Stat icon={Zap} label="Dano total" value={formatNumber(weaponStats.totalDamage)} />
                        <Stat icon={Crosshair} label="Chance crítica" value={formatPercent(weaponStats.criticalChance)} />
                        <Stat icon={Activity} label="Multiplicador crítico" value={`${formatNumber(weaponStats.criticalMultiplier)}×`} />
                        <Stat icon={Activity} label="Chance de estado" value={formatPercent(weaponStats.statusChance)} />
                        <Stat icon={Layers3} label="Multishot" value={`${formatNumber(weaponStats.multishot)}×`} />
                        <Stat icon={Swords} label="Cadência" value={`${formatNumber(weaponStats.fireRate)} /s`} />
                      </div>
                    )}
                  </div>
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

      {pickerSlot !== null && companion && (
        <div className="picker-backdrop" onClick={(event) => event.target === event.currentTarget && setPickerSlot(null)}>
          <section className="mod-picker" role="dialog" aria-modal="true" aria-labelledby="companion-mod-picker-title">
            <header className="picker-header">
              <div><span className="eyebrow">{companion.name.toLocaleUpperCase('pt-PT')} · SLOT {pickerSlot + 1}</span><h2 id="companion-mod-picker-title">Adicionar mod</h2></div>
              <button type="button" className="picker-close" onClick={() => setPickerSlot(null)} aria-label="Fechar selector de mods"><X size={18} /></button>
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
                  alreadyEquipped={slots.some((slot) => slot.modId === mod.uniqueName)}
                  canEquip
                  onSelect={() => undefined}
                  onEquip={() => { if (equipMod(pickerSlot, mod.uniqueName)) setPickerSlot(null) }}
                />
              )) : <EmptyState title="Sem resultados" detail="Tente outro nome ou efeito de mod." />}
            </div>
          </section>
        </div>
      )}
    </>
  )
}
