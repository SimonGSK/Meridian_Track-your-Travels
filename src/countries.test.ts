import { describe, expect, it } from 'vitest'
import { neighbors } from 'topojson-client'
import type { GeometryCollection, Topology } from 'topojson-specification'
import worldData from 'world-atlas/countries-50m.json'
import { MAP_COLOR_COUNT, borders, countries, findCountryAt } from './countries'

const nameAt = (lat: number, lng: number) => findCountryAt(lat, lng)?.properties.name ?? null

describe('countries', () => {
  it('loads every country with a unique name', () => {
    expect(countries.length).toBeGreaterThan(200)
    const names = countries.map((c) => c.properties.name)
    expect(new Set(names).size).toBe(names.length)
    for (const name of names) expect(name).toBeTruthy()
  })

  it('uses 3-digit ISO numeric codes, or null where none exists', () => {
    const byName = (name: string) => countries.find((c) => c.properties.name === name)!
    expect(byName('Denmark').properties.isoCode).toBe('208')
    expect(byName('Kosovo').properties.isoCode).toBeNull()
    for (const { properties } of countries) {
      if (properties.isoCode !== null) expect(properties.isoCode).toMatch(/^\d{3}$/)
    }
  })

  it('has ISO alpha-2 codes for flags, including Kosovo', () => {
    const byName = (name: string) => countries.find((c) => c.properties.name === name)!
    expect(byName('Denmark').properties.isoAlpha2).toBe('DK')
    expect(byName('Kosovo').properties.isoAlpha2).toBe('XK')
    expect(byName('Somaliland').properties.isoAlpha2).toBeNull()
    for (const { properties } of countries) {
      if (properties.isoCode !== null) expect(properties.isoAlpha2).toMatch(/^[A-Z]{2}$/)
    }
  })

  it('leaves out Antarctica', () => {
    expect(countries.find((c) => c.properties.name === 'Antarctica')).toBeUndefined()
  })

  it('centers countries on their main landmass, not their overseas parts', () => {
    for (const name of ['France', 'Netherlands', 'United States of America', 'Fiji', 'Kiribati', 'Denmark']) {
      const country = countries.find((c) => c.properties.name === name)!
      const [lng, lat] = country.properties.centroid
      expect(nameAt(lat, lng)).toBe(name)
    }
  })

  it('gives neighboring countries different map colors', () => {
    const topology = worldData as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>
    const geometries = topology.objects.countries.geometries
    const colorOf = new Map(countries.map((c) => [c.properties.name, c.properties.mapColor]))
    const clashes: string[] = []
    neighbors(geometries).forEach((adjacent, i) => {
      for (const j of adjacent) {
        const nameOf = (k: number) => (geometries[k].properties as { name: string }).name
        const [a, b] = [nameOf(i), nameOf(j)]
        if (colorOf.has(a) && colorOf.get(a) === colorOf.get(b)) clashes.push(`${a}/${b}`)
      }
    })
    expect(clashes).toEqual([])
    for (const c of countries) {
      expect(c.properties.mapColor).toBeGreaterThanOrEqual(0)
      expect(c.properties.mapColor).toBeLessThan(MAP_COLOR_COUNT)
    }
  })

  it('measures the size of each main landmass', () => {
    const extent = (name: string) => countries.find((c) => c.properties.name === name)!.properties.extent
    expect(extent('Russia')).toBeGreaterThan(extent('France'))
    expect(extent('France')).toBeGreaterThan(extent('Denmark'))
    expect(extent('France')).toBeLessThan(15) // not stretched by French Guiana
    expect(extent('Fiji')).toBeLessThan(5) // not stretched across the antimeridian
  })

  it('builds a border line set', () => {
    expect(borders.type).toBe('MultiLineString')
    expect(borders.coordinates.length).toBeGreaterThan(100)
  })
})

describe('findCountryAt', () => {
  it.each([
    ['central Jutland', 56.17, 9.55, 'Denmark'],
    ['Paris', 48.86, 2.35, 'France'],
    ['Tokyo', 35.68, 139.69, 'Japan'],
    ['Nairobi', -1.29, 36.82, 'Kenya'],
    ['Buenos Aires', -34.6, -58.38, 'Argentina'],
    ['Maseru (enclave inside South Africa)', -29.31, 27.48, 'Lesotho'],
    ['Johannesburg', -26.2, 28.05, 'South Africa'],
    ['Laayoune', 27.15, -13.2, 'W. Sahara'],
    ['inland from Dakhla', 23, -15, 'W. Sahara'],
    ['Marrakesh', 31.63, -8, 'Morocco'],
  ])('finds the country at %s', (_, lat, lng, expected) => {
    expect(nameAt(lat, lng)).toBe(expected)
  })

  it('handles countries spanning the antimeridian', () => {
    expect(nameAt(66, 175)).toBe('Russia') // Chukotka, east of 180° is still ...
    expect(nameAt(66, -175)).toBe('Russia') // ... Russia west of it
    expect(nameAt(-17.8, 178)).toBe('Fiji')
  })

  it('returns null over the ocean', () => {
    expect(nameAt(30, -40)).toBeNull() // Atlantic
    expect(nameAt(0, -140)).toBeNull() // Pacific
  })
})
