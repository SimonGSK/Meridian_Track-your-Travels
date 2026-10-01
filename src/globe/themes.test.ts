import { describe, expect, it } from 'vitest'
import { Color } from 'three'
import { MAP_COLOR_COUNT } from '../countries'
import { DEFAULT_THEME, THEMES, hoveredRegionColor, landColor, themeById, visitedRegionColor } from './themes'

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

  it.each(THEMES.map((t) => [t.name, t]))('%s keeps hover, selected and visited distinct from land', (_, theme) => {
    const land = new Set(typeof theme.land === 'string' ? [theme.land] : theme.land)
    for (const color of [theme.hover, theme.selected, theme.visited]) expect(land.has(color)).toBe(false)
    expect(new Set([theme.hover, theme.selected, theme.visited]).size).toBe(3)
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
