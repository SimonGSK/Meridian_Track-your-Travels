import { feature, mesh, neighbors } from 'topojson-client'
import type { GeometryCollection, Topology } from 'topojson-specification'
import type { Feature, MultiLineString, MultiPolygon, Polygon } from 'geojson'
import { geoArea, geoBounds, geoCentroid, geoContains, geoDistance } from 'd3-geo'
import { numericToAlpha2 } from 'i18n-iso-countries'
// world-atlas's 1:50m countries with the lakes cut out (scripts/extract-map.mjs)
import worldData from './data/countries-50m.json'
import extraCountries from './data/extra-countries.json'
import { continentOf, type Continent } from './data/continents'
import { aliasesOf, displayName, matchKey, normalizeName, placeKind, type PlaceKind } from './data/names'
import { fixWesternSahara, westernSaharaBorder } from './data/westernSahara'

export type CountryFeature = Feature<
  Polygon | MultiPolygon,
  {
    /** Display name, e.g. "Bosnia and Herzegovina" */
    name: string
    /** Name in the map data, e.g. "Bosnia and Herz." */
    mapName: string
    /** Every name the place goes by, including former and alternative spellings */
    aliases: string[]
    /** Countries: UN members and observers, Kosovo and Taiwan (197). Everything else is a territory. */
    kind: PlaceKind
    continent: Continent
    /**
     * ISO 3166-1 numeric code, e.g. "208" for Denmark. Null for disputed
     * areas without one (Kosovo, Siachen Glacier, ...), and shared by some
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
    /** Land area in km² (approximate, from the map) */
    areaKm2: number
    /** Too small to see or click on the globe, so it gets a marker */
    tiny: boolean
    /** No land border with another place: an island country (or territory) */
    island: boolean
  }
>

type Bounds = [[west: number, south: number], [east: number, north: number]]

const topology = worldData as unknown as Topology<{
  countries: GeometryCollection<{ name: string }>
}>

// Commonly used codes for places without an official one
const UNOFFICIAL_ALPHA2: Record<string, string> = { Kosovo: 'XK' }

const DEG = Math.PI / 180

/** Places smaller than this get a marker on the globe */
export const TINY_KM2 = 2500
const EARTH_KM2 = 510_072_000

const nameOf = (geometry: { properties?: object }) => (geometry.properties as { name: string }).name

const mapPlaces = topology.objects.countries

// Which places share a border: for colors, and to tell the islands
const adjacent = neighbors(mapPlaces.geometries)

export const MAP_COLOR_COUNT = 5
const mapColors = assignMapColors(adjacent)

type Shape = Feature<Polygon | MultiPolygon, { name: string }>

// The 1:50m map, plus the few places it's too coarse to include (see scripts/extract-extra-countries.mjs)
const mapShapes = feature(topology, mapPlaces).features as Shape[]
const extraShapes = extraCountries.features as Shape[]
const shapes = fixWesternSahara([...mapShapes, ...extraShapes])

export const countries: CountryFeature[] = shapes
  .map((f, i) => ({ f, i, mapColor: mapColors[i] ?? extraMapColor(f, mapShapes, mapColors) }))
  .map(({ f, i, mapColor }) => ({ f, i, mapColor, isoAlpha2: alpha2Of(f) }))
  .map(({ f, i, mapColor, isoAlpha2 }) => ({
    ...f,
    properties: {
      name: displayName(f.properties.name),
      mapName: f.properties.name,
      aliases: aliasesOf(f.properties.name, isoAlpha2),
      kind: placeKind(f.properties.name, isoAlpha2),
      continent: continentOf(f.properties.name, isoAlpha2),
      areaKm2: (geoArea(f) / (4 * Math.PI)) * EARTH_KM2,
      tiny: (geoArea(f) / (4 * Math.PI)) * EARTH_KM2 < TINY_KM2,
      island: i < mapShapes.length ? adjacent[i].length === 0 : standsAlone(f, mapShapes),
      extent: extentOf(largestPart(f.geometry as Polygon | MultiPolygon)),
      isoCode: f.id === undefined ? null : String(f.id),
      isoAlpha2,
      centroid: geoCentroid(largestPart(f.geometry as Polygon | MultiPolygon)),
      mapColor,
    },
  })) as CountryFeature[]

/** A place added to the map is an island unless other land comes within 20 km or so, like Spain's of Gibraltar */
function standsAlone(shape: Shape, others: Shape[]) {
  const [lng, lat] = geoCentroid(shape)
  const reach = 0.2 // degrees
  const near = ([x, y]: number[]) => Math.abs(y - lat) < reach && Math.abs(x - lng) * Math.cos(lat * DEG) < reach
  return !others.some(({ geometry }) =>
    (geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates).some((polygon) =>
      polygon.some((ring) => ring.some(near)),
    ),
  )
}

function alpha2Of(f: Shape): string | null {
  return (f.id === undefined ? UNOFFICIAL_ALPHA2[f.properties.name] : numericToAlpha2(f.id)) ?? null
}

/** A map color for an added place that differs from the countries around it. */
function extraMapColor(shape: Shape, others: Shape[], colors: number[]) {
  const [[west, south], [east, north]] = geoBounds(shape)
  const taken = new Set(
    others
      .map((other, i) => ({ bounds: geoBounds(other), color: colors[i] }))
      .filter(({ bounds: [[w, s], [e, n]] }) => w <= east + 1 && e >= west - 1 && s <= north + 1 && n >= south - 1)
      .map(({ color }) => color),
  )
  return [0, 1, 2, 3, 4].find((c) => !taken.has(c)) ?? 0
}

/**
 * Colors countries so that no two neighbors match, like a political map.
 * Greedy, most-connected countries first, picking the least used allowed
 * color to keep the colors balanced. Five colors are enough for this data.
 */
function assignMapColors(adjacent: number[][]) {
  const colors = new Array<number>(adjacent.length).fill(-1)
  const used = new Array<number>(MAP_COLOR_COUNT).fill(0)
  const order = adjacent.map((_, i) => i).sort((a, b) => adjacent[b].length - adjacent[a].length)
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
  // The data's Morocco–Western Sahara border is replaced, see data/westernSahara.ts
  const lines = mesh(topology, mapPlaces, (a, b) => !isMoroccoSaharaBorder(nameOf(a), nameOf(b)))
  const saharaBorder = westernSaharaBorder(shapes)
  const extraCoasts = extraShapes.flatMap(({ geometry }) =>
    geometry.type === 'Polygon' ? geometry.coordinates : geometry.coordinates.flat(),
  )
  return {
    ...lines,
    coordinates: [...lines.coordinates, ...(saharaBorder ? [saharaBorder.coordinates] : []), ...extraCoasts],
  }
})()

const bounds = new Map<CountryFeature, Bounds>(
  countries.map((c) => [c, geoBounds(c) as Bounds]),
)

/** `margin` (degrees) widens the box, for finding countries near a point */
function inBounds([[west, south], [east, north]]: Bounds, lat: number, lng: number, margin = 0) {
  if (lat < south - margin || lat > north + margin) return false
  const lngMargin = margin / Math.max(Math.cos(lat * DEG), 0.05)
  if (lngMargin >= 180 || east - west + 2 * lngMargin >= 360) return true
  const [w, e] = [west - lngMargin, east + lngMargin]
  const wrapped = ((lng - w + 540) % 360) - 180 + w // lng shifted into [w - 180, w + 180)
  // Countries spanning the antimeridian (Russia, Fiji, ...) have west > east
  return west <= east ? wrapped >= w && wrapped <= e : lng >= w || lng <= e
}

/**
 * The country at a point on the globe, or null for ocean. Where two overlap
 * (Gibraltar isn't cut out of Spain in the 1:50m map), the smaller one wins.
 */
export function findCountryAt(lat: number, lng: number): CountryFeature | null {
  let found: CountryFeature | null = null
  for (const country of countries) {
    if (found && country.properties.areaKm2 >= found.properties.areaKm2) continue
    if (inBounds(bounds.get(country)!, lat, lng) && geoContains(country, [lng, lat])) found = country
  }
  return found
}

/** Places too small to see, with a ring on the globe (unless switched off) */
export const tinyPlaces: readonly CountryFeature[] = countries.filter((c) => c.properties.tiny)

/**
 * Like findCountryAt, but forgiving, so small islands can be hit with a
 * mouse. Tiny places, and the `ringed` ones, are found within
 * `markerRadius` of their middle (even on top of a bigger country), and any
 * country within `tolerance` of its outline. Both in radians.
 */
export function findCountryNear(
  lat: number,
  lng: number,
  {
    markerRadius,
    tolerance,
    ringed = [],
  }: { markerRadius: number; tolerance: number; ringed?: readonly CountryFeature[] },
): CountryFeature | null {
  const point: [number, number] = [lng, lat]
  let nearest: CountryFeature | null = null
  let distance = markerRadius
  for (const country of [...tinyPlaces, ...ringed]) {
    const d = geoDistance(point, country.properties.centroid)
    if (d <= distance) [nearest, distance] = [country, d]
  }
  if (nearest) return nearest

  const exact = findCountryAt(lat, lng)
  if (exact) return exact

  distance = tolerance
  const toleranceDeg = tolerance / DEG
  for (const country of countries) {
    if (!inBounds(bounds.get(country)!, lat, lng, toleranceDeg)) continue
    for (const ring of polygonsOf(country).flat()) {
      for (const vertex of ring) {
        if (Math.abs(vertex[1] - lat) > toleranceDeg) continue
        const d = geoDistance(point, vertex as [number, number])
        if (d < distance) [nearest, distance] = [country, d]
      }
    }
  }
  return nearest
}

const polygonsOf = ({ geometry }: CountryFeature) =>
  geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates

const byNormalizedName = new Map<string, CountryFeature>()
for (const country of countries) {
  for (const alias of country.properties.aliases) byNormalizedName.set(matchKey(alias), country)
}

/** The place a typed name refers to, accepting any known spelling: "Swaziland" → Eswatini. */
export function findCountryByName(name: string): CountryFeature | null {
  return byNormalizedName.get(matchKey(name)) ?? null
}

export type NameMatch = {
  country: CountryFeature
  /** The alternative name that matched, when it isn't the display name, e.g. "Swaziland" for Eswatini */
  matchedAlias: string | null
}

/**
 * Places whose name, or any alternative name, starts with what's typed (or
 * has a word that does). Display-name matches come first.
 */
export function searchCountries(query: string, among: readonly CountryFeature[] = countries, limit = 8): NameMatch[] {
  const q = normalizeName(query)
  if (!q) return []
  const scored: { match: NameMatch; score: number }[] = []
  for (const country of among) {
    let best: { match: NameMatch; score: number } | null = null
    for (const alias of country.properties.aliases) {
      const n = normalizeName(alias)
      const isName = alias === country.properties.name
      const score = n.startsWith(q) ? (isName ? 0 : 1) : n.split(' ').some((word) => word.startsWith(q)) ? (isName ? 2 : 3) : -1
      if (score >= 0 && (!best || score < best.score)) {
        best = { match: { country, matchedAlias: isName ? null : alias }, score }
      }
    }
    if (best) scored.push(best)
  }
  return scored
    .sort((a, b) => a.score - b.score || a.match.country.properties.name.localeCompare(b.match.country.properties.name))
    .slice(0, limit)
    .map(({ match }) => match)
}

/** A country (not a territory sharing its code) by its ISO alpha-2 code */
export const countryByAlpha2 = (code: string) =>
  countries.find((c) => c.properties.isoAlpha2 === code && c.properties.kind === 'country') ?? null
