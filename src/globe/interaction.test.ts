import { describe, expect, it } from 'vitest'
import { DRAG_THRESHOLD_PX, approach, fitAltitude, flightAltitude, flightDuration, isClick } from './interaction'

describe('isClick', () => {
  it('treats a press and release at the same spot as a click', () => {
    expect(isClick({ x: 10, y: 10 }, { x: 10, y: 10 })).toBe(true)
  })

  it('tolerates a little jitter', () => {
    expect(isClick({ x: 10, y: 10 }, { x: 13, y: 14 })).toBe(true)
  })

  it('treats larger movement as a drag', () => {
    expect(isClick({ x: 10, y: 10 }, { x: 10 + DRAG_THRESHOLD_PX + 1, y: 10 })).toBe(false)
  })
})

describe('flightDuration', () => {
  const copenhagen = { lat: 55.7, lng: 12.6 }

  it('is quick for short hops', () => {
    expect(flightDuration(copenhagen, { lat: 59.3, lng: 18.1 })).toBeLessThan(700)
  })

  it('grows with distance', () => {
    const toBerlin = flightDuration(copenhagen, { lat: 52.5, lng: 13.4 })
    const toTokyo = flightDuration(copenhagen, { lat: 35.7, lng: 139.7 })
    expect(toTokyo).toBeGreaterThan(toBerlin)
  })

  it('is capped for the far side of the world', () => {
    expect(flightDuration(copenhagen, { lat: -55.7, lng: -167.4 })).toBe(1600)
  })
})

describe('flightAltitude', () => {
  it('keeps the current zoom when in range', () => {
    expect(flightAltitude(1)).toBe(1)
  })

  it('zooms in when far away and out when very close', () => {
    expect(flightAltitude(4)).toBe(1.8)
    expect(flightAltitude(0.1)).toBe(0.4)
  })
})

describe('fitAltitude', () => {
  it('zooms out further for bigger countries', () => {
    expect(fitAltitude(12)).toBeGreaterThan(fitAltitude(6))
  })

  it('stays within sensible limits', () => {
    expect(fitAltitude(0.5)).toBe(0.4)
    expect(fitAltitude(170)).toBe(1.8)
  })
})

describe('approach', () => {
  it('moves part of the way to the target', () => {
    expect(approach(0, 1, 0.25)).toBe(0.25)
    expect(approach(1, 0, 0.5)).toBe(0.5)
  })

  it('snaps to the target when close enough', () => {
    expect(approach(0.9995, 1, 0.1)).toBe(1)
  })
})
