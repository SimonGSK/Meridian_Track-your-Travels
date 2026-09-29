import { feature, mesh } from 'topojson-client'
import type { Topology, GeometryCollection } from 'topojson-specification'
import type { Feature, MultiLineString, MultiPolygon, Polygon } from 'geojson'
import { geoArea, geoBounds, geoCentroid, geoContains } from 'd3-geo'
import worldData from 'world-atlas/countries-50m.json'

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
    /** [lng, lat] center of the largest landmass, used to fly the camera to the country */
    centroid: [number, number]
  }
>

type Bounds = [[west: number, south: number], [east: number, north: number]]

const topology = worldData as unknown as Topology<{
  countries: GeometryCollection<{ name: string }>
}>

// Antarctica clutters the south pole and isn't a country
const isShown = (name: string) => name !== 'Antarctica'
const nameOf = (geometry: { properties?: object }) => (geometry.properties as { name: string }).name

export const countries: CountryFeature[] = feature(topology, topology.objects.countries)
  .features.filter((f) => isShown(f.properties.name))
  .map((f) => ({
    ...f,
    properties: {
      name: f.properties.name,
      isoCode: f.id === undefined ? null : String(f.id),
      centroid: geoCentroid(largestPart(f.geometry as Polygon | MultiPolygon)),
    },
  })) as CountryFeature[]

/**
 * The biggest piece of a country, so e.g. France's overseas territories
 * don't drag its center into Spain.
 */
function largestPart(geometry: Polygon | MultiPolygon): Polygon {
  if (geometry.type === 'Polygon') return geometry
  const parts = geometry.coordinates.map((coordinates) => ({ type: 'Polygon' as const, coordinates }))
  return parts.reduce((a, b) => (geoArea(b) > geoArea(a) ? b : a))
}

/** Every border and coastline exactly once, so shared borders aren't drawn twice. */
export const borders: MultiLineString = mesh(
  topology,
  topology.objects.countries,
  (a, b) => isShown(nameOf(a)) && isShown(nameOf(b)),
)

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
