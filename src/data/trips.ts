import { cityOf, type Airport } from './airports'
import { distanceKm, type Route } from './flights'
import { newestFirst, partsOf, type VisitDate } from './visitDates'

/**
 * Trips, worked out from your flights: legs flown one after another, each
 * leaving where the last landed (the same airport, or one nearby) and within
 * about a month of it, or, dated, from somewhere you could have gone on to by
 * land. A trip ends once it's back where it started.
 */
export type Trip = {
  /** In the order flown */
  routes: Route[]
  /** When it started: its earliest leg's date; the legs of a trip are all dated, or none are */
  date: VisitDate | null
  /** When it ended: its latest leg's date */
  endDate: VisitDate | null
  km: number
}

/** Airports this close serve the same place: in by Narita and out by Haneda is still Tokyo */
const NEARBY_KM = 100

const samePlace = (a: Airport, b: Airport) => a.code === b.code || distanceKm(a, b) <= NEARBY_KM

/**
 * How far you might go on by land between two flights of a trip: in to Maputo, by bus to Inhambane, on from there.
 * Only for dated flights, within a month of each other: undated, any two would do
 */
const OVERLAND_KM = 1000

/**
 * Whether `next` carries on a trip: from where its last leg landed, or overland from near it, but not from where
 * it started (home again, so a new trip)
 */
function carriesOn(legs: readonly Route[], next: Route, { overland }: { overland: boolean }) {
  const last = legs.at(-1)!
  if (!closeInTime(last.flight.date, next.flight.date)) return false
  if (samePlace(last.to, next.from)) return true
  return (
    overland &&
    !!last.flight.date &&
    !!next.flight.date &&
    distanceKm(last.to, next.from) <= OVERLAND_KM &&
    !samePlace(legs[0].from, next.from)
  )
}

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
    // The latest trip that this flight carries on from where it landed, or else overland, else a new one
    const open = [...going].reverse()
    const carriedOn =
      open.find((legs) => carriesOn(legs, route, { overland: false })) ??
      open.find((legs) => carriesOn(legs, route, { overland: true }))
    const trip = carriedOn ?? []
    if (!carriedOn) {
      trips.push(trip)
      going.add(trip)
    }
    trip.push(route)
    if (samePlace(route.to, trip[0].from)) going.delete(trip)
  }
  return trips.map((legs) => {
    const dates = legs.flatMap((route) => route.flight.date ?? []).sort()
    return {
      routes: legs,
      date: dates[0] ?? null,
      endDate: dates.at(-1) ?? null,
      km: legs.reduce((sum, route) => sum + route.km, 0),
    }
  })
}

/**
 * Newest first, by when they started. Of trips that started the same month,
 * the one that ended later is the newer; of those that ended then too, the
 * one added later. Trips without a date come after them, the last added first.
 */
export function tripsByDate(trips: readonly Trip[]) {
  const added = new Map(trips.map((trip, i) => [trip, i]))
  const dated = trips
    .filter((t) => t.date)
    .sort((a, b) => newestFirst(a.date!, b.date!) || newestFirst(a.endDate!, b.endDate!) || added.get(b)! - added.get(a)!)
  return [...dated, ...trips.filter((t) => !t.date).reverse()]
}

/**
 * The cities a trip, or any flights one after another, stop at, in order: "Copenhagen", "Seoul", "Tokyo",
 * "Copenhagen"; and where it went on from by land: "Maputo", "Inhambane", "Maputo"
 */
export function stopsOf({ routes }: Pick<Trip, 'routes'>) {
  const stops = [cityOf(routes[0].from)]
  routes.forEach((route, i) => {
    if (i > 0 && !samePlace(routes[i - 1].to, route.from)) stops.push(cityOf(route.from))
    stops.push(cityOf(route.to))
  })
  return stops
}
