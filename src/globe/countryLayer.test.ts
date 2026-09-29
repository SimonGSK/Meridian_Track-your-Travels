import { describe, expect, it } from 'vitest'
import { BufferAttribute, Color, LineSegments, Mesh, Vector3 } from 'three'
import { geoContains } from 'd3-geo'
import type { Position } from 'geojson'
import { borders, countries } from '../countries'
import { antimeridianShift, createCapGeometry, createCountryLayer } from './countryLayer'
import { COLORS } from './style'

const RADIUS = 100

/** Inverse of three-globe's polar2Cartesian */
function toLngLat({ x, y, z }: Vector3): [number, number] {
  const r = Math.hypot(x, y, z)
  const lat = 90 - (Math.acos(y / r) * 180) / Math.PI
  const lng = 90 - (Math.atan2(z, x) * 180) / Math.PI
  return [((lng + 540) % 360) - 180, lat]
}

/** Checks the center of every triangle lies inside the polygon it was built from. */
function trianglesInside(rings: Position[][]) {
  const geometry = createCapGeometry(rings, RADIUS, RADIUS * 1.01)
  const pos = geometry.attributes.position
  const index = geometry.index!
  const polygon = { type: 'Polygon' as const, coordinates: rings }
  let inside = 0
  const total = index.count / 3
  for (let i = 0; i < index.count; i += 3) {
    const center = new Vector3()
    for (let k = 0; k < 3; k++) center.add(new Vector3().fromBufferAttribute(pos, index.getX(i + k)))
    if (geoContains(polygon, toLngLat(center.divideScalar(3)))) inside++
  }
  return inside / total
}

const russia = countries.find((c) => c.properties.name === 'Russia')!
const russiaParts = russia.geometry.coordinates as Position[][][]
const russiaMainland = russiaParts.reduce((a, b) => (b[0].length > a[0].length ? b : a))

describe('antimeridianShift', () => {
  it('is 0 for polygons that do not cross 180°', () => {
    const denmark = countries.find((c) => c.properties.name === 'Denmark')!
    expect(antimeridianShift((denmark.geometry.coordinates as Position[][][])[0])).toBe(0)
  })

  it('moves a crossing polygon so it no longer crosses', () => {
    const shift = antimeridianShift(russiaMainland)
    expect(shift).not.toBe(0)
    const lngs = russiaMainland[0].map(([lng]) => ((lng + shift + 540) % 360) - 180)
    expect(Math.max(...lngs) - Math.min(...lngs)).toBeLessThan(180)
  })
})

describe('createCapGeometry', () => {
  it('covers exactly the polygon for an ordinary country', () => {
    const france = countries.find((c) => c.properties.name === 'France')!
    const mainland = (france.geometry.coordinates as Position[][][]).reduce((a, b) =>
      b[0].length > a[0].length ? b : a,
    )
    expect(trianglesInside(mainland)).toBe(1)
  })

  it('puts a polygon crossing the antimeridian back in the right place', () => {
    expect(trianglesInside(russiaMainland)).toBe(1)
  })

  it('builds Russia quickly despite crossing the antimeridian', () => {
    const start = performance.now()
    createCapGeometry(russiaMainland, RADIUS, RADIUS * 1.01)
    expect(performance.now() - start).toBeLessThan(1000)
  })
})

describe('createCountryLayer', () => {
  const layer = createCountryLayer(countries, borders, RADIUS)
  const land = layer.object.children.find((c): c is Mesh => c instanceof Mesh)!
  const colors = land.geometry.getAttribute('color') as BufferAttribute
  const colorAt = (i: number) => new Color(colors.getX(i), colors.getY(i), colors.getZ(i)).getHexString()
  const allColors = () => Array.from({ length: colors.count }, (_, i) => colorAt(i))
  const hex = (color: string) => new Color(color).getHexString()

  it('draws all countries as one mesh and one set of lines', () => {
    expect(layer.object.children).toHaveLength(2)
    expect(layer.object.children.filter((c) => c instanceof Mesh)).toHaveLength(1)
    expect(layer.object.children.filter((c) => c instanceof LineSegments)).toHaveLength(1)
  })

  it('starts with every country in the land color', () => {
    expect(new Set(allColors())).toEqual(new Set([hex(COLORS.land)]))
  })

  it("paints only the given country's part of the mesh, and restores it", () => {
    const denmark = countries.find((c) => c.properties.name === 'Denmark')!
    layer.paint(denmark, COLORS.hover)
    const painted = allColors().filter((c) => c === hex(COLORS.hover)).length
    expect(painted).toBeGreaterThan(0)
    expect(painted).toBeLessThan(colors.count / 100) // a small country, not the world

    layer.paint(denmark, null)
    expect(new Set(allColors())).toEqual(new Set([hex(COLORS.land)]))
  })

  it('queues both countries for upload when switching hover in one frame', () => {
    const [a, b] = countries
    colors.clearUpdateRanges()
    layer.paint(a, null)
    layer.paint(b, COLORS.hover)
    expect(colors.updateRanges).toHaveLength(2)
  })
})
