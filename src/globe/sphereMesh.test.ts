import { describe, expect, it } from 'vitest'
import { geoArea, geoContains, geoDistance } from 'd3-geo'
import { feature } from 'topojson-client'
import type { GeometryCollection, Topology } from 'topojson-specification'
import type { MultiPolygon, Polygon, Position } from 'geojson'
import worldData from 'world-atlas/countries-50m.json'
import { MAX_EDGE, densifyRing, midpoint, toLngLat, toUnitVector, triangulatePolygon, type Vec3 } from './sphereMesh'

// Raw shapes straight from the map data, including Antarctica
const topology = worldData as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>
const shapes = feature(topology, topology.objects.countries).features
function polygonsOf(name: string): Position[][][] {
  const geometry = shapes.find((f) => f.properties.name === name)!.geometry as Polygon | MultiPolygon
  return geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
}
const largest = (name: string) =>
  polygonsOf(name).reduce((a, b) =>
    geoArea({ type: 'Polygon', coordinates: b }) > geoArea({ type: 'Polygon', coordinates: a }) ? b : a,
  )

/** Spherical area of a flat triangle's footprint, via its three corners */
function triangleArea(a: Vec3, b: Vec3, c: Vec3) {
  const ring = [toLngLat(a), toLngLat(b), toLngLat(c), toLngLat(a)]
  const area = geoArea({ type: 'Polygon', coordinates: [ring] })
  return Math.min(area, 4 * Math.PI - area) // winding-independent
}

function check(rings: Position[][]) {
  const { vertices, indices } = triangulatePolygon(rings)
  const polygon = { type: 'Polygon' as const, coordinates: rings }
  let outside = 0
  let longest = 0
  let inward = 0
  let area = 0
  for (let i = 0; i < indices.length; i += 3) {
    const [a, b, c] = [vertices[indices[i]], vertices[indices[i + 1]], vertices[indices[i + 2]]]
    const center = midpoint(midpoint(a, b), c)
    if (!geoContains(polygon, toLngLat(center))) outside++
    for (const [p, q] of [[a, b], [b, c], [c, a]]) longest = Math.max(longest, geoDistance(toLngLat(p), toLngLat(q)))
    const normal = [
      (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]),
      (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]),
      (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]),
    ]
    if (normal[0] * a[0] + normal[1] * a[1] + normal[2] * a[2] < 0) inward++
    area += triangleArea(a, b, c)
  }
  return { triangles: indices.length / 3, outside, longest, inward, area, expectedArea: geoArea(polygon) }
}

describe('toUnitVector / toLngLat', () => {
  it.each([
    [0, 0],
    [12.5, 55.7],
    [-170, -45],
    [179.9, 10],
  ])('round-trips %s, %s', (lng, lat) => {
    const [lng2, lat2] = toLngLat(toUnitVector([lng, lat]))
    expect(lng2).toBeCloseTo(lng, 6)
    expect(lat2).toBeCloseTo(lat, 6)
  })

  it('puts lng 0 on +z and the north pole on +y, like three-globe', () => {
    expect(toUnitVector([0, 0]).map((v) => Math.round(v))).toEqual([0, 0, 1])
    expect(toUnitVector([0, 90])[1]).toBeCloseTo(1)
  })
})

describe('triangulatePolygon', () => {
  it.each([
    ['Greenland', largest('Greenland')],
    ['Russia, across the antimeridian', largest('Russia')],
    ['Canada', largest('Canada')],
    ['Chile, long and thin', largest('Chile')],
    ['South Africa, with Lesotho as a hole', largest('South Africa')],
  ])('covers %s exactly, with short edges, facing outwards', (_, rings) => {
    const result = check(rings)
    expect(result.outside).toBe(0)
    expect(result.inward).toBe(0)
    expect(result.longest).toBeLessThanOrEqual(MAX_EDGE + 1e-9)
    expect(result.area / result.expectedArea).toBeCloseTo(1, 2)
  })

  it('covers Antarctica around the pole', () => {
    const result = check(largest('Antarctica'))
    expect(result.outside).toBeLessThan(result.triangles * 0.001) // a sliver at the pole seam at most
    expect(result.inward).toBe(0)
    expect(result.area / result.expectedArea).toBeCloseTo(1, 2)
  })

  it('leaves the hole for Lesotho uncovered', () => {
    const { vertices, indices } = triangulatePolygon(largest('South Africa'))
    const maseru = toUnitVector([27.48, -29.31])
    for (let i = 0; i < indices.length; i += 3) {
      const center = midpoint(midpoint(vertices[indices[i]], vertices[indices[i + 1]]), vertices[indices[i + 2]])
      expect(geoDistance(toLngLat(center), toLngLat(maseru))).toBeGreaterThan(0.001)
    }
  })

  it('handles every shape in the map quickly', () => {
    const start = performance.now()
    let triangles = 0
    for (const shape of shapes) {
      const geometry = shape.geometry as Polygon | MultiPolygon
      const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
      for (const rings of polygons) triangles += triangulatePolygon(rings).indices.length / 3
    }
    expect(performance.now() - start).toBeLessThan(3000)
    expect(triangles).toBeGreaterThan(50_000)
  })
})

describe('densifyRing', () => {
  it('adds points so no segment is longer than the limit', () => {
    const ring: Position[] = [[0, 0], [20, 0], [20, 10], [0, 0]]
    const points = densifyRing(ring)
    for (let i = 0; i < points.length; i++) {
      const next = points[(i + 1) % points.length]
      expect(geoDistance(toLngLat(points[i]), toLngLat(next))).toBeLessThanOrEqual(MAX_EDGE + 1e-9)
    }
    expect(points.length).toBeGreaterThan(10)
  })

  it('keeps short rings as they are, without the closing point', () => {
    expect(densifyRing([[0, 0], [1, 0], [1, 1], [0, 0]])).toHaveLength(3)
  })
})
