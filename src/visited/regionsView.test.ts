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
