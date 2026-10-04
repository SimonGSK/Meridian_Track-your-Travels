import { describe, expect, it } from 'vitest'
import { subsolarPoint } from './sun'

describe('subsolarPoint', () => {
  // Declinations from the solstices and equinoxes; longitudes from the equation of time
  it.each([
    ['the June solstice', '2026-06-21T08:24:00Z', 23.44],
    ['the December solstice', '2026-12-21T20:50:00Z', -23.44],
    ['the March equinox', '2026-03-20T14:46:00Z', 0],
    ['the September equinox', '2026-09-23T00:05:00Z', 0],
  ])('is over the tropic or the equator at %s', (_, when, lat) => {
    expect(subsolarPoint(new Date(when)).lat).toBeCloseTo(lat, 1)
  })

  it.each([
    // At noon UTC the sun is over Greenwich, give or take the equation of time
    ['early November, when the sun runs 16 minutes fast', '2026-11-03T12:00:00Z', -4.1],
    ['mid February, when it runs 14 minutes slow', '2026-02-11T12:00:00Z', 3.55],
    ['mid June, when it is nearly on time', '2026-06-13T12:00:00Z', 0],
  ])('is overhead where it is noon: %s', (_, when, lng) => {
    expect(Math.abs(subsolarPoint(new Date(when)).lng - lng)).toBeLessThan(0.15)
  })

  it('moves west 15° an hour', () => {
    const noon = subsolarPoint(new Date('2026-10-04T12:00:00Z'))
    const evening = subsolarPoint(new Date('2026-10-04T18:00:00Z'))
    expect(noon.lng - evening.lng).toBeCloseTo(90, 0)
    // Past the antimeridian it comes back round to the east
    expect(subsolarPoint(new Date('2026-10-04T23:30:00Z')).lng).toBeGreaterThan(-180)
    expect(subsolarPoint(new Date('2026-10-04T00:30:00Z')).lng).toBeLessThan(180)
  })
})
