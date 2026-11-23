import { describe, expect, it } from 'vitest'
import { adaptiveThreshold } from './ocr'

describe('adaptiveThreshold', () => {
  it('turns light text black on both dark and light backgrounds', () => {
    // 60×4: metade esquerda escura (40) e metade direita clara (190), com um "traço de texto"
    // 50 pontos mais claro em cada metade.
    const width = 60
    const height = 4
    const luminance = new Float32Array(width * height)
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const background = x < 30 ? 40 : 190
        const isText = x === 10 || x === 45
        luminance[y * width + x] = background + (isText ? 50 : 0)
      }
    }
    const output = adaptiveThreshold(luminance, width, height, 4, 18)
    expect(output[10]).toBe(0)
    expect(output[45]).toBe(0)
    expect(output[5]).toBe(255)
    expect(output[50]).toBe(255)
  })
})
