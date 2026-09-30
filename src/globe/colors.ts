import type { CountryFeature } from '../countries'
import type { Theme } from './themes'

export type ColorState = {
  theme: Theme
  hovered: CountryFeature | null
  /** Names of countries the user has visited */
  visited: ReadonlySet<string>
  /** Temporary colors, e.g. right/wrong answers in a game */
  highlights: ReadonlyMap<CountryFeature, string>
}

/** The color a country is drawn in. Hover wins, then highlights, then visited. */
export function countryColor(country: CountryFeature, { theme, hovered, visited, highlights }: ColorState) {
  if (country === hovered) return theme.hover
  return highlights.get(country) ?? (visited.has(country.properties.name) ? theme.visited : theme.land)
}
