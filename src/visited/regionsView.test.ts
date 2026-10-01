import { describe, expect, it } from 'vitest'
import { countries } from '../countries'
import { loadRegions, regionsOf } from '../data/regions'
import { regionFills, regionOutlines, regionProgress } from './regionsView'

const regions = await loadRegions()
const country = (name: string) => countries.find((c) => c.properties.name === name)!
const region = (name: string) => regions.find((r) => r.properties.name === name)!
const names = (map: ReadonlyMap<{ properties: { name: string } }, string>) =>
  Object.fromEntries([...map].map(([r, color]) => [r.properties.name, color]))

const base = {
  regions,
  visitedRegions: new Set(['US-CA', 'US-TX', 'CA-QC']),
  isShownCountry: (c: { properties: { name: string } }) => c.properties.name === 'United States',
  editing: null,
  hovered: null,
  color: '#111111',
  hoverColor: '#ffff00',
}

describe('regionFills', () => {
  it('colors visited regions of shown countries', () => {
    expect(names(regionFills(base))).toEqual({ California: '#111111', Texas: '#111111' })
  })

  it("shows the regions of the country being edited, even if it isn't shown", () => {
    expect(names(regionFills({ ...base, isShownCountry: () => false, editing: country('Canada') }))).toEqual({
      Quebec: '#111111',
    })
  })

  it('highlights the region pointed at', () => {
    expect(names(regionFills({ ...base, hovered: region('Ohio') })).Ohio).toBe('#ffff00')
  })

  it('colors the visited regions of the country pointed at like the rest of it', () => {
    const hoveredCountry = country('United States')
    expect(names(regionFills({ ...base, hoveredCountry }))).toEqual({ California: '#ffff00', Texas: '#ffff00' })
    expect(names(regionFills({ ...base, hoveredCountry: country('Canada') }))).toEqual({
      California: '#111111',
      Texas: '#111111',
    })
  })

  it('keeps visited regions in their color while picking them', () => {
    const us = country('United States')
    expect(names(regionFills({ ...base, editing: us, hoveredCountry: us }))).toEqual({
      California: '#111111',
      Texas: '#111111',
    })
  })
})

describe('regionOutlines', () => {
  it('outlines the colored regions and all of the edited country', () => {
    const fills = regionFills(base)
    expect(regionOutlines(regions, fills, null)).toHaveLength(2)
    expect(regionOutlines(regions, fills, country('Australia'))).toHaveLength(2 + 9)
  })
})

describe('regionProgress', () => {
  it('counts visited regions of a country', () => {
    expect(regionProgress(regions, base.visitedRegions, country('United States'))).toEqual({ visited: 2, total: 51 })
    expect(regionProgress(regions, base.visitedRegions, country('Brazil'))).toEqual({
      visited: 0,
      total: regionsOf(regions, country('Brazil')).length,
    })
  })
})
