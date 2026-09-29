import { feature } from 'topojson-client'
import type { Topology, GeometryCollection } from 'topojson-specification'
import type { Feature, MultiPolygon, Polygon } from 'geojson'
import { geoCentroid } from 'd3-geo'
import worldData from 'world-atlas/countries-50m.json'

export type CountryFeature = Feature<
  Polygon | MultiPolygon,
  {
    /** ISO 3166-1 numeric code, e.g. "208" for Denmark */
    id: string
    name: string
    /** [lng, lat] visual center, used to fly the camera to the country */
    centroid: [number, number]
  }
>

const topology = worldData as unknown as Topology<{
  countries: GeometryCollection<{ name: string }>
}>

export const countries: CountryFeature[] = feature(
  topology,
  topology.objects.countries,
).features
  // Antarctica clutters the south pole and isn't a country
  .filter((f) => f.properties.name !== 'Antarctica')
  .map((f) => ({
    ...f,
    properties: {
      id: String(f.id),
      name: f.properties.name,
      centroid: geoCentroid(f) as [number, number],
    },
  })) as CountryFeature[]
