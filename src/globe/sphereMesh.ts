import earcut from 'earcut'
import type { Position } from 'geojson'

/** A point on the unit sphere, in three-globe's axes: lng 0 faces +z, north is +y. */
export type Vec3 = [number, number, number]

const DEG = Math.PI / 180

/** Longest triangle edge; short enough that flat triangles hug the sphere (sag ≈ 0.03% of the radius). */
export const MAX_EDGE = 3 * DEG

export function toUnitVector([lng, lat]: Position): Vec3 {
  const phi = (90 - lat) * DEG
  const theta = (90 - lng) * DEG
  return [Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)]
}

export function toLngLat([x, y, z]: Vec3): [number, number] {
  const lat = 90 - Math.acos(Math.max(-1, Math.min(1, y))) / DEG
  const lng = 90 - Math.atan2(z, x) / DEG
  return [((lng + 540) % 360) - 180, lat]
}

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
function normalize(v: Vec3): Vec3 {
  const length = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / length, v[1] / length, v[2] / length]
}

/** Point halfway along the great circle between two points. */
export const midpoint = (a: Vec3, b: Vec3) => normalize([a[0] + b[0], a[1] + b[1], a[2] + b[2]])

/** Rings as unit vectors, without GeoJSON's repeated closing point. */
function ringVectors(ring: Position[]): Vec3[] {
  const points = ring.map(toUnitVector)
  const [first, last] = [points[0], points[points.length - 1]]
  if (points.length > 1 && dot(first, last) > 1 - 1e-12) points.pop()
  return points
}

const planarArea = (ring: number[][]) =>
  ring.reduce((sum, [x, y], i) => {
    const [nx, ny] = ring[(i + 1) % ring.length]
    return sum + x * ny - nx * y
  }, 0) / 2

/**
 * Triangulates a polygon lying on the unit sphere.
 *
 * The rings are projected with a gnomonic projection centered on the
 * polygon. It maps great circles to straight lines, so triangulating there
 * (with earcut, which follows the rings exactly) gives the right triangles
 * on the sphere, even across the antimeridian or around a pole. Triangles
 * are then subdivided until no edge is longer than `maxEdge`, so the flat
 * triangles stay close to the curved surface.
 */
export function triangulatePolygon(rings: Position[][], maxEdge = MAX_EDGE) {
  const vectorRings = rings.map(ringVectors).filter((r) => r.length >= 3)
  const all = vectorRings.flat()
  const center = normalize(all.reduce<Vec3>((s, v) => [s[0] + v[0], s[1] + v[1], s[2] + v[2]], [0, 0, 0]))

  // Tangent plane at the center
  const helper: Vec3 = Math.abs(center[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]
  const u = normalize(cross(helper, center))
  const w = cross(center, u)
  const project = (v: Vec3) => {
    const d = Math.max(dot(v, center), 1e-6)
    return [dot(v, u) / d, dot(v, w) / d]
  }

  // The biggest ring is the outline, the rest are holes. (Antarctica is stored
  // with a tiny ring around the pole as its "outline" and the coast as a hole.)
  const planar = vectorRings.map((ring) => ({ ring, flat: ring.map(project) }))
  planar.sort((a, b) => Math.abs(planarArea(b.flat)) - Math.abs(planarArea(a.flat)))

  const vertices: Vec3[] = []
  const coords: number[] = []
  const holes: number[] = []
  planar.forEach(({ ring, flat }, i) => {
    if (i > 0) holes.push(vertices.length)
    vertices.push(...ring)
    for (const [x, y] of flat) coords.push(x, y)
  })

  let triangles = earcut(coords, holes, 2)
  triangles = subdivide(vertices, triangles, maxEdge)

  // Make every triangle face outwards
  for (let i = 0; i < triangles.length; i += 3) {
    const [a, b, c] = [vertices[triangles[i]], vertices[triangles[i + 1]], vertices[triangles[i + 2]]]
    const normal = cross(sub(b, a), sub(c, a))
    if (dot(normal, a) < 0) [triangles[i + 1], triangles[i + 2]] = [triangles[i + 2], triangles[i + 1]]
  }
  return { vertices, indices: triangles }
}

/**
 * Splits triangle edges longer than `maxEdge` at their midpoints until none
 * are left. Edges are split by length alone and midpoints are shared, so
 * neighboring triangles always split the same edges and no cracks appear.
 */
function subdivide(vertices: Vec3[], triangles: number[], maxEdge: number) {
  const minDot = Math.cos(maxEdge)
  const midpoints = new Map<string, number>()
  const tooLong = (a: number, b: number) => dot(vertices[a], vertices[b]) < minDot
  const mid = (a: number, b: number) => {
    const key = a < b ? `${a},${b}` : `${b},${a}`
    let index = midpoints.get(key)
    if (index === undefined) {
      index = vertices.push(midpoint(vertices[a], vertices[b])) - 1
      midpoints.set(key, index)
    }
    return index
  }

  let current = triangles
  for (let pass = 0; pass < 32; pass++) {
    const next: number[] = []
    let split = false
    for (let i = 0; i < current.length; i += 3) {
      // Rotate so the pattern checks below only need a few cases
      let [a, b, c] = [current[i], current[i + 1], current[i + 2]]
      let long = [tooLong(a, b), tooLong(b, c), tooLong(c, a)]
      const count = long.filter(Boolean).length
      if (count === 0) {
        next.push(a, b, c)
        continue
      }
      split = true
      if (count === 3) {
        const [ab, bc, ca] = [mid(a, b), mid(b, c), mid(c, a)]
        next.push(a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca)
        continue
      }
      // Rotate until edge a–b is long (and for two long edges, b–c too)
      while (!(long[0] && (count === 1 || long[1]))) {
        ;[a, b, c] = [b, c, a]
        long = [long[1], long[2], long[0]]
      }
      if (count === 1) {
        const ab = mid(a, b)
        next.push(a, ab, c, ab, b, c)
      } else {
        const [ab, bc] = [mid(a, b), mid(b, c)]
        next.push(ab, b, bc, a, ab, bc, a, bc, c)
      }
    }
    current = next
    if (!split) break
  }
  return current
}

/** A ring as unit vectors with extra points so no segment is longer than `maxEdge`. */
export function densifyRing(ring: Position[], maxEdge = MAX_EDGE): Vec3[] {
  const points = ringVectors(ring)
  const minDot = Math.cos(maxEdge)
  const result: Vec3[] = []
  points.forEach((a, i) => {
    const b = points[(i + 1) % points.length]
    result.push(a)
    let segment: Vec3[] = [a, b]
    while (segment.some((p, j) => j > 0 && dot(segment[j - 1], p) < minDot)) {
      segment = segment.flatMap((p, j) => (j === 0 ? [p] : [midpoint(segment[j - 1], p), p]))
    }
    result.push(...segment.slice(1, -1))
  })
  return result
}
