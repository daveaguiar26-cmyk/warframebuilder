import { useMemo, useState } from 'react'
import { Activity, ArrowUpRight, Copy, Gauge, Heart, Plus, Save, Search, Shield, Sparkles, Trash2, X, Zap } from 'lucide-react'
import { calculateCapacity, getRankedDrain, getSlotDrain } from '../engine/capacity'
import type { ModSlot } from '../engine/types'
import { calculateWarframeStats, type RankedWarframeUpgrade } from '../engine/warframe'
import { encodeBuildCode } from '../lib/buildCode'
import { filterModsForWarframe } from '../lib/modCompatibility'
import { searchItems } from '../lib/search'
import {
  arcaneMaxRank,
  auraSlotIndex,
  exilusSlotIndex,
  slotKindAt,
  toWarframeBuildItem,
  warframeRank,
} from '../lib/warframeBuild'
import { useWarframeStore } from '../store/useWarframeStore'
import type { ArcaneRecord, CatalogData, ModRecord, WarframeRecord } from '../types'
import { EmptyState, ItemImage, ModRow, Stat, formatNumber, formatPercent, matchesSlotPolarity, polarityOptions } from '../ui/common'

const slotLabels: Record<string, string> = { aura: 'AURA', exilus: 'EXILUS' }

interface WarframeViewProps {
  catalog: CatalogData
  catalogLoading: boolean
  onSave: (nome: string, code: string) => Promise<void>
}

function FrameRow({ frame, active, onSelect }: { frame: WarframeRecord; active: boolean; onSelect: () => void }) {
  return (
    <button className={`catalog-row weapon-row ${active ? 'is-selected' : ''}`} onClick={onSelect} type="button">
      <ItemImage name={frame.name} imageName={frame.imageName} />
      <span className="row-copy">
        <span className="row-title">{frame.name}</span>
        <span className="row-meta">Warframe{frame.masteryReq ? ` · Maestria ${frame.masteryReq}` : ''}</span>
      </span>
      <ArrowUpRight aria-hidden="true" className="row-arrow" size={14} />
    </button>
  )
}

export function WarframeView({ catalog, catalogLoading, onSave }: WarframeViewProps) {
  const warframes = catalog.warframes ?? []
  const arcanes = catalog.arcanes ?? []
  const {
    frameQuery, frameId, reactor, slots, arcanes: arcaneSlots,
    setFrameQuery, selectFrame, equipMod, removeMod, setModRank, setSlotPolarity, setReactor, setArcane, setArcaneRank,
  } = useWarframeStore()
  const [pickerSlot, setPickerSlot] = useState<number | null>(null)
  const [modQuery, setModQuery] = useState('')
  const [saveName, setSaveName] = useState('')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState('')

  const frames = useMemo(() => searchItems(warframes, frameQuery), [warframes, frameQuery])
  const frame = warframes.find((entry) => entry.uniqueName === frameId)
  const modsById = useMemo(() => new Map(catalog.mods.map((mod) => [mod.uniqueName, mod])), [catalog.mods])
  const arcanesById = useMemo(() => new Map(arcanes.map((arcane) => [arcane.uniqueName, arcane])), [arcanes])

  const modSlots = useMemo<ModSlot[]>(() => slots.map((slot, index) => ({
    index,
    polarity: slot.polarity,
    factoryPolarity: slot.factoryPolarity,
    kind: slotKindAt(index),
    mod: slot.modId ? modsById.get(slot.modId) : undefined,
    rank: slot.rank,
  })), [slots, modsById])

  const upgrades = useMemo<RankedWarframeUpgrade[]>(() => [
    ...modSlots.flatMap((slot) => slot.mod ? [{ upgrade: slot.mod, rank: slot.rank ?? 0 }] : []),
    ...arcaneSlots.flatMap((slot) => {
      const arcane = slot.arcaneId ? arcanesById.get(slot.arcaneId) : undefined
      return arcane ? [{ upgrade: arcane, rank: slot.rank }] : []
    }),
  ], [modSlots, arcaneSlots, arcanesById])

  const stats = useMemo(() => frame ? calculateWarframeStats(frame, upgrades) : null, [frame, upgrades])
  const capacity = calculateCapacity({ rank: warframeRank, catalyst: reactor, slots: modSlots })
  const buildCode = frame
    ? encodeBuildCode({ v: 1, itens: [toWarframeBuildItem({ frameId: frame.uniqueName, reactor, slots, arcanes: arcaneSlots })] })
    : ''

  const pickerMods = useMemo(() => {
    if (!frame || pickerSlot === null) return []
    return searchItems(filterModsForWarframe(catalog.mods, frame, slotKindAt(pickerSlot)), modQuery)
  }, [catalog.mods, frame, pickerSlot, modQuery])

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

  function renderSlot(slot: ModSlot, index: number) {
    const mod = slot.mod
    const kind = slotKindAt(index)
    const polarityMatch = mod && slot.polarity !== 'none' ? matchesSlotPolarity(slot.polarity ?? 'none', mod.polarity) : null
    const matchClass = polarityMatch === null ? '' : polarityMatch ? 'is-matching' : 'is-mismatched'
    const rankedDrain = mod ? getRankedDrain(mod, slot.rank ?? 0) : 0
    const slotCost = mod ? (kind === 'aura' ? -rankedDrain : getSlotDrain(slot)) : 0
    const label = slotLabels[kind] ?? `SLOT ${String(index + 1).padStart(2, '0')}`
    const polaritySelect = (
      <select value={slot.polarity ?? 'none'} onChange={(event) => setSlotPolarity(index, event.target.value)} aria-label={`Polaridade do slot ${label}`}>
        {polarityOptions.map(([value, name]) => <option key={value} value={value}>{name}</option>)}
      </select>
    )

    return (
      <div className={`build-slot ${mod ? 'has-mod' : 'is-empty'} ${matchClass}`} key={index}>
        <div className="build-slot-head">
          <span>{label}</span>
          {mod && (
            <button className="slot-remove-button" type="button" onClick={() => removeMod(index)} aria-label={`Remover ${mod.name}`}>
              <Trash2 size={12} />
            </button>
          )}
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
            <span className={`slot-drain ${matchClass}`} title={kind === 'aura' ? 'Capacidade concedida pela aura' : undefined}>
              {kind === 'aura' ? `+${capacity.bonusCapacity}` : <>{rankedDrain !== slotCost ? <small>{rankedDrain} → </small> : null}{slotCost}</>}
            </span>
          </>
        ) : (
          <>
            <button className="empty-slot-add" type="button" onClick={() => { setModQuery(''); setPickerSlot(index) }} aria-label={`Adicionar mod ao slot ${label}`}>
              <Plus size={16} />
              <span>{kind === 'normal' ? 'Adicionar mod' : `Adicionar ${kind}`}</span>
            </button>
            {polaritySelect}
          </>
        )}
      </div>
    )
  }

  function renderArcane(index: number) {
    const slot = arcaneSlots[index]
    const arcane: ArcaneRecord | undefined = slot.arcaneId ? arcanesById.get(slot.arcaneId) : undefined
    const effect = arcane?.levelStats?.[slot.rank]?.stats.join(' ').replace(/\\n/g, ' ').replace(/<[^>]*>/g, '')
    return (
      <div className="arcane-slot" key={index}>
        <span className="arcane-label">ARCANE {index + 1}</span>
        <div className="slot-controls">
          <select value={slot.arcaneId ?? ''} onChange={(event) => setArcane(index, event.target.value || null)} aria-label={`Arcane ${index + 1}`}>
            <option value="">Sem arcane</option>
            {arcanes.map((entry) => (
              <option key={entry.uniqueName} value={entry.uniqueName} disabled={arcaneSlots.some((other, otherIndex) => otherIndex !== index && other.arcaneId === entry.uniqueName)}>
                {entry.name}
              </option>
            ))}
          </select>
          {arcane && (
            <select value={slot.rank} onChange={(event) => setArcaneRank(index, Number(event.target.value))} aria-label={`Ranque de ${arcane.name}`}>
              {Array.from({ length: arcaneMaxRank(arcane) + 1 }, (_, rank) => <option key={rank} value={rank}>R{rank}</option>)}
            </select>
          )}
        </div>
        {effect && <p className="arcane-effect">{effect}</p>}
      </div>
    )
  }

  const normalSlots = modSlots.filter((slot) => slot.index !== auraSlotIndex && slot.index !== exilusSlotIndex)

  return (
    <>
      <section className="page-heading" id="top">
        <div>
          <div className="eyebrow"><span>02</span> / WARFRAMES</div>
          <h1>Editor de Warframe</h1>
          <p>Sempre no ranque 30. Stats de sobrevivência, atributos de habilidade, Aura, Exilus e Arcanes.</p>
        </div>
        <div className="catalog-counts"><span><b>{warframes.length.toLocaleString('pt-PT')}</b> Warframes</span></div>
      </section>

      <section className="catalog-layout" aria-label="Editor de Warframe">
        <aside className="panel weapons-panel">
          <div className="panel-heading">
            <div className="panel-title-wrap"><span className="panel-index">A</span><h2>Warframes</h2></div>
            <span className="panel-count">{frames.length}</span>
          </div>
          <label className="search-box">
            <Search size={16} aria-hidden="true" />
            <input value={frameQuery} onChange={(event) => setFrameQuery(event.target.value)} placeholder="Pesquisar Warframe..." aria-label="Pesquisar Warframes" />
          </label>

          {frame && (
            <div className="weapon-loadout">
              <div className="loadout-controls">
                <label><span>RANQUE</span><strong className="fixed-rank">{warframeRank}</strong></label>
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

          <div className="list-heading"><span>WARFRAMES DISPONÍVEIS</span><span>{frames.length}</span></div>
          <div className="weapon-list">
            {frames.length ? frames.map((entry) => (
              <FrameRow key={entry.uniqueName} frame={entry} active={entry.uniqueName === frameId} onSelect={() => selectFrame(entry)} />
            )) : catalogLoading ? (
              <EmptyState title="A carregar catálogo" detail="A ler o catálogo estático do jogo." />
            ) : warframes.length === 0 ? (
              <EmptyState title="Sem Warframes no catálogo" detail="Execute npm run update-data para acrescentar Warframes e Arcanes ao catálogo local." />
            ) : (
              <EmptyState title="Sem resultados" detail="Altere a pesquisa." />
            )}
          </div>
        </aside>

        <section className="panel detail-panel" aria-live="polite">
          {frame && stats ? (
            <>
              <div className="detail-topline"><span>REGISTO DO ITEM</span><span className="item-id">{frame.uniqueName.split('/').filter(Boolean).at(-1)}</span></div>
              <div className="weapon-hero">
                <ItemImage name={frame.name} imageName={frame.imageName} className="hero-image" />
                <div className="weapon-identification">
                  <span className="category-tag">Warframe · R{warframeRank}</span>
                  <h2>{frame.name}</h2>
                  <p>{frame.passiveDescription?.replace(/\|[A-Z_]+\|/g, '?') ?? 'Warframe'}</p>
                </div>
              </div>

              <div className="section-rule build-section-heading"><span>AURA · EXILUS</span><span>SLOTS ESPECIAIS</span></div>
              <div className="build-slot-grid special-slot-grid">
                {renderSlot(modSlots[auraSlotIndex], auraSlotIndex)}
                {renderSlot(modSlots[exilusSlotIndex], exilusSlotIndex)}
              </div>

              <div className="section-rule build-section-heading"><span>MODS DA BUILD</span><span>{normalSlots.filter((slot) => slot.mod).length} / 8</span></div>
              <div className="build-slot-grid">{normalSlots.map((slot) => renderSlot(slot, slot.index))}</div>

              <div className="section-rule lower-rule"><span>ARCANES</span><span>SÓ EFEITOS FIXOS ENTRAM NO CÁLCULO</span></div>
              <div className="arcane-grid">{renderArcane(0)}{renderArcane(1)}</div>

              <div className="section-rule lower-rule"><span>HABILIDADES</span><span>EFEITO DOS MODS</span></div>
              <div className="ability-list">
                {frame.abilities.map((ability, index) => (
                  <article className="ability-card" key={ability.uniqueName}>
                    <ItemImage name={ability.name} imageName={ability.imageName} />
                    <div>
                      <strong>{index + 1}. {ability.name}</strong>
                      <p>{ability.description}</p>
                      <div className="ability-scaling">
                        <span>Força <b>{formatPercent(stats.strength)}</b></span>
                        <span>Duração <b>{formatPercent(stats.duration)}</b></span>
                        <span>Alcance <b>{formatPercent(stats.range)}</b></span>
                        <span>Custo <b>{formatPercent(stats.energyCostMultiplier)}</b></span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="build-code-section">
                <div className="section-rule"><span>GUARDAR BUILD</span><span>BIBLIOTECA</span></div>
                <form className="build-code-controls" onSubmit={(event) => { event.preventDefault(); save() }}>
                  <input aria-label="Nome da build" value={saveName} onChange={(event) => setSaveName(event.target.value)} placeholder={`Nome da build, ex.: ${frame.name} força`} maxLength={60} />
                  <button type="submit" disabled={!saveName.trim() || saving}><Save size={14} />{saving ? 'A guardar...' : 'Guardar na biblioteca'}</button>
                  <button type="button" className="command-button" onClick={copyCode}><Copy size={14} />Copiar código</button>
                </form>
                {feedback && <small className="code-feedback" role="status">{feedback}</small>}
              </div>

              {stats.ignoredEffects.length ? (
                <p className="raw-data-note">Efeitos condicionais ou não suportados ficam fora do cálculo: {stats.ignoredEffects.join(' · ')}</p>
              ) : null}
            </>
          ) : (
            <div className="detail-empty">
              <span className="eyebrow">SELECCIONAR WARFRAME</span>
              <h2>{catalogLoading ? 'A carregar.' : 'Escolha um Warframe.'}</h2>
              <p>Os stats no ranque 30 e o efeito dos mods aparecem aqui.</p>
            </div>
          )}
        </section>

        <aside className="panel stats-panel">
          <div className="panel-heading">
            <div className="panel-title-wrap"><span className="panel-index mod-index">B</span><h2>Estatísticas</h2></div>
          </div>
          {frame && stats ? (
            <>
              <div className="reference-dps">
                <span>FORÇA DE HABILIDADE</span>
                <strong>{formatPercent(stats.strength)}</strong>
                <small>Duração {formatPercent(stats.duration)} · Alcance {formatPercent(stats.range)} · Eficiência {formatPercent(stats.efficiency)}</small>
              </div>
              <div className="side-stats-grid">
                <Stat icon={Heart} label="Vida" value={formatNumber(stats.health, 0)} />
                <Stat icon={Shield} label="Escudo" value={formatNumber(stats.shield, 0)} />
                <Stat icon={Activity} label="Armadura" value={formatNumber(stats.armor, 0)} />
                <Stat icon={Zap} label="Energia" value={formatNumber(stats.energy, 0)} />
                <Stat icon={Sparkles} label="Duração" value={formatPercent(stats.duration)} />
                <Stat icon={Gauge} label="Alcance" value={formatPercent(stats.range)} />
                <Stat icon={Zap} label="Eficiência" value={formatPercent(stats.efficiency)} />
                <Stat icon={Activity} label="Custo de energia" value={formatPercent(stats.energyCostMultiplier)} />
              </div>
            </>
          ) : (
            <EmptyState title="Escolha um Warframe" detail="As estatísticas calculadas aparecem aqui." />
          )}
        </aside>
      </section>

      {pickerSlot !== null && frame && (
        <div className="picker-backdrop" onClick={(event) => event.target === event.currentTarget && setPickerSlot(null)}>
          <section className="mod-picker" role="dialog" aria-modal="true" aria-labelledby="frame-mod-picker-title">
            <header className="picker-header">
              <div><span className="eyebrow">{frame.name.toLocaleUpperCase('pt-PT')} · {slotLabels[slotKindAt(pickerSlot)] ?? `SLOT ${pickerSlot + 1}`}</span><h2 id="frame-mod-picker-title">Adicionar mod</h2></div>
              <button type="button" className="picker-close" onClick={() => setPickerSlot(null)} aria-label="Fechar selector de mods"><X size={18} /></button>
            </header>
            <label className="search-box picker-search">
              <Search size={16} aria-hidden="true" />
              <input value={modQuery} onChange={(event) => setModQuery(event.target.value)} placeholder="Pesquisar mods compatíveis..." aria-label="Pesquisar mods compatíveis" autoFocus />
            </label>
            <div className="list-heading"><span>MODS COMPATÍVEIS</span><span>{pickerMods.length}</span></div>
            <div className="mod-picker-list">
              {pickerMods.length ? pickerMods.slice(0, 200).map((mod: ModRecord) => (
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
