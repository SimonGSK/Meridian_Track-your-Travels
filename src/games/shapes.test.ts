import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { countries } from '../countries'
import CountryShape from './CountryShape'
import { mainShape, shapePath } from './shapes'

const byName = (name: string) => countries.find((c) => c.properties.name === name)!
const partCount = (name: string) => mainShape(byName(name)).coordinates.length
const allParts = (name: string) => {
  const { geometry } = byName(name)
  return geometry.type === 'Polygon' ? 1 : geometry.coordinates.length
}

describe('mainShape', () => {
  it('leaves out far-off territories', () => {
    expect(partCount('France')).toBeLessThan(allParts('France')) // no French Guiana, Réunion, ...
    expect(partCount('United States')).toBeLessThan(allParts('United States')) // no Alaska, Hawaii
  })

  it('keeps nearby islands', () => {
    expect(partCount('Japan')).toBeGreaterThan(3)
    expect(partCount('Denmark')).toBeGreaterThan(1)
    const papua = mainShape(byName('Indonesia')).coordinates.some((rings) => rings[0].some(([lng]) => lng > 138))
    expect(papua).toBe(true)
  })
})

describe('shapePath', () => {
  it('draws the outline within the box', () => {
    const path = shapePath(byName('Italy'), 260, 190)
    expect(path).toMatch(/^M/)
    const numbers = path.match(/-?\d+(\.\d+)?/g)!.map(Number)
    const xs = numbers.filter((_, i) => i % 2 === 0)
    const ys = numbers.filter((_, i) => i % 2 === 1)
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(7.9)
    expect(Math.max(...xs)).toBeLessThanOrEqual(252.1)
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(7.9)
    expect(Math.max(...ys)).toBeLessThanOrEqual(182.1)
  })

  it('works for every country, including ones across the antimeridian', () => {
    for (const country of countries.filter((c) => c.properties.kind === 'country')) {
      expect(shapePath(country, 260, 190).length, country.properties.name).toBeGreaterThan(10)
    }
  })
})

describe('CountryShape', () => {
  it('shows the outline without naming the country', () => {
    const { container } = render(createElement(CountryShape, { country: byName('Chile') }))
    expect(screen.getByRole('img', { name: 'The outline to identify' })).toBeInTheDocument()
    expect(container.textContent).not.toContain('Chile')
  })
})
