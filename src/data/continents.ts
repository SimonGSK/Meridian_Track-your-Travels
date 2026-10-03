import flagCountries from 'flag-icons/country.json'

export const CONTINENTS = ['Africa', 'Antarctica', 'Asia', 'Europe', 'North America', 'Oceania', 'South America'] as const
export type Continent = (typeof CONTINENTS)[number]

/** Continents from flag-icons' country data, by ISO 3166-1 alpha-2 code */
const BY_CODE = new Map(
  (flagCountries as { code: string; continent?: string }[]).map((c) => [c.code.toUpperCase(), c.continent]),
)

const CODE_OVERRIDES: Record<string, Continent> = {
  // flag-icons puts these Caribbean islands on the South American shelf; they're usually counted as North America
  AW: 'North America',
  BQ: 'North America',
  CW: 'North America',
  TT: 'North America',
  AQ: 'Antarctica',
  HM: 'Antarctica',
}

/** Places without an ISO code, by their name in the map data */
const NAME_OVERRIDES: Record<string, Continent> = {
  'Siachen Glacier': 'Asia',
  'Indian Ocean Ter.': 'Oceania', // Australian territories
}

const isContinent = (value: unknown): value is Continent => CONTINENTS.includes(value as Continent)

export function continentOf(mapName: string, isoAlpha2: string | null): Continent {
  const continent = NAME_OVERRIDES[mapName] ?? (isoAlpha2 && (CODE_OVERRIDES[isoAlpha2] ?? BY_CODE.get(isoAlpha2)))
  if (!isContinent(continent)) throw new Error(`No continent for ${mapName}`)
  return continent
}
