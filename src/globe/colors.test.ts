import { describe, expect, it } from 'vitest'
import { countries } from '../countries'
import { countryColor, type ColorState } from './colors'
import { CLASSIC, POLITICAL, heatColor } from './themes'

const denmark = countries.find((c) => c.properties.name === 'Denmark')!
const state = (overrides: Partial<ColorState> = {}): ColorState => ({
  theme: CLASSIC,
  hovered: null,
  visited: new Set(),
  highlights: new Map(),
  ...overrides,
})

describe('countryColor', () => {
  it('uses the land color by default', () => {
    expect(countryColor(denmark, state())).toBe(CLASSIC.land)
  })

  it('marks visited countries', () => {
    expect(countryColor(denmark, state({ visited: new Set(['Denmark']) }))).toBe(CLASSIC.visited)
  })

  it('marks countries on the wishlist, below visited', () => {
    expect(countryColor(denmark, state({ wishlist: new Set(['Denmark']) }))).toBe(CLASSIC.wishlist)
    expect(countryColor(denmark, state({ visited: new Set(['Denmark']), wishlist: new Set(['Denmark']) }))).toBe(CLASSIC.visited)
    expect(countryColor(denmark, state({ hovered: denmark, wishlist: new Set(['Denmark']) }))).toBe(CLASSIC.hover)
  })

  it('shades visited countries by their visits on the heat map, from their own land color', () => {
    const visited = new Set(['Denmark'])
    expect(countryColor(denmark, state({ visited, visits: () => 2 }))).toBe(heatColor(CLASSIC, CLASSIC.land as string, 2))
    const palette = POLITICAL.land as readonly string[]
    expect(countryColor(denmark, state({ theme: POLITICAL, visited, visits: () => 1 }))).toBe(
      heatColor(POLITICAL, palette[denmark.properties.mapColor], 1),
    )
    // Only visited countries
    expect(countryColor(denmark, state({ visits: () => 3 }))).toBe(CLASSIC.land)
  })

  it('lets hover override visited', () => {
    expect(countryColor(denmark, state({ hovered: denmark, visited: new Set(['Denmark']) }))).toBe(CLASSIC.hover)
  })

  it('lets highlights, like game answers, override everything', () => {
    const s = state({
      hovered: denmark,
      visited: new Set(['Denmark']),
      highlights: new Map([[denmark, '#00ff00']]),
    })
    expect(countryColor(denmark, s)).toBe('#00ff00')
  })

  it('picks the map color from multi-colored designs', () => {
    const palette = POLITICAL.land as readonly string[]
    expect(countryColor(denmark, state({ theme: POLITICAL }))).toBe(palette[denmark.properties.mapColor])
  })
})
