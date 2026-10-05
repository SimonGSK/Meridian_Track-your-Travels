import { describe, expect, it } from 'vitest'
import {
  DRAG_THRESHOLD_PX,
  approach,
  fitAltitude,
  flightAltitude,
  flightDuration,
  isClick,
  spotsOfRoute,
  viewOf,
} from './interaction'

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

describe('viewOf', () => {
  const COPENHAGEN = { lat: 55.6, lng: 12.6 }
  const PARIS = { lat: 49, lng: 2.5 }
  const SEOUL = { lat: 37.5, lng: 126.4 }
  const TOKYO = { lat: 35.8, lng: 140.4 }

  it('looks from the middle of a route, wide enough for it', () => {
    const view = viewOf(spotsOfRoute({ from: COPENHAGEN, to: PARIS }))
    expect(view.lat).toBeCloseTo(52.5, 0)
    expect(view.lng).toBeCloseTo(7.3, 0)
    // About 10° of arc from end to end, with some room
    expect(view.extent).toBeGreaterThan(10)
    expect(view.extent).toBeLessThan(16)
  })

  it('looks from the middle of a whole trip', () => {
    const legs = [
      { from: COPENHAGEN, to: SEOUL },
      { from: SEOUL, to: TOKYO },
      { from: TOKYO, to: COPENHAGEN },
    ]
    const view = viewOf(legs.flatMap(spotsOfRoute))
    // Over Siberia, where the routes to Asia go
    expect(view.lng).toBeGreaterThan(60)
    expect(view.lng).toBeLessThan(125)
    expect(view.extent).toBeGreaterThan(80)
  })

  it('makes room for how far a place reaches', () => {
    const view = viewOf([{ ...PARIS, radius: 5 }])
    expect(view.lat).toBeCloseTo(PARIS.lat)
    expect(view.lng).toBeCloseTo(PARIS.lng)
    expect(view.extent).toBeCloseTo(13) // 5° each way, with some room
    expect(viewOf([PARIS]).extent).toBeCloseTo(0, 5)
  })

  it('looks from the first place, as far out as it goes, when places all around the world have no middle', () => {
    expect(viewOf([{ lat: 0, lng: 0 }, { lat: 0, lng: 180 }])).toEqual({ lat: 0, lng: 0, extent: 360 })
  })
})

describe('spotsOfRoute', () => {
  it('has the ends of a route and its middle', () => {
    const [from, middle, to] = spotsOfRoute({ from: { lat: 0, lng: 0 }, to: { lat: 0, lng: 90 } })
    expect(from).toEqual({ lat: 0, lng: 0 })
    expect(middle.lat).toBeCloseTo(0)
    expect(middle.lng).toBeCloseTo(45)
    expect(to).toEqual({ lat: 0, lng: 90 })
  })
})
