import {
  BufferAttribute,
  Color,
  Group,
  LineBasicMaterial,
  LineSegments,
  MathUtils,
  Mesh,
  MeshLambertMaterial,
  type ColorRepresentation,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import ConicPolygonGeometry from 'three-conic-polygon-geometry'
import GeoJsonGeometry from 'three-geojson-geometry'
import type { MultiLineString, Position } from 'geojson'
import { geoBounds } from 'd3-geo'
import type { CountryFeature } from '../countries'
import { LAND_ALTITUDE } from './style'

const CURVATURE_RESOLUTION = 5

export type CountryLayer = {
  object: Group
  /** Recolor one country */
  paint(country: CountryFeature, color: ColorRepresentation): void
  setBorders(color: ColorRepresentation, opacity: number): void
  dispose(): void
}

/**
 * All countries as one mesh plus one set of border lines.
 *
 * Drawing each country separately (the default polygon layer) costs thousands
 * of draw calls per frame; merging them keeps rotation smooth. Each country
 * keeps its own range of vertex colors so it can be highlighted in place.
 */
export function createCountryLayer(
  countries: CountryFeature[],
  borders: MultiLineString,
  globeRadius: number,
): CountryLayer {
  const top = globeRadius * (1 + LAND_ALTITUDE)

  // Which vertices of the merged mesh belong to which country
  const ranges = new Map<CountryFeature, { start: number; count: number }>()
  let vertexCount = 0
  const parts = countries.flatMap((country) => {
    const { geometry } = country
    const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
    const countryParts = polygons.map((rings) => createCapGeometry(rings, globeRadius, top))
    const count = countryParts.reduce((sum, part) => sum + part.attributes.position.count, 0)
    ranges.set(country, { start: vertexCount, count })
    vertexCount += count
    return countryParts
  })
  const landGeometry = mergeGeometries(parts, false)
  parts.forEach((p) => p.dispose())

  // Starts out white; the caller paints each country
  const colors = new BufferAttribute(new Float32Array(vertexCount * 3).fill(1), 3)
  landGeometry.setAttribute('color', colors)

  const land = new Mesh(
    landGeometry,
    new MeshLambertMaterial({
      vertexColors: true,
      // Push the land back in the depth buffer so borders never flicker through it
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    }),
  )

  const lines = new LineSegments(
    new GeoJsonGeometry(borders, top, CURVATURE_RESOLUTION),
    new LineBasicMaterial({ transparent: true }),
  )

  const object = new Group()
  object.name = 'countries'
  object.add(land, lines)

  const paintColor = new Color()
  return {
    object,
    paint(country, color) {
      const range = ranges.get(country)
      if (!range) return
      paintColor.set(color)
      for (let i = range.start; i < range.start + range.count; i++) {
        colors.setXYZ(i, paintColor.r, paintColor.g, paintColor.b)
      }
      // Only re-upload this country's colors to the GPU (three.js clears the ranges after uploading)
      colors.addUpdateRange(range.start * 3, range.count * 3)
      colors.needsUpdate = true
    },
    setBorders(color, opacity) {
      lines.material.color.set(color)
      lines.material.opacity = opacity
    },
    dispose() {
      landGeometry.dispose()
      land.material.dispose()
      lines.geometry.dispose()
      lines.material.dispose()
    },
  }
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
