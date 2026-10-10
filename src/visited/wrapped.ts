import type { CountryFeature } from '../countries'
import { cityOf } from '../data/airports'
import { EARTH_CIRCUMFERENCE_KM } from '../data/flights'
import { MONTHS } from '../data/visitDates'
import { viewOf } from '../globe/interaction'
import type { YearReview } from './yearInReview'

/**
 * A year, wrapped: what goes on its card, from its review. The places new
 * that year first, then those visited again, each by name.
 */
export type Wrapped = {
  year: number
  places: { country: CountryFeature; isNew: boolean }[]
  /** The countries been to, Greenland counting as Denmark */
  countries: number
  /** Places first visited that year, territories too: those in green */
  newPlaces: number
  continents: number
  flights: number
  km: number
  /** Times around the Earth */
  laps: number
  longest: { from: string; to: string; km: number } | null
  /** The month with the most places, if months are known */
  busiestMonth: { name: string; places: number } | null
  mostTravelled: boolean
  /** Where the card's globe looks from, at the year's places */
  view: { lat: number; lng: number }
}

const byName = (a: CountryFeature, b: CountryFeature) => a.properties.name.localeCompare(b.properties.name)

export function wrappedOf(review: YearReview): Wrapped {
  const { year, places, firstVisits, countryCount, continents, flights, km, longest, months, mostTravelled } = review
  const isNew = (c: CountryFeature) => firstVisits.has(c)
  const busiest = months
    .filter((m) => m.month !== null)
    .reduce<(typeof months)[number] | null>((best, m) => (!best || m.places.length > best.places.length ? m : best), null)
  const spots = places.map(({ properties: { centroid } }) => ({ lng: centroid[0], lat: centroid[1] }))
  return {
    year,
    places: [...places.filter(isNew).sort(byName), ...places.filter((c) => !isNew(c)).sort(byName)].map((country) => ({
      country,
      isNew: isNew(country),
    })),
    countries: countryCount,
    newPlaces: firstVisits.size,
    continents: continents.length,
    flights: flights.length,
    km,
    laps: km / EARTH_CIRCUMFERENCE_KM,
    longest: longest && { from: cityOf(longest.from), to: cityOf(longest.to), km: longest.km },
    busiestMonth: busiest && { name: MONTHS[busiest.month! - 1], places: busiest.places.length },
    mostTravelled,
    view: spots.length ? viewOf(spots) : { lat: 20, lng: 10 },
  }
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** The card in words, for screen readers and the share text: "In 2025: 12 countries, 5 new places, on 3 continents…" */
export function describeWrapped(w: Wrapped) {
  const fresh = w.newPlaces > 0 ? `, ${plural(w.newPlaces, 'new place')}` : ''
  const lines = [`In ${w.year}: ${plural(w.countries, 'country', 'countries')}${fresh}, on ${plural(w.continents, 'continent')}.`]
  if (w.flights) lines.push(`${plural(w.flights, 'flight')}, ${Math.round(w.km).toLocaleString('en-US')} km.`)
  if (w.longest) lines.push(`Longest flight: ${w.longest.from} to ${w.longest.to}.`)
  return lines.join(' ')
}
