import { useCallback, useEffect, useMemo, useState } from 'react'
import { ImageUp, Trash2, Wand2, X } from 'lucide-react'
import { detectBuildFromText, type DetectedItem, type DetectedKind, type ImportCatalog } from '../lib/imageImport'
import { recognizeText } from '../lib/ocr'
import type { ModRecord } from '../types'

export interface ImageImportSelection {
  item: DetectedItem
  mods: Array<{ mod: ModRecord; rank: number }>
}

interface ImageImportDialogProps {
  catalog: ImportCatalog
  onApply: (selection: ImageImportSelection) => void
  onClose: () => void
}

const kindLabels: Record<DetectedKind, string> = { arma: 'Arma', warframe: 'Warframe', companheiro: 'Companheiro' }
const maxModsByKind: Record<DetectedKind, number> = { arma: 10, warframe: 10, companheiro: 19 }

type Phase = 'empty' | 'reading' | 'done' | 'error'

export function ImageImportDialog({ catalog, onApply, onClose }: ImageImportDialogProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('empty')
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [itemId, setItemId] = useState('')
  const [mods, setMods] = useState<Array<{ mod: ModRecord; rank: number }>>([])

  const items = useMemo<DetectedItem[]>(() => [
    ...catalog.warframes.map((entry) => ({ kind: 'warframe' as const, id: entry.uniqueName, name: entry.name })),
    ...catalog.weapons.filter((entry) => entry.type !== 'Companion Weapon').map((entry) => ({ kind: 'arma' as const, id: entry.uniqueName, name: entry.name })),
    ...catalog.companions.map((entry) => ({ kind: 'companheiro' as const, id: entry.uniqueName, name: entry.name })),
  ], [catalog])
  const item = items.find((entry) => entry.id === itemId)

  useEffect(() => () => { if (imageUrl) URL.revokeObjectURL(imageUrl) }, [imageUrl])

  const readImage = useCallback(async (file: File | Blob) => {
    if (!file.type.startsWith('image/')) {
      setPhase('error')
      setMessage('Só são aceites imagens (PNG, JPG, WebP...).')
      return
    }
    setImageUrl(URL.createObjectURL(file))
    setPhase('reading')
    setProgress(0)
    setMessage('A carregar o leitor de texto...')
    try {
      const text = await recognizeText(file, (status, value) => {
        setMessage(status === 'recognizing text' ? 'A ler a imagem...' : 'A preparar o leitor de texto...')
        setProgress(value)
      })
      const result = detectBuildFromText(text, catalog)
      setItemId(result.item?.id ?? '')
      setMods(result.mods.map((mod) => ({ mod, rank: mod.fusionLimit })))
      setPhase('done')
      setMessage(result.mods.length
        ? `Foram encontrados ${result.mods.length} mods. Confirme o item e os ranques antes de aplicar.`
        : 'Não foi encontrado nenhum mod. Tente uma captura maior e mais nítida do ecrã de mods.')
    } catch (error) {
      setPhase('error')
      setMessage(error instanceof Error ? error.message : 'Não foi possível ler a imagem.')
    }
  }, [catalog])

  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      const file = [...(event.clipboardData?.items ?? [])].find((entry) => entry.type.startsWith('image/'))?.getAsFile()
      if (file) {
        event.preventDefault()
        void readImage(file)
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [readImage])

  const maxMods = item ? maxModsByKind[item.kind] : 10

  return (
    <div className="picker-backdrop" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <section className="mod-picker build-code-dialog image-import-dialog" role="dialog" aria-modal="true" aria-labelledby="image-import-title">
        <header className="picker-header">
          <div><span className="eyebrow">IMPORTAR · CAPTURA DO JOGO</span><h2 id="image-import-title">Build a partir de imagem</h2></div>
          <button type="button" className="picker-close" onClick={onClose} aria-label="Fechar importação por imagem"><X size={18} /></button>
        </header>

        <label
          className={`image-drop ${phase === 'reading' ? 'is-busy' : ''}`}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault()
            const file = event.dataTransfer.files[0]
            if (file) void readImage(file)
          }}
        >
          {imageUrl ? <img src={imageUrl} alt="Captura carregada" /> : (
            <>
              <ImageUp size={26} strokeWidth={1.5} />
              <strong>Cole (Ctrl+V), arraste ou escolha uma imagem</strong>
              <span>Captura do ecrã de mods do Arsenal. Só imagens.</span>
            </>
          )}
          <input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) void readImage(file) }} disabled={phase === 'reading'} />
        </label>

        {phase === 'reading' && (
          <div className="capacity-track" role="progressbar" aria-label="Progresso da leitura" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
            <span style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        )}
        {message && <p className={phase === 'error' ? 'import-code-error' : 'arcane-effect'} role="status">{message}</p>}

        {phase === 'done' && (
          <>
            <label className="import-code-label" htmlFor="image-import-item">Item</label>
            <select id="image-import-item" value={itemId} onChange={(event) => setItemId(event.target.value)}>
              <option value="">Escolha o item...</option>
              {(['warframe', 'arma', 'companheiro'] as const).map((kind) => (
                <optgroup key={kind} label={kindLabels[kind]}>
                  {items.filter((entry) => entry.kind === kind).map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
                </optgroup>
              ))}
            </select>

            <div className="list-heading"><span>MODS ENCONTRADOS</span><span>{mods.length} / {maxMods}</span></div>
            <div className="image-import-mods">
              {mods.map(({ mod, rank }, index) => (
                <div className="image-import-mod" key={mod.uniqueName}>
                  <span>{mod.name}<small>{mod.type}</small></span>
                  <select value={rank} onChange={(event) => setMods(mods.map((entry, current) => current === index ? { ...entry, rank: Number(event.target.value) } : entry))} aria-label={`Ranque de ${mod.name}`}>
                    {Array.from({ length: mod.fusionLimit + 1 }, (_, value) => <option key={value} value={value}>R{value}</option>)}
                  </select>
                  <button type="button" className="slot-remove-button" onClick={() => setMods(mods.filter((_, current) => current !== index))} aria-label={`Remover ${mod.name}`}><Trash2 size={12} /></button>
                </div>
              ))}
            </div>
            {item?.kind === 'arma' && mods.some(({ mod }) => mod.type === 'Stance Mod') && (
              <p className="raw-data-note">O editor de armas ainda não tem slot de Stance nem de Exilus: a Stance e o Exilus (o primeiro mod da linha de cima) não são aplicados.</p>
            )}
            {mods.length > maxMods && <p className="import-code-error">Há mais mods do que slots. Remova os que foram lidos por engano.</p>}
            <p className="raw-data-note">Os ranques assumem o máximo e as polaridades ficam as de fábrica: a imagem não permite lê-los com segurança.</p>
          </>
        )}

        <div className="import-code-actions">
          <button className="command-button" type="button" onClick={onClose}>Cancelar</button>
          <button
            className="install-code-button"
            type="button"
            disabled={phase !== 'done' || !item || mods.length === 0}
            onClick={() => item && onApply({ item, mods: mods.slice(0, maxModsByKind[item.kind]) })}
          >
            <Wand2 size={14} />Aplicar build
          </button>
        </div>
      </section>
    </div>
  )
}
