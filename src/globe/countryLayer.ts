import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshLambertMaterial,
  type ColorRepresentation,
} from 'three'
import GeoJsonGeometry from 'three-geojson-geometry'
import type { MultiLineString } from 'geojson'
import type { CountryFeature } from '../countries'
import { densifyRing, triangulatePolygon } from './sphereMesh'
import { LAND_ALTITUDE } from './style'

/** How far borders float above the land, as a fraction of its radius */
const BORDER_LIFT = 0.0004

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
  const positions: number[] = []
  const normals: number[] = []
  const indices: number[] = []
  for (const country of countries) {
    const start = positions.length / 3
    for (const rings of polygonsOf(country)) {
      const offset = positions.length / 3
      const { vertices, indices: triangles } = triangulatePolygon(rings)
      for (const v of vertices) {
        positions.push(v[0] * top, v[1] * top, v[2] * top)
        normals.push(...v)
      }
      for (const i of triangles) indices.push(offset + i)
    }
    ranges.set(country, { start, count: positions.length / 3 - start })
  }
  const vertexCount = positions.length / 3
  const landGeometry = new BufferGeometry()
  landGeometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  landGeometry.setAttribute('normal', new Float32BufferAttribute(normals, 3))
  landGeometry.setIndex(indices)

  // Starts out white; the caller paints each country
  const colors = new BufferAttribute(new Float32Array(vertexCount * 3).fill(1), 3)
  landGeometry.setAttribute('color', colors)

  const land = new Mesh(landGeometry, new MeshLambertMaterial({ vertexColors: true }))

  // Borders sit just above the land so they never sink into it
  const lines = new LineSegments(
    new GeoJsonGeometry(borders, top * (1 + BORDER_LIFT), 1),
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

const polygonsOf = ({ geometry }: CountryFeature) =>
  geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates

/**
 * A country standing out from the globe: its surface at `topRadius` and
 * walls down to `baseRadius`.
 */
export function createRaisedCountry(country: CountryFeature, baseRadius: number, topRadius: number) {
  const capPositions: number[] = []
  const capNormals: number[] = []
  const capIndices: number[] = []
  const wallPositions: number[] = []
  const wallNormals: number[] = []

  for (const rings of polygonsOf(country)) {
    const offset = capPositions.length / 3
    const { vertices, indices } = triangulatePolygon(rings)
    for (const v of vertices) {
      capPositions.push(v[0] * topRadius, v[1] * topRadius, v[2] * topRadius)
      capNormals.push(...v)
    }
    for (const i of indices) capIndices.push(offset + i)

    for (const ring of rings) {
      const points = densifyRing(ring)
      points.forEach((a, i) => {
        const b = points[(i + 1) % points.length]
        const corners = [
          [a, baseRadius],
          [b, baseRadius],
          [b, topRadius],
          [a, baseRadius],
          [b, topRadius],
          [a, topRadius],
        ] as const
        for (const [v, r] of corners) {
          wallPositions.push(v[0] * r, v[1] * r, v[2] * r)
          wallNormals.push(...v)
        }
      })
    }
  }

  const cap = new BufferGeometry()
  cap.setAttribute('position', new Float32BufferAttribute(capPositions, 3))
  cap.setAttribute('normal', new Float32BufferAttribute(capNormals, 3))
  cap.setIndex(capIndices)
  const walls = new BufferGeometry()
  walls.setAttribute('position', new Float32BufferAttribute(wallPositions, 3))
  walls.setAttribute('normal', new Float32BufferAttribute(wallNormals, 3))

  const object = new Group()
  object.name = 'selected-country'
  const capMesh = new Mesh(cap, new MeshLambertMaterial())
  const wallMesh = new Mesh(walls, new MeshLambertMaterial({ side: DoubleSide }))
  object.add(capMesh, wallMesh)

  return {
    object,
    setColor(color: ColorRepresentation) {
      capMesh.material.color.set(color)
      // Walls a shade darker, so the country reads as raised
      wallMesh.material.color.set(color).multiplyScalar(0.6)
    },
    dispose() {
      cap.dispose()
      walls.dispose()
      capMesh.material.dispose()
      wallMesh.material.dispose()
    },
  }
}

export type RaisedCountry = ReturnType<typeof createRaisedCountry>
