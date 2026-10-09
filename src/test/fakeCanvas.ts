import { vi } from 'vitest'

/** What a stand-in 2D canvas was asked to draw: each fill, rectangle and stroke, with the style at the time */
export type Drawing = { fills: string[]; rects: string[]; strokes: string[]; arcs: number; lines: number }

/**
 * jsdom has no canvas, so textures drawn on one (pins, planes) are skipped
 * in tests. This stands in for a 2D context and records the drawing.
 */
export function fakeCanvas() {
  const drawing: Drawing = { fills: [], rects: [], strokes: [], arcs: 0, lines: 0 }
  const context = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    beginPath() {},
    closePath() {},
    moveTo() {},
    lineTo() {
      drawing.lines++
    },
    quadraticCurveTo() {},
    arc() {
      drawing.arcs++
    },
    fill() {
      drawing.fills.push(String(this.fillStyle))
    },
    fillRect() {
      drawing.rects.push(String(this.fillStyle))
    },
    stroke() {
      drawing.strokes.push(String(this.strokeStyle))
    },
  }
  const spy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () => context as unknown as CanvasRenderingContext2D,
  )
  return { drawing, restore: () => spy.mockRestore() }
}
