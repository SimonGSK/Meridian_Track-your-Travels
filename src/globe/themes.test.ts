import { describe, expect, it } from 'vitest'
import { Color } from 'three'
import { MAP_COLOR_COUNT } from '../countries'
import { DEFAULT_THEME, THEMES, heatColor, heatColors, hoveredRegionColor, landColor, themeById, visitedRegionColor } from './themes'

describe('themes', () => {
  it('has several designs with unique ids', () => {
    expect(THEMES.length).toBeGreaterThanOrEqual(4)
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(THEMES.length)
  })

  it.each(THEMES.map((t) => [t.name, t]))('%s uses valid colors', (_, theme) => {
    const colors = [theme.ocean, theme.border, theme.hover, theme.selected, theme.visited, theme.correct, theme.wrong, theme.background, theme.atmosphere]
    const land = typeof theme.land === 'string' ? [theme.land] : theme.land
    for (const color of [...colors, ...land]) expect(() => new Color(color)).not.toThrow()
  })

  it.each(THEMES.map((t) => [t.name, t]))('%s keeps hover, selected, visited and the wishlist distinct from land', (_, theme) => {
    const land = new Set(typeof theme.land === 'string' ? [theme.land] : theme.land)
    const marks = [theme.hover, theme.selected, theme.visited, theme.wishlist]
    for (const color of marks) expect(land.has(color)).toBe(false)
    expect(new Set(marks).size).toBe(4)
    expect(() => new Color(theme.wishlist)).not.toThrow()
  })

  it.each(THEMES.map((t) => [t.name, t]))('%s shows game answers in colors distinct from land and hover', (_, theme) => {
    const others = new Set([...(typeof theme.land === 'string' ? [theme.land] : theme.land), theme.hover, theme.selected])
    for (const color of [theme.correct, theme.wrong]) expect(others.has(color)).toBe(false)
    expect(theme.correct).not.toBe(theme.wrong)
  })

  it('has enough colors in every palette so neighbors never match', () => {
    for (const theme of THEMES) {
      if (typeof theme.land !== 'string') expect(theme.land.length).toBeGreaterThanOrEqual(MAP_COLOR_COUNT)
    }
  })

  it('shades visited states darker, also while their country is pointed at', () => {
    const lightness = (color: string) => new Color(color).getHSL({ h: 0, s: 0, l: 0 }).l
    expect(lightness(visitedRegionColor(DEFAULT_THEME))).toBeLessThan(lightness(DEFAULT_THEME.visited))
    expect(lightness(hoveredRegionColor(DEFAULT_THEME))).toBeLessThan(lightness(DEFAULT_THEME.hover))
  })

  it.each(THEMES.map((t) => [t.name, t]))('%s shades the heat map from near the land to the visited color', (_, theme) => {
    const shades = heatColors(theme)
    expect(shades).toHaveLength(4)
    expect(new Set(shades).size).toBe(4)
    expect(shades.at(-1)).toBe(theme.visited)
    // Each step is further from the land than the one before
    const land = new Color(typeof theme.land === 'string' ? theme.land : theme.land[0])
    const distance = (color: string) => {
      const c = new Color(color)
      return Math.hypot(c.r - land.r, c.g - land.g, c.b - land.b)
    }
    for (let i = 1; i < shades.length; i++) expect(distance(shades[i])).toBeGreaterThan(distance(shades[i - 1]))
  })

  it('shows four visits or more as the most, and no visits as one', () => {
    const land = DEFAULT_THEME.land as string
    expect(heatColor(DEFAULT_THEME, land, 9)).toBe(heatColor(DEFAULT_THEME, land, 4))
    expect(heatColor(DEFAULT_THEME, land, 0)).toBe(heatColor(DEFAULT_THEME, land, 1))
  })

  it('finds themes by id, falling back to the default', () => {
    expect(themeById('night').name).toBe('Night')
    expect(themeById('nope')).toBe(DEFAULT_THEME)
  })

  it('uses one land color or picks from the palette', () => {
    const single = THEMES.find((t) => typeof t.land === 'string')!
    const multi = THEMES.find((t) => typeof t.land !== 'string')!
    expect(landColor(single, 3)).toBe(single.land)
    expect(landColor(multi, 3)).toBe((multi.land as readonly string[])[3])
  })
})
