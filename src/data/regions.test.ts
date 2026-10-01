import { describe, expect, it } from 'vitest'
import { countries } from '../countries'
import { findRegionAt, hasRegions, loadRegions, parseRegions, regionsLabel, regionsOf } from './regions'

const byName = (name: string) => countries.find((c) => c.properties.name === name)!
const regions = await loadRegions()
const nameAt = (lat: number, lng: number, country: string) =>
  findRegionAt(regionsOf(regions, byName(country)), lat, lng)?.properties.name ?? null

describe('regions', () => {
  it('has the states and provinces of the USA, Canada, Australia and Brazil, all named', () => {
    const count = (country: string) => regionsOf(regions, byName(country)).length
    expect(count('United States')).toBe(51) // with D.C.
    expect(count('Canada')).toBe(13)
    expect(count('Australia')).toBe(9)
    expect(count('Brazil')).toBe(27)
    for (const r of regions) expect(r.properties.name).toBeTruthy()
    expect(new Set(regions.map((r) => r.properties.id)).size).toBe(regions.length)
  })

  it('knows which countries have them, and what they are called', () => {
    expect(hasRegions(byName('United States'))).toBe(true)
    expect(hasRegions(byName('Denmark'))).toBe(false)
    expect(hasRegions(byName('Ashmore and Cartier Islands'))).toBe(false) // shares Australia's code
    expect(regionsLabel(byName('Canada'))).toBe('Provinces and territories')
    expect(regionsLabel(byName('Australia'))).toBe('States and territories')
  })

  it('lists them alphabetically, with ids like "US-CA"', () => {
    const us = regionsOf(regions, byName('United States'))
    expect(us[0].properties.name).toBe('Alabama')
    expect(us.find((r) => r.properties.name === 'California')?.properties.id).toBe('US-CA')
  })
})

describe('findRegionAt', () => {
  it.each([
    [36.7, -119.4, 'United States', 'California'],
    [31, -99, 'United States', 'Texas'],
    [21.3, -157.8, 'United States', 'Hawaii'],
    [64.8, -147.7, 'United States', 'Alaska'],
    [52, -72, 'Canada', 'Quebec'],
    [-42.9, 147.3, 'Australia', 'Tasmania'],
    [-23.5, -46.6, 'Brazil', 'São Paulo'],
  ])('finds the region at %s, %s in %s', (lat, lng, country, expected) => {
    expect(nameAt(lat, lng, country)).toBe(expected)
  })

  it('returns null outside every region', () => {
    expect(nameAt(30, -40, 'United States')).toBeNull()
  })

  it('leaves lakes out', () => {
    expect(nameAt(52.5, -97.5, 'Canada')).toBeNull() // Lake Winnipeg
    expect(nameAt(49.9, -97.14, 'Canada')).toBe('Manitoba') // Winnipeg
    expect(nameAt(41.1, -112.5, 'United States')).toBeNull() // Great Salt Lake
    expect(nameAt(40.76, -111.89, 'United States')).toBe('Utah') // Salt Lake City
    expect(nameAt(48.95, -110, 'United States')).toBe('Montana') // its border along the 49th parallel stays put
  })
})

describe('parseRegions', () => {
  it('refuses a region without a name', () => {
    const raw = {
      type: 'FeatureCollection' as const,
      features: [{ type: 'Feature' as const, properties: { country: 'USA', code: 'XX' }, geometry: { type: 'Polygon' as const, coordinates: [] } }],
    }
    expect(() => parseRegions(raw)).toThrow('No name for region USA-XX')
  })
})
