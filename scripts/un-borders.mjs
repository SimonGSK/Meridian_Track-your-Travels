// Borders as the UN counts them, for the map script. Natural Earth draws
// borders as they are on the ground; where the UN counts land as another
// country's, the map follows the UN. (Western Sahara is in
// src/data/westernSahara.ts; disputes the UN takes no side in, like
// Kashmir, stay as drawn.)
import ClipperLib from 'clipper-lib'
import { geoContains } from 'd3-geo'
import { gridOf, polygonsOf } from './lakes.mjs'

/** Places drawn on their own that the UN counts as part of a country */
export const PART_OF = {
  // Self-governing since 1991, but recognized by few countries
  Somaliland: 'Somalia',
  // Run separately since 1974, and recognized only by Turkey
  'N. Cyprus': 'Cyprus',
  // Held by the UK; General Assembly resolution 73/295 (2019) counts the Chagos Archipelago as Mauritius's
  'Br. Indian Ocean Ter.': 'Mauritius',
}

/** Land one country holds that the UN counts as another's */
export const MOVED = [
  // Annexed by Russia in 2014; General Assembly resolution 68/262 affirms Ukraine's borders.
  // A piece of Russia's shape of its own, found by a point in it
  { name: 'Crimea', from: 'Russia', to: 'Ukraine', at: [34.1, 44.95] },
  // Held by Israel since 1967; Security Council resolution 497 counts it as Syria's. Everything of
  // Israel's east of the 1967 line, along the Jordan and the Sea of Galilee's eastern shore
  {
    name: 'Golan Heights',
    from: 'Israel',
    to: 'Syria',
    area: [
      [35.63, 33.5], [35.63, 33.3], [35.64, 33.24], [35.635, 33.1], [35.63, 32.92], [35.645, 32.87],
      [35.65, 32.8], [35.645, 32.74], [35.63, 32.7], [35.62, 32.66], [36.3, 32.66], [36.3, 33.5], [35.63, 33.5],
    ],
  },
]

const partsOf = (geometry) => (geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates)
const geometryOf = (polygons) =>
  polygons.length === 1 ? { type: 'Polygon', coordinates: polygons[0] } : { type: 'MultiPolygon', coordinates: polygons }

/**
 * The map's features with the borders above, on the map's grid. Joined
 * shapes become one, without the line between.
 */
export function followTheUn(features, grid) {
  const { toPath, toRing } = gridOf(grid)
  const { pftEvenOdd, pftNonZero } = ClipperLib.PolyFillType
  const clip = (type, polygons, area = null) => {
    const clipper = new ClipperLib.Clipper()
    clipper.PreserveCollinear = true
    clipper.AddPaths(polygons.flat().map(toPath), ClipperLib.PolyType.ptSubject, true)
    if (area) clipper.AddPaths([toPath(area)], ClipperLib.PolyType.ptClip, true)
    const tree = new ClipperLib.PolyTree()
    clipper.Execute(type, tree, pftEvenOdd, pftNonZero)
    return polygonsOf(tree, toRing)
  }
  const { ctUnion, ctIntersection, ctDifference } = ClipperLib.ClipType

  const byName = new Map(features.map((f) => [f.properties.name, f]))
  const shape = (name) => {
    const found = byName.get(name)
    if (!found) throw new Error(`No ${name} on the map`)
    return partsOf(found.geometry)
  }
  const reshape = (name, polygons) => {
    const f = byName.get(name)
    byName.set(name, { ...f, geometry: geometryOf(polygons) })
  }

  for (const { name, from, to, at, area } of MOVED) {
    if (at) {
      const piece = shape(from).find((polygon) => geoContains({ type: 'Polygon', coordinates: polygon }, at))
      if (!piece) throw new Error(`No ${name} in ${from}`)
      reshape(from, shape(from).filter((polygon) => polygon !== piece))
      reshape(to, clip(ctUnion, [...shape(to), piece]))
    } else {
      const piece = clip(ctIntersection, shape(from), area)
      if (piece.length === 0) throw new Error(`No ${name} in ${from}`)
      reshape(from, clip(ctDifference, shape(from), area))
      reshape(to, clip(ctUnion, [...shape(to), ...piece]))
    }
  }
  for (const [part, country] of Object.entries(PART_OF)) {
    reshape(country, clip(ctUnion, [...shape(country), ...shape(part)]))
    byName.delete(part)
  }
  return features.filter((f) => byName.has(f.properties.name)).map((f) => byName.get(f.properties.name))
}
