import { describe, expect, it } from 'vitest'
import {
  distanceKm,
  flightStats,
  formatDistance,
  isAirportFlight,
  migrateFlights,
  routeOf,
  uniqueRoutes,
  type Flight,
} from './flights'
import { loadAirports } from './airports'
import { loadCities } from './cities'

const [airports, cities] = await Promise.all([loadAirports(), loadCities()])
const airport = (code: string) => airports.find((a) => a.code === code)!
const byCode = new Map(airports.map((a) => [a.code, a]))
const flight = (from: string, to: string, id = `${from}-${to}`): Flight => ({ id, from, to })
const route = (from: string, to: string, id?: string) => routeOf(flight(from, to, id), byCode)!

describe('flights', () => {
  it('measures the great-circle distance', () => {
    expect(distanceKm(airport('CPH'), airport('BKK'))).toBeCloseTo(8640, -2)
    expect(distanceKm(airport('LHR'), airport('JFK'))).toBeCloseTo(5540, -2)
  })

  it('looks up the airports of a flight, or gives null for one that is gone', () => {
    expect(route('CPH', 'CDG')).toMatchObject({ from: airport('CPH'), to: airport('CDG') })
    expect(routeOf(flight('XXX', 'CDG'), byCode)).toBeNull()
  })

  it('adds up the flights, the distance, and the times around the Earth', () => {
    const stats = flightStats([route('CPH', 'BKK'), route('BKK', 'CPH', 'back')])
    expect(stats.flights).toBe(2)
    expect(stats.km).toBeCloseTo(17280, -2)
    expect(stats.aroundEarth).toBeCloseTo(17280 / 40075, 1)
    expect(flightStats([])).toEqual({ flights: 0, km: 0, aroundEarth: 0 })
  })

  it('draws one arc for a route flown both ways or more than once', () => {
    const routes = [route('CPH', 'BKK'), route('BKK', 'CPH', 'back'), route('CPH', 'BKK', 'again'), route('CPH', 'CDG')]
    expect(uniqueRoutes(routes).map((r) => r.flight.id)).toEqual(['CPH-BKK', 'CPH-CDG'])
  })

  it('moves flights saved between cities to the airports serving them', () => {
    const cityById = new Map(cities.map((c) => [c.id, c]))
    const city = (name: string, place: string) => cities.find((c) => c.name === name && c.place === place)!.id
    const saved = [
      { id: 'a', from: city('Copenhagen', 'DK'), to: city('Tokyo', 'JP') },
      { id: 'b', from: 'NAN', to: city('Singapore', 'SG') },
      { id: 'c', from: 'CPH', to: 'DXB' },
    ]
    expect(isAirportFlight(saved[0])).toBe(false)
    expect(migrateFlights(saved, cityById, airports)).toEqual([
      { id: 'a', from: 'CPH', to: 'HND' },
      { id: 'b', from: 'NAN', to: 'SIN' },
      { id: 'c', from: 'CPH', to: 'DXB' },
    ])
  })

  it('drops a saved flight whose city is gone', () => {
    expect(migrateFlights([{ id: 'a', from: 1, to: 'CPH' }], new Map(), airports)).toEqual([])
  })

  it('writes distances in full, and shortens long ones', () => {
    expect(formatDistance(8620.4)).toBe('8,620 km')
    expect(formatDistance(84_321)).toBe('84.3K km')
    expect(formatDistance(0)).toBe('0 km')
  })
})
