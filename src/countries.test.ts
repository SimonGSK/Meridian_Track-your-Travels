import { describe, expect, it } from 'vitest'
import { neighbors } from 'topojson-client'
import type { GeometryCollection, Topology } from 'topojson-specification'
import worldData from './data/countries-50m.json'
import { MAP_COLOR_COUNT, TINY_KM2, borders, countries, findCountryAt, findCountryNear } from './countries'

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

  it('includes Antarctica, and small places missing from the 1:50m map', () => {
    for (const name of ['Antarctica', 'Tuvalu', 'Gibraltar', 'Maldives']) {
      expect(countries.find((c) => c.properties.name === name)).toBeDefined()
    }
  })

  it('marks places too small to see as tiny', () => {
    const tiny = (name: string) => countries.find((c) => c.properties.name === name)!.properties.tiny
    expect(tiny('Maldives')).toBe(true)
    expect(tiny('Grenada')).toBe(true)
    expect(tiny('Tuvalu')).toBe(true)
    expect(tiny('Denmark')).toBe(false)
    for (const c of countries) expect(c.properties.tiny).toBe(c.properties.areaKm2 < TINY_KM2)
  })

  it('centers countries on their main landmass, not their overseas parts', () => {
    for (const name of ['France', 'Netherlands', 'United States', 'Fiji', 'Kiribati', 'Denmark']) {
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
    ['Laayoune', 27.15, -13.2, 'Western Sahara'],
    ['inland from Dakhla', 23, -15, 'Western Sahara'],
    ['Marrakesh', 31.63, -8, 'Morocco'],
  ])('finds the country at %s', (_, lat, lng, expected) => {
    expect(nameAt(lat, lng)).toBe(expected)
  })

  it('finds Antarctica, around the pole', () => {
    expect(nameAt(-85, 30)).toBe('Antarctica')
    expect(nameAt(-82, -120)).toBe('Antarctica')
  })

  it('finds the smaller place where two overlap', () => {
    expect(nameAt(36.14, -5.35)).toBe('Gibraltar') // not cut out of Spain in the map
    expect(nameAt(40.4, -3.7)).toBe('Spain')
  })

  it('finds Tuvalu', () => {
    const tuvalu = countries.find((c) => c.properties.name === 'Tuvalu')!
    const [lng, lat] = (tuvalu.geometry.coordinates.flat(2)[0] as number[]).map((v, i) => v + (i === 0 ? 0 : 0))
    expect(findCountryNear(lat, lng, { markerRadius: 0.005, tolerance: 0.005 })?.properties.name).toBe('Tuvalu')
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

  it.each([
    [47.7, -87.5, 'Lake Superior'],
    [44, -87, 'Lake Michigan'],
    [45.82, -84.75, 'the Straits of Mackinac, between Lakes Michigan and Huron'],
    [-1, 33, 'Lake Victoria'],
    [-15.8, -69.4, 'Lake Titicaca'],
    [53.5, 108.2, 'Lake Baikal'], // in Russia's mainland, which reaches across the antimeridian
    [46.43, 6.55, 'Lake Geneva'],
  ])('returns null over lakes: %s, %s is %s', (lat, lng) => {
    expect(nameAt(lat, lng)).toBeNull()
  })

  it.each([
    [41.85, -87.65, 'United States'], // Chicago, on Lake Michigan
    [43.7, -79.42, 'Canada'], // Toronto, on Lake Ontario
    [0.32, 32.58, 'Uganda'], // Kampala, by Lake Victoria
    [46.2, 6.14, 'Switzerland'], // Geneva
  ])('finds the land beside lakes: %s, %s is in %s', (lat, lng, name) => {
    expect(nameAt(lat, lng)).toBe(name)
  })

  it('keeps borders along parallels straight where lakes were cut out', () => {
    // On the globe edges are great circles; without every point along the 49th parallel this border would bulge north
    expect(nameAt(48.95, -110)).toBe('United States')
    expect(nameAt(49.05, -110)).toBe('Canada')
    expect(nameAt(48.95, -100)).toBe('United States')
  })
})

describe('findCountryNear', () => {
  const DEG = Math.PI / 180
  const near = (lat: number, lng: number, tolerance = 0.3 * DEG) =>
    findCountryNear(lat, lng, { markerRadius: tolerance, tolerance })?.properties.name ?? null

  it('finds a country the point is inside, like findCountryAt', () => {
    expect(near(56.17, 9.55)).toBe('Denmark')
  })

  it("finds a tiny island from its marker, even when the click misses the land", () => {
    const grenada = countries.find((c) => c.properties.name === 'Grenada')!
    const [lng, lat] = grenada.properties.centroid
    expect(findCountryAt(lat + 0.2, lng + 0.2)).toBeNull()
    expect(near(lat + 0.2, lng + 0.2)).toBe('Grenada')
  })

  it('finds the Maldives', () => {
    expect(near(4.2, 73.5)).toBe('Maldives')
  })

  it('picks the marker of a microstate over the country around it', () => {
    expect(near(43.94, 12.46, 0.05 * DEG)).toBe('San Marino')
  })

  it('finds a coast just missed', () => {
    // Just off the coast of Portugal, in the Atlantic
    expect(findCountryAt(39.5, -9.6)).toBeNull()
    expect(near(39.5, -9.6)).toBe('Portugal')
  })

  it('only uses markers when told they are shown', () => {
    const grenada = countries.find((c) => c.properties.name === 'Grenada')!
    const [lng, lat] = grenada.properties.centroid
    const point = [lat + 0.25, lng + 0.25] as const
    expect(findCountryNear(...point, { markerRadius: 0.5 * DEG, tolerance: 0 })?.properties.name).toBe('Grenada')
    expect(findCountryNear(...point, { markerRadius: 0, tolerance: 0 })).toBeNull()
  })

  it('returns null in the open ocean', () => {
    expect(near(30, -40)).toBeNull()
    expect(near(-40, -120)).toBeNull()
  })
})
