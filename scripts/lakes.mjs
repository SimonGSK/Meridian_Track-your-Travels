// Natural Earth's 1:50m lakes, and cutting them out of land shapes, for the
// data scripts. The country and state shapes cover their lakes; the lakes are
// a separate layer.
import { readFile } from 'node:fs/promises'
import { feature } from 'topojson-client'
import ClipperLib from 'clipper-lib'

const physical = JSON.parse(
  await readFile(new URL('../node_modules/sane-topojson/dist/world_50m.json', import.meta.url), 'utf8'),
)
/** Each lake's outline (they're all single polygons) */
export const lakes = feature(physical, physical.objects.lakes).features.map((f) => f.geometry.coordinates)

/** West, south, east, north of a polygon's outer ring, in degrees */
function boxOf([outer]) {
  let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity
  for (const [lng, lat] of outer) {
    west = Math.min(west, lng)
    east = Math.max(east, lng)
    south = Math.min(south, lat)
    north = Math.max(north, lat)
  }
  return [west, south, east, north]
}
const overlaps = (a, b) => a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3]
const lakeBoxes = lakes.map((lake) => ({ lake, box: boxOf(lake) }))

/** A path wound so that growing it grows the shape */
const outward = (path) => (ClipperLib.Clipper.Orientation(path) ? path : [...path].reverse())

/** Paths grown (or shrunk, for a negative `delta`) by `delta` grid steps, keeping sharp corners */
function offset(paths, delta) {
  const offsetter = new ClipperLib.ClipperOffset(4)
  offsetter.AddPaths(paths, ClipperLib.JoinType.jtMiter, ClipperLib.EndType.etClosedPolygon)
  const result = new ClipperLib.Paths()
  offsetter.Execute(result, delta)
  return result
}

/**
 * A Polygon or MultiPolygon with the lakes cut out, or the same geometry
 * when no lake touches it.
 *
 * Clipping happens on an integer grid (`grid`: { scale, translate } as in
 * TopoJSON), so points come back exactly as they were, and points along
 * borders that follow a parallel are kept: on the globe edges are great
 * circles, and without them those borders would bulge. Only the parts near
 * a lake are clipped; the rest is untouched.
 */
export function cutLakes(geometry, { scale: [kx, ky], translate: [dx, dy] }) {
  const toGrid = ([x, y]) => ({ X: Math.round((x - dx) / kx), Y: Math.round((y - dy) / ky) })
  // Points moved east of 180° (see below) go back where they were
  const east = Math.round((180 - dx) / kx)
  const aroundTheWorld = Math.round(360 / kx)
  // The same sum as topojson-client's, so the numbers match its decoding exactly
  const fromGrid = ({ X, Y }) => [(X > east ? X - aroundTheWorld : X) * kx + dx, Y * ky + dy]
  // Clipper's rings don't repeat their first point
  const toPath = (ring) => ring.slice(0, -1).map(toGrid)
  // Clipper's area is positive for counterclockwise paths
  const toRing = (path, clockwise) => {
    const ring = (ClipperLib.Clipper.Area(path) < 0 === clockwise ? path : [...path].reverse()).map(fromGrid)
    return [...ring, ring[0]]
  }

  const parts = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  let changed = false
  const result = parts.flatMap((original) => {
    let part = original
    let box = boxOf(part)
    if (box[2] - box[0] > 180) {
      // Across the antimeridian (Russia's mainland, with Chukotka): clip it with its eastern end past 180°
      part = part.map((ring) => ring.map(([lng, lat]) => [lng < 0 ? lng + 360 : lng, lat]))
      box = boxOf(part)
      // Around a pole (Antarctica): no lakes there
      if (box[2] - box[0] > 180) return [original]
    }
    const near = lakeBoxes.filter((l) => overlaps(box, l.box)).map((l) => l.lake[0])
    if (near.length === 0) return [original]
    if (near.length === 0) return [part]
    changed = true

    const { pftEvenOdd, pftNonZero } = ClipperLib.PolyFillType
    const { ptSubject, ptClip } = ClipperLib.PolyType
    // Lakes that touch (Michigan and Huron) become one, or a line of land would be left between them:
    // grown by a step of the grid they overlap and merge, then shrunk back
    const water = offset(offset(near.map(toPath).map(outward), 1), -1)

    const clipper = new ClipperLib.Clipper()
    clipper.PreserveCollinear = true
    clipper.AddPaths(part.map(toPath), ptSubject, true)
    clipper.AddPaths(water, ptClip, true)
    const tree = new ClipperLib.PolyTree()
    clipper.Execute(ClipperLib.ClipType.ctDifference, tree, pftEvenOdd, pftNonZero)
    const solid = (path) => Math.abs(ClipperLib.Clipper.Area(path)) >= 1
    // As d3-geo (and the map) wants them: outer rings clockwise, holes counterclockwise
    return ClipperLib.JS.PolyTreeToExPolygons(tree)
      .filter(({ outer }) => solid(outer))
      .map(({ outer, holes }) => [toRing(outer, true), ...holes.filter(solid).map((hole) => toRing(hole, false))])
  })
  if (!changed) return geometry
  return result.length === 1 ? { type: 'Polygon', coordinates: result[0] } : { type: 'MultiPolygon', coordinates: result }
}
