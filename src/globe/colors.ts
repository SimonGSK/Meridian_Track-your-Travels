import type { CountryFeature } from '../countries'
import { heatColor, landColor, type Theme } from './themes'

export type ColorState = {
  theme: Theme
  hovered: CountryFeature | null
  /** Names of countries the user has visited */
  visited: ReadonlySet<string>
  /** Names of countries the user wants to visit */
  wishlist?: ReadonlySet<string>
  /** For the heat map: how many times a visited country was visited */
  visits?: (name: string) => number
  /** Colors by name, over visited: comparing with a friend */
  marked?: ReadonlyMap<string, string>
  /** Temporary colors, e.g. right/wrong answers in a game */
  highlights: ReadonlyMap<CountryFeature, string>
}

/**
 * The color a country is drawn in. Highlights (game answers) win, then
 * hover, then colors by name (a friend's), then visited, then the wishlist.
 */
export function countryColor(country: CountryFeature, state: ColorState) {
  const { theme, hovered, visited, wishlist, visits, marked, highlights } = state
  const highlight = highlights.get(country)
  if (highlight) return highlight
  if (country === hovered) return theme.hover
  const mark = marked?.get(country.properties.name)
  if (mark) return mark
  if (visited.has(country.properties.name)) {
    return visits ? heatColor(theme, landColor(theme, country.properties.mapColor), visits(country.properties.name)) : theme.visited
  }
  if (wishlist?.has(country.properties.name)) return theme.wishlist
  return landColor(theme, country.properties.mapColor)
}
