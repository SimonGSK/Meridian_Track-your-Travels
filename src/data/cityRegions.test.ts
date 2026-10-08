import { describe, expect, it } from 'vitest'
import { countryOfCity, loadCities } from './cities'
import { hasRegions, loadRegions, regionIdsOf } from './regions'

describe("the cities' states", () => {
  it('gives every city in a country with states its state, one there is', async () => {
    const cities = await loadCities()
    const withStates = cities.filter((city) => {
      const country = countryOfCity(city)
      return country && hasRegions(country)
    })
    expect(withStates.length).toBeGreaterThan(100)
    for (const city of withStates) expect(regionIdsOf(city.place), city.name).toContain(city.region)
    expect(cities.filter((c) => c.region && !withStates.includes(c))).toEqual([])
  }, 20_000)

  it("has the right ones on coasts and borders, where the map's outlines leave the city outside", async () => {
    const cities = await loadCities()
    await loadRegions()
    const regionOf = (name: string) => cities.find((c) => c.name === name && ['US', 'CA', 'AU', 'BR'].includes(c.place))?.region
    expect(regionOf('New York City')).toBe('US-NY')
    expect(regionOf('El Paso')).toBe('US-TX')
    expect(regionOf('Detroit')).toBe('US-MI')
    expect(regionOf('Miami')).toBe('US-FL')
    expect(regionOf('Halifax')).toBe('CA-NS')
    expect(regionOf('Hobart')).toBe('AU-TS')
    expect(regionOf('Rio de Janeiro')).toBe('BR-RJ')
  }, 20_000)
})
