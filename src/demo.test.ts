import { describe, expect, it } from 'vitest'
import { findCountryByName } from './countries'
import { loadAirports } from './data/airports'
import { loadCities } from './data/cities'
import { regionIdsOf } from './data/regions'
import { tripsOf } from './data/trips'
import { routeOf } from './data/flights'
import { isPast } from './data/visitDates'
import { DEMO_CITIES, DEMO_FLIGHTS, DEMO_NOTES, DEMO_REGIONS, DEMO_VISITS, DEMO_WISHLIST, demoData, seedDemo } from './demo'
import { isDailyResults } from './games/daily'
import { isFlightList } from './visited/useFlights'
import { isVisitDates, isVisitNotes } from './visited/useVisitDates'

const TODAY = new Date(2026, 9, 5)

describe('the demo data', () => {
  it('names every place as the app does, and keeps visited places off the wishlist', () => {
    for (const name of [...Object.keys(DEMO_VISITS), ...DEMO_WISHLIST]) {
      expect(findCountryByName(name)?.properties.name, name).toBe(name)
    }
    expect(DEMO_WISHLIST.filter((name) => name in DEMO_VISITS)).toEqual([])
  })

  it('has states, cities and airports that exist', async () => {
    const regionIds = new Set(['US', 'CA', 'AU', 'BR'].flatMap(regionIdsOf))
    expect(DEMO_REGIONS.filter((id) => !regionIds.has(id))).toEqual([])
    const cityIds = new Set((await loadCities()).map((c) => c.id))
    expect(DEMO_CITIES.filter((id) => !cityIds.has(id))).toEqual([])
    const byCode = new Map((await loadAirports()).map((a) => [a.code, a]))
    expect(DEMO_FLIGHTS.filter((f) => !byCode.has(f.from) || !byCode.has(f.to))).toEqual([])
  }, 20_000)

  it('makes trips of its flights', async () => {
    const byCode = new Map((await loadAirports()).map((a) => [a.code, a]))
    const trips = tripsOf(DEMO_FLIGHTS.map((f) => routeOf(f, byCode)!))
    expect(trips.map((t) => t.routes.length)).toEqual([2, 4, 2, 3, 5, 5, 2, 6, 2, 1])
  }, 20_000)

  it("is all as the app checks it when loading, and in the past", () => {
    const data = demoData(TODAY)
    expect(isVisitDates(data['countries-app.visit-dates'])).toBe(true)
    expect(isVisitNotes(data['countries-app.visit-notes'])).toBe(true)
    // Each note is on a visit there is
    for (const [name, notes] of Object.entries(DEMO_NOTES)) {
      for (const date of Object.keys(notes)) expect(DEMO_VISITS[name], `${name} ${date}`).toContain(date)
    }
    expect(isFlightList(data['countries-app.flights'])).toBe(true)
    // Trips to come, from the day it's put in: India with its flights there and back, and Chile
    expect(data['countries-app.plans']).toEqual({ India: '2026-11-14', Chile: '2027-03-04' })
    expect((data['countries-app.flights'] as { date?: string }[]).filter((f) => f.date && !isPast(f.date, TODAY))).toEqual([
      { id: 'demo-DEL', from: 'CPH', to: 'DEL', date: '2026-11' },
      { id: 'demo-DEL-back', from: 'DEL', to: 'CPH', date: '2026-11' },
    ])
    expect(isDailyResults(data['countries-app.daily'])).toBe(true)
    expect(Object.values(DEMO_VISITS).flat().every((date) => isPast(date, TODAY))).toBe(true)
    // The last week's challenges, up to yesterday
    expect(Object.keys(data['countries-app.daily'] as object)).toEqual([
      '2026-10-04',
      '2026-10-03',
      '2026-10-02',
      '2026-10-01',
      '2026-09-30',
      '2026-09-29',
    ])
  })
})

describe('seedDemo', () => {
  it('puts the data in when nothing is saved, and leaves what is saved alone', () => {
    expect(seedDemo(localStorage, '', TODAY)).toBe(true)
    expect(JSON.parse(localStorage.getItem('countries-app.visited')!)).toContain('Japan')
    localStorage.setItem('countries-app.visited', JSON.stringify(['Peru']))
    expect(seedDemo(localStorage, '', TODAY)).toBe(false)
    expect(localStorage.getItem('countries-app.visited')).toBe('["Peru"]')
  })

  it('starts over with ?reset', () => {
    localStorage.setItem('countries-app.visited', JSON.stringify(['Peru']))
    localStorage.setItem('countries-app.design', JSON.stringify('night'))
    expect(seedDemo(localStorage, '?reset', TODAY)).toBe(true)
    expect(JSON.parse(localStorage.getItem('countries-app.visited')!)).toContain('Japan')
    expect(localStorage.getItem('countries-app.design')).toBeNull()
  })
})
