import { geoDistance } from 'd3-geo'
import type { City } from './cities'

/** A flight you've taken, between two cities (GeoNames ids) */
export type Flight = { id: string; from: number; to: number }

const EARTH_KM = 6371
/** Once around the Earth at the equator */
export const EARTH_CIRCUMFERENCE_KM = 40_075

/** Great-circle distance, as the plane flies */
export const distanceKm = (from: City, to: City) => geoDistance([from.lng, from.lat], [to.lng, to.lat]) * EARTH_KM

/** A flight with its cities looked up, or null if one isn't in the city list any more */
export function routeOf(flight: Flight, cityById: ReadonlyMap<number, City>) {
  const from = cityById.get(flight.from)
  const to = cityById.get(flight.to)
  return from && to ? { flight, from, to, km: distanceKm(from, to) } : null
}

export type Route = NonNullable<ReturnType<typeof routeOf>>

/** How many flights, how far in all, and how many times around the Earth that is */
export function flightStats(routes: readonly Route[]) {
  const km = routes.reduce((sum, route) => sum + route.km, 0)
  return { flights: routes.length, km, aroundEarth: km / EARTH_CIRCUMFERENCE_KM }
}

/** One arc per pair of cities, whichever way and however often it was flown */
export function uniqueRoutes(routes: readonly Route[]) {
  const seen = new Map<string, Route>()
  for (const route of routes) {
    const key = [route.from.id, route.to.id].sort((a, b) => a - b).join('-')
    if (!seen.has(key)) seen.set(key, route)
  }
  return [...seen.values()]
}

const whole = new Intl.NumberFormat('en-US')
const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumSignificantDigits: 3 })

/** "8,620 km", or "84.3K km" from 10,000 km */
export const formatDistance = (km: number) => `${km < 10_000 ? whole.format(Math.round(km)) : compact.format(km)} km`
