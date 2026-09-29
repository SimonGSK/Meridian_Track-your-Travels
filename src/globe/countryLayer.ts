import { Group, LineBasicMaterial, LineSegments, MathUtils, Mesh, MeshLambertMaterial } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import ConicPolygonGeometry from 'three-conic-polygon-geometry'
import GeoJsonGeometry from 'three-geojson-geometry'
import type { MultiLineString, Position } from 'geojson'
import { geoBounds } from 'd3-geo'
import type { CountryFeature } from '../countries'
import { COLORS, LAND_ALTITUDE } from './style'

const CURVATURE_RESOLUTION = 5

/**
 * All countries as one mesh plus one set of border lines.
 *
 * Drawing each country separately (the default polygon layer) costs thousands
 * of draw calls per frame; merging them keeps rotation smooth. Hover and
 * selection are drawn on top by the globe's own (tiny) polygon layer.
 */
export function createCountryLayer(
  countries: CountryFeature[],
  borders: MultiLineString,
  globeRadius: number,
): Group {
  const top = globeRadius * (1 + LAND_ALTITUDE)

  const parts = countries.flatMap((country) => {
    const { geometry } = country
    const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
    return polygons.map((rings) => createCapGeometry(rings, globeRadius, top))
  })
  const landGeometry = mergeGeometries(parts, false)
  parts.forEach((p) => p.dispose())

  const land = new Mesh(
    landGeometry,
    new MeshLambertMaterial({
      color: COLORS.land,
      // Push the land back in the depth buffer so borders never flicker through it
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    }),
  )

  const lines = new LineSegments(
    new GeoJsonGeometry(borders, top, CURVATURE_RESOLUTION),
    new LineBasicMaterial({ color: COLORS.border, transparent: true, opacity: 0.8 }),
  )

  const layer = new Group()
  layer.name = 'countries'
  layer.add(land, lines)
  return layer
}

const wrapLng = (lng: number) => ((((lng + 180) % 360) + 360) % 360) - 180

/**
 * How far to shift a polygon's longitudes so it no longer crosses the
 * antimeridian (180°), or 0 if it doesn't cross it.
 */
export function antimeridianShift(rings: Position[][]) {
  const [[west], [east]] = geoBounds({ type: 'Polygon', coordinates: rings })
  if (west <= east) return 0
  const center = (west + east + 360) / 2
  return -center
}

/**
 * The flat top of one polygon, lifted to `radius`.
 *
 * Polygons crossing the antimeridian (Russia's mainland) take a very slow
 * triangulation path — seconds, not milliseconds. So they're built rotated
 * away from it and the finished geometry is rotated back into place.
 */
export function createCapGeometry(rings: Position[][], globeRadius: number, radius: number) {
  const shift = antimeridianShift(rings)
  const shifted = shift ? rings.map((ring) => ring.map(([lng, lat]) => [wrapLng(lng + shift), lat])) : rings
  const geometry = new ConicPolygonGeometry(shifted, globeRadius, radius, false, true, false, CURVATURE_RESOLUTION)
  if (shift) geometry.rotateY(MathUtils.degToRad(-shift))
  return geometry
}

export function disposeLayer(layer: Group) {
  layer.traverse((obj) => {
    if (obj instanceof Mesh || obj instanceof LineSegments) {
      obj.geometry.dispose()
      obj.material.dispose()
    }
  })
}
