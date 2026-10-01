import { countries, type CountryFeature } from '../countries'
import { placeKey } from './facts'

/**
 * The big and well-known cities of each place, from GeoNames (CC BY 4.0),
 * picked by scripts/extract-cities.mjs (`npm run data:cities`).
 */
export type City = {
  /** GeoNames id */
  id: number
  name: string
  /** The place it's in on the map: an ISO alpha-2 code, or a map name (see placeKey) */
  place: string
  lat: number
  lng: number
  population: number
  capital?: true
}

/** The cities, loaded on demand like the region shapes */
export const loadCities = () => import('./cities.json').then((m) => m.default as City[])

/** A country's cities: the capital first, then the biggest */
export const citiesOf = (cities: readonly City[], country: CountryFeature) => {
  const key = placeKey(country)
  return cities
    .filter((c) => c.place === key)
    .sort((a, b) => Number(!!b.capital) - Number(!!a.capital) || b.population - a.population)
}

let countryByKey: Map<string, CountryFeature> | null = null

/** The country a city is in */
export function countryOfCity(city: City): CountryFeature | null {
  countryByKey ??= new Map(countries.map((c) => [placeKey(c), c]))
  return countryByKey.get(city.place) ?? null
}

/** "1 city", "4 cities" */
export const citiesLabel = (count: number) => `${count} ${count === 1 ? 'city' : 'cities'}`
