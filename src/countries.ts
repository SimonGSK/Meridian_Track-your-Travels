import { feature, mesh, neighbors } from 'topojson-client'
import type { Topology, GeometryCollection } from 'topojson-specification'
import type { Feature, MultiLineString, MultiPolygon, Polygon } from 'geojson'
import { geoArea, geoBounds, geoCentroid, geoContains } from 'd3-geo'
import { numericToAlpha2 } from 'i18n-iso-countries'
import worldData from 'world-atlas/countries-50m.json'
import { fixWesternSahara, westernSaharaBorder } from './data/westernSahara'

export type CountryFeature = Feature<
  Polygon | MultiPolygon,
  {
    name: string
    /**
     * ISO 3166-1 numeric code, e.g. "208" for Denmark. Null for disputed
     * areas without one (Kosovo, Somaliland, ...), and shared by some
     * territories with their country (Ashmore and Cartier Is. with Australia).
     */
    isoCode: string | null
    /** ISO 3166-1 alpha-2 code, e.g. "DK", used for flags. "XK" for Kosovo, null where none exists. */
    isoAlpha2: string | null
    /** [lng, lat] center of the largest landmass, used to fly the camera to the country */
    centroid: [number, number]
    /** 0–4, never shared with a neighboring country, for multi-colored map designs */
    mapColor: number
    /** Rough size of the largest landmass in degrees, to zoom the camera to fit it */
    extent: number
  }
>

type Bounds = [[west: number, south: number], [east: number, north: number]]

const topology = worldData as unknown as Topology<{
  countries: GeometryCollection<{ name: string }>
}>

// Commonly used codes for places without an official one
const UNOFFICIAL_ALPHA2: Record<string, string> = { Kosovo: 'XK' }

// Antarctica clutters the south pole and isn't a country
const isShown = (name: string) => name !== 'Antarctica'
const nameOf = (geometry: { properties?: object }) => (geometry.properties as { name: string }).name

export const MAP_COLOR_COUNT = 5
const mapColors = assignMapColors(topology.objects.countries.geometries)

type Shape = Feature<Polygon | MultiPolygon, { name: string }>

const shapes = fixWesternSahara(feature(topology, topology.objects.countries).features as Shape[])

export const countries: CountryFeature[] = shapes
  .map((f, i) => ({ f, mapColor: mapColors[i] }))
  .filter(({ f }) => isShown(f.properties.name))
  .map(({ f, mapColor }) => ({
    ...f,
    properties: {
      name: f.properties.name,
      extent: extentOf(largestPart(f.geometry as Polygon | MultiPolygon)),
      isoCode: f.id === undefined ? null : String(f.id),
      isoAlpha2:
        (f.id === undefined ? UNOFFICIAL_ALPHA2[f.properties.name] : numericToAlpha2(f.id)) ?? null,
      centroid: geoCentroid(largestPart(f.geometry as Polygon | MultiPolygon)),
      mapColor,
    },
  })) as CountryFeature[]

/**
 * Colors countries so that no two neighbors match, like a political map.
 * Greedy, most-connected countries first, picking the least used allowed
 * color to keep the colors balanced. Five colors are enough for this data.
 */
function assignMapColors(geometries: GeometryCollection['geometries']) {
  const adjacent = neighbors(geometries)
  const colors = new Array<number>(geometries.length).fill(-1)
  const used = new Array<number>(MAP_COLOR_COUNT).fill(0)
  const order = geometries.map((_, i) => i).sort((a, b) => adjacent[b].length - adjacent[a].length)
  for (const i of order) {
    const taken = new Set(adjacent[i].map((j) => colors[j]))
    const allowed = used.map((_, c) => c).filter((c) => !taken.has(c))
    const color = allowed.sort((a, b) => used[a] - used[b])[0] ?? 0
    colors[i] = color
    used[color]++
  }
  return colors
}

/**
 * The biggest piece of a country, so e.g. France's overseas territories
 * don't drag its center into Spain.
 */
function largestPart(geometry: Polygon | MultiPolygon): Polygon {
  if (geometry.type === 'Polygon') return geometry
  const parts = geometry.coordinates.map((coordinates) => ({ type: 'Polygon' as const, coordinates }))
  return parts.reduce((a, b) => (geoArea(b) > geoArea(a) ? b : a))
}

function extentOf(polygon: Polygon) {
  const [[west, south], [east, north]] = geoBounds(polygon)
  const width = (east - west + 360) % 360
  const height = north - south
  const midLatitude = ((north + south) / 2) * (Math.PI / 180)
  return Math.max(height, width * Math.cos(midLatitude))
}

const isMoroccoSaharaBorder = (a: string, b: string) =>
  (a === 'Morocco' && b === 'W. Sahara') || (a === 'W. Sahara' && b === 'Morocco')

/** Every border and coastline exactly once, so shared borders aren't drawn twice. */
export const borders: MultiLineString = (() => {
  const lines = mesh(topology, topology.objects.countries, (a, b) => {
    const [nameA, nameB] = [nameOf(a), nameOf(b)]
    // The data's Morocco–Western Sahara border is replaced, see data/westernSahara.ts
    return isShown(nameA) && isShown(nameB) && !isMoroccoSaharaBorder(nameA, nameB)
  })
  const saharaBorder = westernSaharaBorder(shapes)
  return saharaBorder ? { ...lines, coordinates: [...lines.coordinates, saharaBorder.coordinates] } : lines
})()

const bounds = new Map<CountryFeature, Bounds>(
  countries.map((c) => [c, geoBounds(c) as Bounds]),
)

function inBounds([[west, south], [east, north]]: Bounds, lat: number, lng: number) {
  if (lat < south || lat > north) return false
  // Countries spanning the antimeridian (Russia, Fiji, ...) have west > east
  return west <= east ? lng >= west && lng <= east : lng >= west || lng <= east
}

/** The country at a point on the globe, or null for ocean. */
export function findCountryAt(lat: number, lng: number): CountryFeature | null {
  for (const country of countries) {
    if (inBounds(bounds.get(country)!, lat, lng) && geoContains(country, [lng, lat])) {
      return country
    }
  }
  return null
}
