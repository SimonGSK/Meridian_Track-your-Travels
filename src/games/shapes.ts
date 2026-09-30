import { geoCentroid, geoDistance, geoOrthographic, geoPath } from 'd3-geo'
import type { MultiPolygon } from 'geojson'
import type { CountryFeature } from '../countries'

const DEG = Math.PI / 180

/**
 * The parts of a country that make up its recognisable shape: the main
 * landmass and islands near it, but not far-off territories (France without
 * French Guiana, the US without Alaska and Hawaii).
 */
export function mainShape(country: CountryFeature): MultiPolygon {
  const { geometry } = country
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  const center = country.properties.centroid
  const reach = Math.max(28, country.properties.extent * 0.75) * DEG
  const near = polygons.filter(
    (rings) => geoDistance(center, geoCentroid({ type: 'Polygon', coordinates: rings }) as [number, number]) <= reach,
  )
  return { type: 'MultiPolygon', coordinates: near.length ? near : polygons }
}

/** SVG path of a country's outline, as seen on the globe, fitted into a width × height box. */
export function shapePath(country: CountryFeature, width: number, height: number, padding = 8) {
  const shape = mainShape(country)
  const [lng, lat] = country.properties.centroid
  const projection = geoOrthographic()
    .rotate([-lng, -lat])
    .fitExtent(
      [
        [padding, padding],
        [width - padding, height - padding],
      ],
      shape,
    )
  return geoPath(projection)(shape) ?? ''
}
