import { describe, expect, it } from 'vitest'
import { feature } from 'topojson-client'
import { geoArea, geoContains } from 'd3-geo'
import type { GeometryCollection, Topology } from 'topojson-specification'
import type { Feature, MultiPolygon, Polygon } from 'geojson'
import worldData from 'world-atlas/countries-50m.json'
import { BORDER_LATITUDE, clipRing, fixWesternSahara, westernSaharaBorder } from './westernSahara'

type Shape = Feature<Polygon | MultiPolygon, { name: string }>
const topology = worldData as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>
const raw = feature(topology, topology.objects.countries).features as Shape[]
const fixed = fixWesternSahara(raw)
const byName = (shapes: Shape[], name: string) => shapes.find((s) => s.properties.name === name)!
const km2 = (s: Shape) => (geoArea(s) / (4 * Math.PI)) * 510_072_000

describe('clipRing', () => {
  const square = [[0, 0], [0, 10], [10, 10], [10, 0], [0, 0]]

  it('keeps the part north of a latitude', () => {
    const north = clipRing(square, 4, 'north')
    expect(Math.min(...north.map(([, lat]) => lat))).toBe(4)
    expect(Math.max(...north.map(([, lat]) => lat))).toBe(10)
    expect(north[0]).toEqual(north[north.length - 1])
  })

  it('keeps the part south of a latitude', () => {
    const south = clipRing(square, 4, 'south')
    expect(Math.max(...south.map(([, lat]) => lat))).toBe(4)
  })

  it('returns nothing when the ring is entirely on the other side', () => {
    expect(clipRing(square, 20, 'north')).toEqual([])
  })
})

describe('fixWesternSahara', () => {
  const ma = byName(fixed, 'Morocco')
  const ws = byName(fixed, 'W. Sahara')

  it.each([
    ['inland from Dakhla', -15, 23, 'W. Sahara'],
    ['Laayoune', -13.2, 27.15, 'W. Sahara'],
    ['the inland strip', -12, 26, 'W. Sahara'],
    ['just north of the border', -11.5, 28.3, 'Morocco'],
    ['Marrakesh', -8, 31.63, 'Morocco'],
  ])('puts %s in the right place', (_, lng, lat, expected) => {
    expect(geoContains(ma, [lng, lat])).toBe(expected === 'Morocco')
    expect(geoContains(ws, [lng, lat])).toBe(expected === 'W. Sahara')
  })

  it('gives both roughly their real sizes', () => {
    expect(km2(ws)).toBeGreaterThan(240_000) // 266,000 km² in reality
    expect(km2(ws)).toBeLessThan(290_000)
    expect(km2(ma)).toBeGreaterThan(380_000) // 446,550 km²
    expect(km2(ma)).toBeLessThan(470_000)
    expect(km2(ma) + km2(ws)).toBeCloseTo(km2(byName(raw, 'Morocco')) + km2(byName(raw, 'W. Sahara')), -3)
  })

  it('leaves Morocco entirely north of the border', () => {
    const [outline] = (ma.geometry as Polygon).coordinates
    expect(Math.min(...outline.map(([, lat]) => lat))).toBeGreaterThanOrEqual(BORDER_LATITUDE)
  })

  it('leaves other countries alone', () => {
    expect(byName(fixed, 'Algeria')).toBe(byName(raw, 'Algeria'))
  })
})

describe('westernSaharaBorder', () => {
  it('runs along 27°40′N from the coast to Algeria', () => {
    const line = westernSaharaBorder(fixed)!
    const lngs = line.coordinates.map(([lng]) => lng)
    expect(Math.min(...lngs)).toBeCloseTo(-13.16, 1)
    expect(Math.max(...lngs)).toBeCloseTo(-8.685, 2)
    for (const [, lat] of line.coordinates) expect(lat).toBeCloseTo(27.66, 1)
  })
})
