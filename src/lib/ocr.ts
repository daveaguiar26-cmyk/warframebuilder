/**
 * OCR no browser com Tesseract.js, carregado do CDN só quando é preciso
 * (não entra no bundle da aplicação). Os dados do idioma inglês também vêm do CDN.
 */
const tesseractUrl = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.esm.min.js'

interface TesseractWorker {
  recognize: (image: Blob) => Promise<{ data: { text: string } }>
  terminate: () => Promise<unknown>
}

interface TesseractModule {
  createWorker: (
    language: string,
    oem?: number,
    options?: { logger?: (message: { status: string; progress: number }) => void },
  ) => Promise<TesseractWorker>
}

export async function recognizeText(image: Blob, onProgress?: (status: string, progress: number) => void): Promise<string> {
  const loaded = await import(/* @vite-ignore */ tesseractUrl) as TesseractModule & { default?: TesseractModule }
  const tesseract = loaded.createWorker ? loaded : loaded.default
  if (!tesseract) throw new Error('Não foi possível carregar o leitor de texto.')
  const worker = await tesseract.createWorker('eng', 1, {
    logger: (message) => onProgress?.(message.status, message.progress),
  })
  try {
    const result = await worker.recognize(image)
    return result.data.text
  } finally {
    await worker.terminate()
  }
}
