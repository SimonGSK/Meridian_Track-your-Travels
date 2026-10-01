import type { CountryFeature } from '../countries'
import rawFacts from './country-facts.json'
import { sharesCode } from './names'

/**
 * Capital, population and area, from the World Bank's open data (CC BY 4.0)
 * via `npm run data:facts`, with places it doesn't cover filled in from
 * country-facts-extra.json and marked as estimates.
 */
export type CountryFacts = {
  capital: string | null
  population: number | null
  populationYear?: number | null
  areaKm2?: number | null
  source: 'World Bank' | 'Estimate'
  /** e.g. "Figures include Somaliland" or "No permanent population" */
  note?: string
}

const facts = rawFacts as Record<string, CountryFacts>

/** Facts are keyed by ISO alpha-2 code, or by map name for places without their own code. */
export function factsOf(country: CountryFeature): CountryFacts | null {
  const { isoAlpha2, mapName } = country.properties
  const key = isoAlpha2 && !sharesCode(mapName) ? isoAlpha2 : mapName
  return facts[key] ?? null
}

const whole = new Intl.NumberFormat('en-US')
const oneDecimal = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })
const twoDecimals = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })

/** "1.45 billion", "5.98 million", "103,267" */
export function formatPopulation(population: number) {
  if (population >= 1e9) return `${twoDecimals.format(population / 1e9)} billion`
  if (population >= 1e6) return `${twoDecimals.format(population / 1e6)} million`
  return whole.format(population)
}

/** "42,920 km²", "2.5 km²", "0.49 km²" */
export function formatArea(km2: number) {
  const format = km2 < 1 ? twoDecimals : km2 < 10 ? oneDecimal : whole
  return `${format.format(km2)} km²`
}
