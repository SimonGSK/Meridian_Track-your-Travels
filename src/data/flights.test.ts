import { describe, expect, it } from 'vitest'
import { distanceKm, flightStats, formatDistance, routeOf, uniqueRoutes, type Flight } from './flights'
import { loadCities } from './cities'

const cities = await loadCities()
// London, not London in Ontario
const city = (name: string) => cities.find((c) => c.name === name && c.place !== 'CA')!
const byId = new Map(cities.map((c) => [c.id, c]))
const flight = (from: string, to: string, id = `${from}-${to}`): Flight => ({ id, from: city(from).id, to: city(to).id })

describe('flights', () => {
  it('measures the great-circle distance', () => {
    expect(distanceKm(city('Copenhagen'), city('Bangkok'))).toBeCloseTo(8640, -2)
    expect(distanceKm(city('London'), city('New York City'))).toBeCloseTo(5570, -2)
  })

  it('looks up the cities of a flight, or gives null for one that is gone', () => {
    expect(routeOf(flight('Copenhagen', 'Paris'), byId)).toMatchObject({ from: city('Copenhagen'), to: city('Paris') })
    expect(routeOf({ id: 'x', from: 1, to: city('Paris').id }, byId)).toBeNull()
  })

  it('adds up the flights, the distance, and the times around the Earth', () => {
    const routes = [flight('Copenhagen', 'Bangkok'), flight('Bangkok', 'Copenhagen', 'back')].map((f) => routeOf(f, byId)!)
    const stats = flightStats(routes)
    expect(stats.flights).toBe(2)
    expect(stats.km).toBeCloseTo(17280, -2)
    expect(stats.aroundEarth).toBeCloseTo(17280 / 40075, 1)
    expect(flightStats([])).toEqual({ flights: 0, km: 0, aroundEarth: 0 })
  })

  it('draws one arc for a route flown both ways or more than once', () => {
    const routes = [
      flight('Copenhagen', 'Bangkok'),
      flight('Bangkok', 'Copenhagen', 'back'),
      flight('Copenhagen', 'Bangkok', 'again'),
      flight('Copenhagen', 'Paris'),
    ].map((f) => routeOf(f, byId)!)
    expect(uniqueRoutes(routes).map((r) => r.flight.id)).toEqual(['Copenhagen-Bangkok', 'Copenhagen-Paris'])
  })

  it('writes distances in full, and shortens long ones', () => {
    expect(formatDistance(8620.4)).toBe('8,620 km')
    expect(formatDistance(84_321)).toBe('84.3K km')
    expect(formatDistance(0)).toBe('0 km')
  })
})
