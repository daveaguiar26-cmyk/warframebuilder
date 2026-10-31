import { useMemo } from 'react'
import {
  Activity,
  ArrowUpRight,
  Boxes,
  CircleHelp,
  Crosshair,
  Database,
  Filter,
  Layers3,
  Search,
  Shield,
  Swords,
  Zap,
} from 'lucide-react'
import catalogJson from './data/catalog.json'
import { searchItems } from './lib/search'
import { useCatalogStore, type WeaponFilter } from './store/useCatalogStore'
import type { CatalogData, ModRecord, WeaponRecord } from './types'

const catalog = catalogJson as CatalogData

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

function ModRow({ mod, active, onSelect }: { mod: ModRecord; active: boolean; onSelect: () => void }) {
  return (
    <button className={`catalog-row mod-row ${active ? 'is-selected' : ''}`} onClick={onSelect} type="button">
      <ItemImage name={mod.name} imageName={mod.imageName} />
      <span className="row-copy">
        <span className="row-title">{mod.name}</span>
        <span className="row-meta">{mod.type ?? 'Mod'} · {mod.polarity}</span>
      </span>
      <span className="drain-tag">{mod.baseDrain}</span>
    </button>
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
  const {
    weaponFilter,
    weaponQuery,
    modQuery,
    selectedWeaponId,
    selectedModId,
    setWeaponFilter,
    setWeaponQuery,
    setModQuery,
    selectWeapon,
    selectMod,
  } = useCatalogStore()

  const weapons = useMemo(() => {
    const matching = searchItems(catalog.weapons, weaponQuery)
    return matching.filter((weapon) => weaponFilter === 'All' || weapon.category === weaponFilter)
  }, [weaponFilter, weaponQuery])

  const mods = useMemo(() => searchItems(catalog.mods, modQuery), [modQuery])
  const selectedWeapon = catalog.weapons.find((weapon) => weapon.uniqueName === selectedWeaponId)
  const selectedMod = catalog.mods.find((mod) => mod.uniqueName === selectedModId)
  const isEmpty = catalog.weapons.length === 0 && catalog.mods.length === 0
  const updatedLabel = catalog.generatedAt
    ? new Intl.DateTimeFormat('pt-PT', { dateStyle: 'medium' }).format(new Date(catalog.generatedAt))
    : 'por actualizar'

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
          <span className={`data-indicator ${isEmpty ? 'is-waiting' : ''}`} />
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

          <div className="list-heading"><span>ARMAS DISPONÍVEIS</span><span>{weapons.length}</span></div>
          <div className="weapon-list">
            {weapons.length ? weapons.slice(0, 200).map((weapon) => (
              <WeaponRow
                key={weapon.uniqueName}
                weapon={weapon}
                active={weapon.uniqueName === selectedWeaponId}
                onSelect={() => selectWeapon(weapon.uniqueName)}
              />
            )) : isEmpty ? (
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

              <div className="section-rule"><span>ESTATÍSTICAS BASE</span><span>SEM MODS</span></div>
              <div className="stats-grid">
                <Stat icon={Zap} label="Dano base" value={formatNumber(selectedWeapon.totalDamage)} />
                <Stat icon={Crosshair} label="Chance crítica" value={formatPercent(selectedWeapon.criticalChance)} />
                <Stat icon={Activity} label="Mult. crítico" value={selectedWeapon.criticalMultiplier === undefined ? '—' : `${formatNumber(selectedWeapon.criticalMultiplier)}×`} />
                <Stat icon={CircleHelp} label="Prob. de estado" value={formatPercent(selectedWeapon.statusChance)} />
                <Stat icon={Swords} label="Cadência" value={formatNumber(selectedWeapon.fireRate)} />
                <Stat icon={Layers3} label="Multishot" value={formatNumber(selectedWeapon.multishot)} />
              </div>

              <div className="section-rule lower-rule"><span>DETALHES</span><span>FONTE: DADOS DO JOGO</span></div>
              <div className="detail-facts">
                <span>Carregador <b>{formatNumber(selectedWeapon.magazineSize, 0)}</b></span>
                <span>Recarga <b>{selectedWeapon.reloadTime === undefined ? '—' : `${formatNumber(selectedWeapon.reloadTime)} s`}</b></span>
                <span>Polaridades de fábrica <b>{selectedWeapon.polarities?.length ? selectedWeapon.polarities.join(' · ') : 'Nenhuma'}</b></span>
              </div>
              <p className="raw-data-note">Valores base publicados no catálogo. Nenhum cálculo de dano é aplicado nesta fase.</p>
            </>
          ) : (
            <div className="detail-empty">
              <div className="reticle"><Crosshair size={42} strokeWidth={1.2} /></div>
              <span className="eyebrow">SELECCIONAR EQUIPAMENTO</span>
              <h2>{isEmpty ? 'A preparar o arsenal.' : 'Escolha uma arma.'}</h2>
              <p>{isEmpty ? 'Depois de actualizar os dados, pesquise e abra qualquer arma para consultar os seus valores base.' : 'Os valores base e os detalhes da arma aparecem aqui.'}</p>
              <div className="detail-hint"><span>SEM SIMULADOR</span><i />SEM CÁLCULOS NESTA FASE</div>
            </div>
          )}
        </section>

        <aside className="panel mods-panel">
          <div className="panel-heading">
            <div className="panel-title-wrap"><span className="panel-index mod-index">B</span><h2>Mods</h2></div>
            <span className="panel-count">{mods.length.toLocaleString('pt-PT')}</span>
          </div>
          <label className="search-box">
            <Search size={16} aria-hidden="true" />
            <input
              value={modQuery}
              onChange={(event) => setModQuery(event.target.value)}
              placeholder="Pesquisar mods..."
              aria-label="Pesquisar mods"
            />
            <kbd>/</kbd>
          </label>
          <div className="list-heading"><span>MODS DISPONÍVEIS</span><span>{mods.length}</span></div>
          <div className="mod-list">
            {mods.length ? mods.slice(0, 200).map((mod) => (
              <ModRow
                key={mod.uniqueName}
                mod={mod}
                active={mod.uniqueName === selectedModId}
                onSelect={() => selectMod(mod.uniqueName === selectedModId ? null : mod.uniqueName)}
              />
            )) : isEmpty ? (
              <EmptyState title="Catálogo vazio" detail="Os mods ficam disponíveis depois de gerar os dados locais." />
            ) : (
              <EmptyState title="Sem resultados" detail="Tente pesquisar por nome, categoria ou efeito." />
            )}
          </div>
          {mods.length > 200 && <p className="list-limit">A mostrar 200 de {mods.length} resultados. Refine a pesquisa.</p>}
          {selectedMod && (
            <div className="mod-inspector">
              <div className="inspector-heading"><span>MOD SELECCIONADO</span><button type="button" onClick={() => selectMod(null)} aria-label="Fechar detalhes do mod">×</button></div>
              <strong>{selectedMod.name}</strong>
              <p>{selectedMod.description || selectedMod.type || 'Sem descrição nos dados locais.'}</p>
              {selectedMod.levelStats?.at(-1)?.stats?.length ? <small>{selectedMod.levelStats.at(-1)?.stats?.join(' · ')}</small> : null}
              <div className="mod-meta-line"><span>Polaridade <b>{selectedMod.polarity}</b></span><span>Ranque máx. <b>{selectedMod.fusionLimit}</b></span></div>
            </div>
          )}
        </aside>
      </section>

      <footer className="statusbar">
        <span><span className={`status-dot ${isEmpty ? 'is-waiting' : ''}`} />CATÁLOGO {isEmpty ? 'POR GERAR' : 'PRONTO'}</span>
        <span><Database size={13} />{catalog.source} <b>·</b> ficheiros estáticos</span>
        <span className="status-right"><a href="https://wiki.warframe.com/w/Mod" target="_blank" rel="noreferrer">Wiki oficial <ArrowUpRight size={12} /></a></span>
      </footer>
    </main>
  )
}
