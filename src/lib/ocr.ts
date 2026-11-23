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

export type PreprocessMode = 'global' | 'adaptive'

/**
 * Prepara a captura para o OCR: amplia (o texto dos cartões é pequeno), passa a cinzento e
 * deixa o texto escuro sobre fundo branco.
 * - global: o texto claro (acima de um limite fixo) fica preto. Funciona em cartões escuros.
 * - adaptive: cada pixel é comparado com a média da zona à volta. Funciona também em cartões
 *   claros (Primed, prateados), onde o texto branco é só ligeiramente mais claro que o fundo.
 */
export async function preprocessImage(image: Blob, mode: PreprocessMode = 'global'): Promise<Blob> {
  const bitmap = await createImageBitmap(image)
  const scale = Math.min(3, Math.max(1, 2600 / bitmap.width))
  const canvas = document.createElement('canvas')
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return image
  context.imageSmoothingQuality = 'high'
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const pixels = context.getImageData(0, 0, width, height)
  const data = pixels.data
  const luminance = new Float32Array(width * height)
  for (let index = 0; index < luminance.length; index += 1) {
    luminance[index] = 0.299 * data[index * 4] + 0.587 * data[index * 4 + 1] + 0.114 * data[index * 4 + 2]
  }

  const output = mode === 'adaptive' ? adaptiveThreshold(luminance, width, height) : globalContrast(luminance)
  for (let index = 0; index < output.length; index += 1) {
    data[index * 4] = output[index]
    data[index * 4 + 1] = output[index]
    data[index * 4 + 2] = output[index]
  }
  context.putImageData(pixels, 0, 0)

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob ?? image), 'image/png'))
}

function globalContrast(luminance: Float32Array): Uint8ClampedArray {
  const output = new Uint8ClampedArray(luminance.length)
  // Texto claro (acima de ~150) fica preto, o resto vai para branco.
  for (let index = 0; index < luminance.length; index += 1) output[index] = 255 - (luminance[index] - 110) * 2.2
  return output
}

/** Limiar adaptativo com imagem integral: texto = pixel claramente mais claro que a vizinhança. */
export function adaptiveThreshold(luminance: Float32Array, width: number, height: number, radius = 18, offset = 18): Uint8ClampedArray {
  const stride = width + 1
  const integral = new Float64Array(stride * (height + 1))
  for (let y = 0; y < height; y += 1) {
    let rowSum = 0
    for (let x = 0; x < width; x += 1) {
      rowSum += luminance[y * width + x]
      integral[(y + 1) * stride + x + 1] = integral[y * stride + x + 1] + rowSum
    }
  }
  const output = new Uint8ClampedArray(width * height)
  for (let y = 0; y < height; y += 1) {
    const top = Math.max(0, y - radius)
    const bottom = Math.min(height, y + radius + 1)
    for (let x = 0; x < width; x += 1) {
      const left = Math.max(0, x - radius)
      const right = Math.min(width, x + radius + 1)
      const area = (bottom - top) * (right - left)
      const sum = integral[bottom * stride + right] - integral[top * stride + right]
        - integral[bottom * stride + left] + integral[top * stride + left]
      output[y * width + x] = luminance[y * width + x] > sum / area + offset ? 0 : 255
    }
  }
  return output
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
    // Três leituras: cada uma conta um terço da barra de progresso.
    logger: (message) => onProgress?.(message.status, message.status === 'recognizing text' ? (pass + message.progress) / 3 : message.progress),
  })
  try {
    // Modo 11: texto disperso, sem assumir parágrafos (os cartões estão espalhados).
    await worker.setParameters({ tessedit_pageseg_mode: '11' })
    // Três leituras: limiar adaptativo (cartões claros e escuros), contraste global e original.
    const texts: string[] = []
    const sources = [
      () => preprocessImage(image, 'adaptive'),
      () => preprocessImage(image, 'global'),
      async () => image,
    ]
    for (const source of sources) {
      texts.push((await worker.recognize(await source())).data.text)
      pass += 1
    }
    return texts.join('\n')
  } finally {
    await worker.terminate()
  }
}
