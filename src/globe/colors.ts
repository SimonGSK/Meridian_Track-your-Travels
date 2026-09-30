import type { CountryFeature } from '../countries'
import { landColor, type Theme } from './themes'

export type ColorState = {
  theme: Theme
  hovered: CountryFeature | null
  /** Names of countries the user has visited */
  visited: ReadonlySet<string>
  /** Temporary colors, e.g. right/wrong answers in a game */
  highlights: ReadonlyMap<CountryFeature, string>
}

/** The color a country is drawn in. Highlights (game answers) win, then hover, then visited. */
export function countryColor(country: CountryFeature, { theme, hovered, visited, highlights }: ColorState) {
  const highlight = highlights.get(country)
  if (highlight) return highlight
  if (country === hovered) return theme.hover
  if (visited.has(country.properties.name)) return theme.visited
  return landColor(theme, country.properties.mapColor)
}
