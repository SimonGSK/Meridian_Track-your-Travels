import { geoCentroid, geoDistance, geoInterpolate } from 'd3-geo'
import { cityOf, type Airport } from './airports'
import { distanceKm, type Route } from './flights'
import { newestFirst, partsOf, type VisitDate } from './visitDates'

/**
 * Trips, worked out from your flights: legs flown one after another, each
 * leaving where the last landed (the same airport, or one nearby) and within
 * about a month of it. A trip ends once it's back where it started.
 */
export type Trip = {
  /** In the order flown */
  routes: Route[]
  /** The first leg's date; the legs of a trip are all dated, or none are */
  date: VisitDate | null
  km: number
}

/** Airports this close serve the same place: in by Narita and out by Haneda is still Tokyo */
const NEARBY_KM = 100

const samePlace = (a: Airport, b: Airport) => a.code === b.code || distanceKm(a, b) <= NEARBY_KM

/** Within a month of each other, or the same year when one has only the year; both undated counts too */
function closeInTime(a: VisitDate | undefined, b: VisitDate | undefined) {
  if (!a || !b) return !a && !b
  const [x, y] = [partsOf(a), partsOf(b)]
  if (x.month === null || y.month === null) return x.year === y.year
  return Math.abs(x.year * 12 + x.month - (y.year * 12 + y.month)) <= 1
}

/** Your flights as trips, in the order the first leg of each was added */
export function tripsOf(routes: readonly Route[]): Trip[] {
  const trips: Route[][] = []
  // Trips not back where they started yet, which a flight can carry on
  const going = new Set<Route[]>()
  for (const route of routes) {
    // The latest trip that this flight carries on, else a new one
    const carriedOn = [...going].reverse().find((legs) => {
      const last = legs.at(-1)!
      return samePlace(last.to, route.from) && closeInTime(last.flight.date, route.flight.date)
    })
    const trip = carriedOn ?? []
    if (!carriedOn) {
      trips.push(trip)
      going.add(trip)
    }
    trip.push(route)
    if (samePlace(route.to, trip[0].from)) going.delete(trip)
  }
  return trips.map((legs) => ({
    routes: legs,
    date: legs[0].flight.date ?? null,
    km: legs.reduce((sum, route) => sum + route.km, 0),
  }))
}

/** Newest first; trips without a date after them, the last added first */
export function tripsByDate(trips: readonly Trip[]) {
  const dated = trips.filter((t) => t.date).sort((a, b) => newestFirst(a.date!, b.date!))
  return [...dated, ...trips.filter((t) => !t.date).reverse()]
}

/** The cities a trip stops at, in order: "Copenhagen", "Seoul", "Tokyo", "Copenhagen" */
export const stopsOf = (trip: Trip) => [cityOf(trip.routes[0].from), ...trip.routes.map((route) => cityOf(route.to))]

/**
 * Where to look from to see routes whole: the middle of them, and how wide
 * they spread, in degrees, with room for the arcs rising above them
 */
export function viewOfRoutes(routes: readonly Route[]) {
  const points = routes.flatMap((route): [number, number][] => {
    const [from, to]: [number, number][] = [
      [route.from.lng, route.from.lat],
      [route.to.lng, route.to.lat],
    ]
    return [from, geoInterpolate(from, to)(0.5), to]
  })
  const [lng, lat] = geoCentroid({ type: 'MultiPoint', coordinates: points })
  // Routes all around the world have no middle: look from the first, as far out as it goes
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return { lat: points[0][1], lng: points[0][0], extent: 360 }
  const spread = Math.max(...points.map((point) => geoDistance([lng, lat], point))) * (180 / Math.PI)
  return { lat, lng, extent: spread * 2 * 1.3 }
}
