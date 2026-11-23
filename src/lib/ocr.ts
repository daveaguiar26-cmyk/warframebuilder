/**
 * OCR no browser com Tesseract.js, carregado do CDN só quando é preciso
 * (não entra no bundle da aplicação). Os dados do idioma inglês também vêm do CDN.
 */
const tesseractUrl = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.esm.min.js'

interface TesseractWorker {
  setParameters: (parameters: Record<string, string>) => Promise<unknown>
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

/**
 * Prepara a captura para o OCR: amplia (o texto dos cartões é pequeno), passa a cinzento,
 * inverte (texto claro em fundo escuro → texto escuro em fundo claro) e estica o contraste.
 */
export async function preprocessImage(image: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(image)
  const scale = Math.min(3, Math.max(1, 2600 / bitmap.width))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const context = canvas.getContext('2d')
  if (!context) return image
  context.imageSmoothingQuality = 'high'
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
  const data = pixels.data
  for (let index = 0; index < data.length; index += 4) {
    const luminance = 0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2]
    // Texto dos cartões é claro: acima de ~150 fica preto, o resto vai para branco.
    const value = Math.max(0, Math.min(255, 255 - (luminance - 110) * 2.2))
    data[index] = value
    data[index + 1] = value
    data[index + 2] = value
  }
  context.putImageData(pixels, 0, 0)

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob ?? image), 'image/png'))
}

export async function recognizeText(image: Blob, onProgress?: (status: string, progress: number) => void): Promise<string> {
  // O build ESM pode expor createWorker directamente ou dentro de "default".
  const loaded = await import(/* @vite-ignore */ tesseractUrl) as Partial<TesseractModule> & { default?: TesseractModule }
  const tesseract: TesseractModule | undefined = typeof loaded.createWorker === 'function'
    ? { createWorker: loaded.createWorker }
    : loaded.default
  if (!tesseract) throw new Error('Não foi possível carregar o leitor de texto.')

  let pass = 0
  const worker = await tesseract.createWorker('eng', 1, {
    // Duas leituras: cada uma conta metade da barra de progresso.
    logger: (message) => onProgress?.(message.status, message.status === 'recognizing text' ? (pass + message.progress) / 2 : message.progress),
  })
  try {
    // Modo 11: texto disperso, sem assumir parágrafos (os cartões estão espalhados).
    await worker.setParameters({ tessedit_pageseg_mode: '11' })
    const processed = await preprocessImage(image)
    const first = await worker.recognize(processed)
    pass = 1
    const second = await worker.recognize(image)
    return `${first.data.text}\n${second.data.text}`
  } finally {
    await worker.terminate()
  }
}
