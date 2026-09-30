import type { Feature, LineString, MultiPolygon, Polygon, Position } from 'geojson'

/**
 * Natural Earth draws Western Sahara as only the inland strip east of the
 * Moroccan-built sand wall, and counts the coastal part as Morocco. We show
 * the whole territory, bordering Morocco along 27°40′N, as the UN and most
 * maps do.
 */

/** Just below the data's 27°40′N border line (27.657°), so the split falls cleanly between its points. */
export const BORDER_LATITUDE = 27.656

type Shape = Feature<Polygon | MultiPolygon, { name: string }>

/** Clips a ring to the part north (or south) of a latitude. Keeps the ring's winding. */
export function clipRing(ring: Position[], latitude: number, keep: 'north' | 'south'): Position[] {
  const inside = ([, lat]: Position) => (keep === 'north' ? lat >= latitude : lat <= latitude)
  const crossing = (a: Position, b: Position): Position => {
    const t = (latitude - a[1]) / (b[1] - a[1])
    return [a[0] + t * (b[0] - a[0]), latitude]
  }
  const points = ring.slice(0, -1) // without the closing point
  const result: Position[] = []
  points.forEach((current, i) => {
    const previous = points[(i + points.length - 1) % points.length]
    if (inside(current)) {
      if (!inside(previous)) result.push(crossing(previous, current))
      result.push(current)
    } else if (inside(previous)) {
      result.push(crossing(previous, current))
    }
  })
  return result.length ? [...result, result[0]] : []
}

/** Moves the part of Morocco south of the border into Western Sahara. */
export function fixWesternSahara<T extends Shape>(shapes: T[]): T[] {
  const morocco = shapes.find((s) => s.properties.name === 'Morocco')
  const sahara = shapes.find((s) => s.properties.name === 'W. Sahara')
  if (!morocco || !sahara || morocco.geometry.type !== 'Polygon' || sahara.geometry.type !== 'Polygon') return shapes

  const [outline] = morocco.geometry.coordinates
  const north = clipRing(outline, BORDER_LATITUDE, 'north')
  const south = clipRing(outline, BORDER_LATITUDE, 'south')

  return shapes.map((s) => {
    if (s === morocco) return { ...s, geometry: { type: 'Polygon', coordinates: [north] } }
    if (s === sahara) {
      return { ...s, geometry: { type: 'MultiPolygon', coordinates: [sahara.geometry.coordinates, [south]] } }
    }
    return s
  }) as T[]
}

/** The corrected Morocco–Western Sahara border, from the coast to the Algerian border. */
export function westernSaharaBorder(shapes: Shape[]): LineString | null {
  const morocco = shapes.find((s) => s.properties.name === 'Morocco')
  if (!morocco || morocco.geometry.type !== 'Polygon') return null
  const onBorder = morocco.geometry.coordinates[0].filter(([, lat]) => Math.abs(lat - BORDER_LATITUDE) < 1e-9)
  if (onBorder.length < 2) return null
  const lngs = onBorder.map(([lng]) => lng)
  const [west, east] = [Math.min(...lngs), Math.max(...lngs)]
  // Follow the parallel rather than a great circle
  const steps = Math.ceil((east - west) / 0.5)
  const line: Position[] = Array.from({ length: steps + 1 }, (_, i) => [west + ((east - west) * i) / steps, BORDER_LATITUDE])
  // The last stretch to the Algerian border is part of the data's own border line
  return { type: 'LineString', coordinates: [...line, [-8.685, 27.657]] }
}
