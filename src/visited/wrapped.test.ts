import { describe, expect, it } from 'vitest'
import type { Airport } from '../data/airports'
import type { Route } from '../data/flights'
import type { VisitDate } from '../data/visitDates'
import { describeWrapped, wrappedOf } from './wrapped'
import { reviewOf, type Travels } from './yearInReview'

const airport = (code: string, city: string, lat = 0, lng = 0): Airport => ({ code, name: city, city, country: 'DK', lat, lng })
const CPH = airport('CPH', 'Copenhagen', 55.6, 12.6)
const route = (to: Airport, km: number, date: VisitDate): Route => ({ flight: { id: to.code, from: 'CPH', to: to.code, date }, from: CPH, to, km })
function travels(dates: Record<string, VisitDate[]>, routes: Route[] = []): Travels {
  return { visited: new Set(Object.keys(dates)), datesOf: (name) => dates[name] ?? [], routes }
}

const T = travels(
  {
    Japan: ['2024-04'],
    'South Korea': ['2024-04'],
    France: ['2024-07', '2019'],
    Kenya: ['2024'],
    Greenland: ['2024-08'],
  },
  [route(airport('NRT', 'Tokyo (Narita)', 35.8, 140.4), 8700, '2024-04'), route(airport('CDG', 'Paris', 49, 2.5), 1030, '2024-07')],
)

describe('wrappedOf', () => {
  const w = wrappedOf(reviewOf(2024, T))

  it("puts the year's new places first, then those visited again, each by name", () => {
    expect(w.places.map((p) => `${p.country.properties.name}${p.isNew ? ' (new)' : ''}`)).toEqual([
      'Greenland (new)',
      'Japan (new)',
      'Kenya (new)',
      'South Korea (new)',
      'France',
    ])
  })

  it('counts the countries, the new places and the continents', () => {
    expect([w.countries, w.newPlaces, w.continents]).toEqual([4, 4, 4]) // Greenland is a territory
  })

  it('adds up the flights, how far and how many times around the Earth, and the longest', () => {
    expect([w.flights, w.km]).toEqual([2, 9730])
    expect(w.laps).toBeCloseTo(9730 / 40_075)
    expect(w.longest).toEqual({ from: 'Copenhagen', to: 'Tokyo', km: 8700 })
  })

  it('finds the busiest month, and looks at the places from above their middle', () => {
    expect(w.busiestMonth).toEqual({ name: 'April', places: 2 })
    expect(w.view.lat).toBeGreaterThan(-90)
    expect(Number.isFinite(w.view.lng)).toBe(true)
  })

  it('says it in words', () => {
    expect(describeWrapped(w)).toBe(
      'In 2024: 4 countries, 4 of them new, on 4 continents. 2 flights, 9,730 km. Longest flight: Copenhagen to Tokyo.',
    )
  })

  it('makes do with a year of only flights', () => {
    const flightsOnly = wrappedOf(reviewOf(2022, travels({}, [route(airport('LHR', 'London'), 950, '2022-02')])))
    expect([flightsOnly.places, flightsOnly.busiestMonth]).toEqual([[], null])
    expect(describeWrapped(flightsOnly)).toBe('In 2022: 0 countries, on 0 continents. 1 flight, 950 km. Longest flight: Copenhagen to London.')
  })
})
