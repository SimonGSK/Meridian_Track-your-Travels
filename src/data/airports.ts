import { geoDistance } from 'd3-geo'
import isoNames from 'i18n-iso-countries/langs/en.json'
import { countries } from '../countries'
import { normalizeName } from './names'

/**
 * Airports with scheduled flights and an IATA code, from OurAirports
 * (public domain), via `npm run data:airports`: every international
 * airport, and the regional ones with airline service.
 */
export type Airport = {
  /** IATA code, e.g. "CPH" */
  code: string
  name: string
  /** The city it serves, e.g. "Sydney (Mascot)" */
  city: string
  /** ISO alpha-2 code */
  country: string
  lat: number
  lng: number
  /** The big ones, for ranking */
  large?: true
}

/** The airports, loaded on demand like the cities */
export const loadAirports = () => import('./airports.json').then((m) => m.default as Airport[])

/** "Sydney (Mascot)" → "Sydney" */
export const cityOf = (airport: Airport) => airport.city.replace(/\s*\(.*\)$/, '')

/** The app's name for each code: the country, else the territory with it ("Greenland") */
const placeNames = new Map<string, string>()
const isCountry = (place: (typeof countries)[number]) => Number(place.properties.kind === 'country')
for (const place of [...countries].sort((a, b) => isCountry(b) - isCountry(a))) {
  const code = place.properties.isoAlpha2
  if (code && !placeNames.has(code)) placeNames.set(code, place.properties.name)
}
const isoName = (code: string) => {
  const name = (isoNames.countries as Record<string, string | string[]>)[code]
  return Array.isArray(name) ? name[0] : name
}

/** "Denmark", "Greenland", or for places the map draws as part of another, their own name ("Reunion") */
export const countryOf = (airport: Airport) => placeNames.get(airport.country) ?? isoName(airport.country) ?? airport.country

/**
 * Airports matching what's typed, best first: the airport with that code,
 * then those of a city starting with it, then those with a word of their
 * name starting with it; big airports first.
 */
export function findAirports(airports: readonly Airport[], query: string, limit = 6) {
  const wanted = normalizeName(query)
  if (!wanted) return []
  const code = query.trim().toUpperCase()
  const words = (text: string) => normalizeName(text).split(/[\s(/-]+/)
  return airports
    .map((airport) => {
      const rank =
        airport.code === code
          ? 0
          : normalizeName(airport.city).startsWith(wanted)
            ? 1
            : [...words(airport.city), ...words(airport.name)].some((word) => word.startsWith(wanted))
              ? 2
              : -1
      return { airport, rank }
    })
    .filter(({ rank }) => rank >= 0)
    .sort((a, b) => a.rank - b.rank || Number(!!b.airport.large) - Number(!!a.airport.large) || a.airport.name.localeCompare(b.airport.name))
    .slice(0, limit)
    .map(({ airport }) => airport)
}

const EARTH_KM = 6371

/** The airport serving a place: the nearest big one within 100 km, else the nearest of any */
export function nearestAirport(airports: readonly Airport[], place: { lat: number; lng: number }, withinKm = 100) {
  const distance = (airport: Airport) => geoDistance([place.lng, place.lat], [airport.lng, airport.lat]) * EARTH_KM
  const near = airports.filter((airport) => distance(airport) <= withinKm).sort((a, b) => distance(a) - distance(b))
  return near.find((airport) => airport.large) ?? near[0] ?? null
}
