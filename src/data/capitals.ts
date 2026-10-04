import { countries, type CountryFeature } from '../countries'
import { factsOf } from './facts'
import { matchKey } from './names'

/**
 * Other names a capital goes by, and the other capitals of countries with
 * more than one, all right answers in the capital quiz.
 */
const ALSO_RIGHT: Record<string, string[]> = {
  'United States': ['Washington', 'Washington DC'],
  Ukraine: ['Kiev'],
  Albania: ['Tirane'],
  // Executive, legislative and judicial capitals
  'South Africa': ['Cape Town', 'Bloemfontein'],
  // The seat of government, and the constitutional capital
  Bolivia: ['Sucre'],
  // The official capital, beside Colombo
  'Sri Lanka': ['Sri Jayawardenepura Kotte', 'Kotte'],
  // The royal and legislative capital
  Eswatini: ['Lobamba'],
  Myanmar: ['Nay Pyi Taw'],
  Kazakhstan: ['Nur-Sultan'],
  India: ['Delhi'],
  Nauru: ['Yaren District'],
  Kiribati: ['South Tarawa'],
}

/** Their capitals are disputed, so a quiz would have to take a side: it leaves them out */
const DISPUTED = new Set(['Israel', 'Palestine'])

/** The capital the quiz asks for, or null for a territory, or a country it leaves out */
export function capitalOf(country: CountryFeature): string | null {
  if (country.properties.kind !== 'country' || DISPUTED.has(country.properties.name)) return null
  return factsOf(country)?.capital ?? null
}

let byCapital: Map<string, CountryFeature> | null = null

/** The country whose capital this is, by any of its names, ignoring case, accents and punctuation */
export function countryOfCapital(name: string): CountryFeature | null {
  if (!byCapital) {
    byCapital = new Map()
    for (const country of countries) {
      const capital = capitalOf(country)
      if (!capital) continue
      for (const known of [capital, ...(ALSO_RIGHT[country.properties.name] ?? [])]) byCapital.set(matchKey(known), country)
    }
  }
  return byCapital.get(matchKey(name)) ?? null
}
