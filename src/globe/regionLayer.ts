import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshLambertMaterial,
  type ColorRepresentation,
} from 'three'
import type { RegionFeature } from '../data/regions'
import { MAX_SAG, densifyRing, triangulatePolygon } from './sphereMesh'
import { LAND_ALTITUDE } from './style'

/**
 * Regions sit above their country, and outlines above the regions. Flat
 * triangles dip below the sphere between their corners (by up to MAX_SAG),
 * so each layer is lifted by more than that, or the one below shows
 * through in holes.
 */
const FILL_LIFT = 2 * MAX_SAG
const OUTLINE_LIFT = FILL_LIFT + 2 * MAX_SAG

export type RegionLayer = {
  object: Group
  /** Fill these regions in these colors, and outline these; everything else is hidden */
  show(fills: ReadonlyMap<RegionFeature, ColorRepresentation>, outlines: Iterable<RegionFeature>): void
  setOutlineColor(color: ColorRepresentation, opacity: number): void
  dispose(): void
}

const polygonsOf = ({ geometry }: RegionFeature) =>
  geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates

/**
 * States and provinces drawn over their country. All regions are built once;
 * showing and hiding them only changes which triangles and lines are drawn.
 */
export function createRegionLayer(regions: readonly RegionFeature[], globeRadius: number): RegionLayer {
  const land = globeRadius * (1 + LAND_ALTITUDE)
  const fillRadius = land * (1 + FILL_LIFT)
  const outlineRadius = land * (1 + OUTLINE_LIFT)

  const positions: number[] = []
  const normals: number[] = []
  const fillParts = new Map<RegionFeature, { triangles: number[]; start: number; count: number }>()
  const linePositions: number[] = []
  const lineParts = new Map<RegionFeature, number[]>()

  for (const region of regions) {
    const start = positions.length / 3
    const triangles: number[] = []
    const segments: number[] = []
    for (const rings of polygonsOf(region)) {
      const offset = positions.length / 3
      const { vertices, indices } = triangulatePolygon(rings)
      for (const v of vertices) {
        positions.push(v[0] * fillRadius, v[1] * fillRadius, v[2] * fillRadius)
        normals.push(...v)
      }
      for (const i of indices) triangles.push(offset + i)

      for (const ring of rings) {
        const first = linePositions.length / 3
        const points = densifyRing(ring)
        for (const v of points) linePositions.push(v[0] * outlineRadius, v[1] * outlineRadius, v[2] * outlineRadius)
        points.forEach((_, i) => segments.push(first + i, first + ((i + 1) % points.length)))
      }
    }
    fillParts.set(region, { triangles, start, count: positions.length / 3 - start })
    lineParts.set(region, segments)
  }

  const fillGeometry = new BufferGeometry()
  fillGeometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  fillGeometry.setAttribute('normal', new Float32BufferAttribute(normals, 3))
  const colors = new Float32BufferAttribute(new Float32Array(positions.length), 3)
  fillGeometry.setAttribute('color', colors)
  fillGeometry.setIndex([])
  const fill = new Mesh(fillGeometry, new MeshLambertMaterial({ vertexColors: true }))

  const lineGeometry = new BufferGeometry()
  lineGeometry.setAttribute('position', new Float32BufferAttribute(linePositions, 3))
  lineGeometry.setIndex([])
  const lines = new LineSegments(lineGeometry, new LineBasicMaterial({ transparent: true }))

  const object = new Group()
  object.name = 'regions'
  object.add(fill, lines)

  const paint = new Color()
  return {
    object,
    show(fills, outlines) {
      const triangles: number[] = []
      for (const [region, color] of fills) {
        const part = fillParts.get(region)
        if (!part) continue
        paint.set(color)
        for (let i = part.start; i < part.start + part.count; i++) colors.setXYZ(i, paint.r, paint.g, paint.b)
        triangles.push(...part.triangles)
      }
      colors.needsUpdate = true
      fillGeometry.setIndex(triangles)

      const segments: number[] = []
      for (const region of new Set(outlines)) segments.push(...(lineParts.get(region) ?? []))
      lineGeometry.setIndex(segments)
    },
    setOutlineColor(color, opacity) {
      lines.material.color.set(color)
      lines.material.opacity = opacity
    },
    dispose() {
      fillGeometry.dispose()
      fill.material.dispose()
      lineGeometry.dispose()
      lines.material.dispose()
    },
  }
}
