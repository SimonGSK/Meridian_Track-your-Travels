import { describe, expect, it } from 'vitest'
import type { Airport } from './airports'
import type { Route } from './flights'
import type { VisitDate } from './visitDates'
import { stopsOf, tripsByDate, tripsOf } from './trips'

const AIRPORTS: Record<string, Airport> = {
  CPH: { code: 'CPH', name: 'Copenhagen Kastrup', city: 'Copenhagen', country: 'DK', lat: 55.6, lng: 12.6 },
  ICN: { code: 'ICN', name: 'Incheon', city: 'Seoul', country: 'KR', lat: 37.5, lng: 126.4 },
  NRT: { code: 'NRT', name: 'Narita', city: 'Tokyo (Narita)', country: 'JP', lat: 35.8, lng: 140.4 },
  HND: { code: 'HND', name: 'Haneda', city: 'Tokyo', country: 'JP', lat: 35.5, lng: 139.8 },
  CDG: { code: 'CDG', name: 'Charles de Gaulle', city: 'Paris', country: 'FR', lat: 49, lng: 2.5 },
  LHR: { code: 'LHR', name: 'Heathrow', city: 'London', country: 'GB', lat: 51.5, lng: -0.5 },
  JFK: { code: 'JFK', name: 'Kennedy', city: 'New York', country: 'US', lat: 40.6, lng: -73.8 },
  DOH: { code: 'DOH', name: 'Hamad', city: 'Doha', country: 'QA', lat: 25.3, lng: 51.6 },
  MPM: { code: 'MPM', name: 'Maputo', city: 'Maputo', country: 'MZ', lat: -25.9, lng: 32.6 },
  INH: { code: 'INH', name: 'Inhambane', city: 'Inhambane', country: 'MZ', lat: -23.9, lng: 35.4 },
  JNB: { code: 'JNB', name: 'O. R. Tambo', city: 'Johannesburg', country: 'ZA', lat: -26.1, lng: 28.2 },
  CPT: { code: 'CPT', name: 'Cape Town', city: 'Cape Town', country: 'ZA', lat: -34, lng: 18.6 },
}

let id = 0
/** A flight "CPH-ICN", maybe dated */
function leg(path: string, date?: VisitDate, km = 1000): Route {
  const [from, to] = path.split('-')
  return { flight: { id: String(++id), from, to, ...(date ? { date } : {}) }, from: AIRPORTS[from], to: AIRPORTS[to], km }
}
const paths = (trips: ReturnType<typeof tripsOf>) => trips.map((t) => t.routes.map((r) => `${r.from.code}-${r.to.code}`).join(' '))

describe('tripsOf', () => {
  it('joins legs that leave where the last landed into a trip, until it is back where it started', () => {
    const trips = tripsOf([
      leg('CPH-ICN', '2025-04', 8000),
      leg('ICN-NRT', '2025-04', 1200),
      leg('NRT-CPH', '2025-05', 8700),
      leg('CPH-CDG', '2025-07'), // from home again, but a new trip
    ])
    expect(paths(trips)).toEqual(['CPH-ICN ICN-NRT NRT-CPH', 'CPH-CDG'])
    expect(trips[0]).toMatchObject({ date: '2025-04', km: 17900 })
    expect(trips[1]).toMatchObject({ date: '2025-07' })
  })

  it('counts an airport nearby as the same place, but not one farther off', () => {
    expect(paths(tripsOf([leg('CPH-NRT', '2024-03'), leg('HND-CPH', '2024-03')]))).toEqual(['CPH-NRT HND-CPH'])
    expect(paths(tripsOf([leg('CPH-NRT', '2024-03'), leg('ICN-CPH', '2024-03')]))).toEqual(['CPH-NRT', 'ICN-CPH'])
  })

  it('keeps legs more than a month apart, or dated and undated, apart', () => {
    expect(paths(tripsOf([leg('CPH-LHR', '2024-03'), leg('LHR-CPH', '2024-05')]))).toEqual(['CPH-LHR', 'LHR-CPH'])
    expect(paths(tripsOf([leg('CPH-LHR', '2024-03'), leg('LHR-CPH')]))).toEqual(['CPH-LHR', 'LHR-CPH'])
    // Across the new year is within a month
    expect(paths(tripsOf([leg('CPH-LHR', '2024-12'), leg('LHR-CPH', '2025-01')]))).toEqual(['CPH-LHR LHR-CPH'])
  })

  it('joins legs with only the year in the same year, and undated legs by where they go', () => {
    expect(paths(tripsOf([leg('CPH-LHR', '2019'), leg('LHR-JFK', '2019-06')]))).toEqual(['CPH-LHR LHR-JFK'])
    expect(paths(tripsOf([leg('CPH-LHR'), leg('LHR-CPH')]))).toEqual(['CPH-LHR LHR-CPH'])
  })

  it('finds the trip a leg carries on, even with another trip added in between', () => {
    const trips = tripsOf([leg('CPH-JFK', '2023-08'), leg('CDG-LHR', '2021-02'), leg('JFK-CPH', '2023-08')])
    expect(paths(trips)).toEqual(['CPH-JFK JFK-CPH', 'CDG-LHR'])
  })

  it('carries on a one-way trip with a later leg', () => {
    const trips = tripsOf([leg('CPH-LHR', '2022-01'), leg('LHR-JFK', '2022-02'), leg('JFK-CDG', '2022-02')])
    expect(paths(trips)).toEqual(['CPH-LHR LHR-JFK JFK-CDG'])
  })

  it('carries on a trip that went on by land, dated and within a month, from up to 1000 km away', () => {
    // In to Maputo, by bus to Inhambane, and on from there
    const trips = tripsOf([
      leg('CPH-DOH', '2025-07'),
      leg('DOH-MPM', '2025-07'),
      leg('INH-MPM', '2025-07'),
      leg('MPM-JNB', '2025-08'),
      leg('JNB-CPT', '2025-08'),
      leg('CPT-DOH', '2025-08'),
      leg('DOH-CPH', '2025-08'),
    ])
    expect(paths(trips)).toEqual(['CPH-DOH DOH-MPM INH-MPM MPM-JNB JNB-CPT CPT-DOH DOH-CPH'])
    expect(stopsOf(trips[0])).toEqual([
      'Copenhagen',
      'Doha',
      'Maputo',
      'Inhambane',
      'Maputo',
      'Johannesburg',
      'Cape Town',
      'Doha',
      'Copenhagen',
    ])
  })

  it('carries on by land only when dated, only from nearby, and not from home again', () => {
    expect(paths(tripsOf([leg('CPH-MPM'), leg('INH-CPH')]))).toEqual(['CPH-MPM', 'INH-CPH'])
    expect(paths(tripsOf([leg('CPH-MPM', '2025-07'), leg('CPT-CPH', '2025-07')]))).toEqual(['CPH-MPM', 'CPT-CPH'])
    // One way to London, then from home to Paris: London isn't far from home, but it's a new trip
    expect(paths(tripsOf([leg('CPH-LHR', '2025-07'), leg('CPH-CDG', '2025-07')]))).toEqual(['CPH-LHR', 'CPH-CDG'])
  })

  it('carries on a trip from where it landed rather than one that ended nearby', () => {
    const trips = tripsOf([leg('CPH-MPM', '2025-07'), leg('LHR-INH', '2025-07'), leg('INH-JNB', '2025-07')])
    expect(paths(trips)).toEqual(['CPH-MPM', 'LHR-INH INH-JNB'])
  })

  it('has no trips without flights', () => {
    expect(tripsOf([])).toEqual([])
  })
})

describe('tripsByDate', () => {
  it('puts a trip that started the same month but ended later first, whatever order they were added in', () => {
    const trips = tripsOf([
      leg('CPH-JFK', '2024-04'),
      leg('JFK-CPH', '2024-05'), // back in May
      leg('CPH-LHR', '2024-04'),
      leg('LHR-CPH', '2024-04'), // back in April
    ])
    expect(paths(tripsByDate(trips))).toEqual(['CPH-JFK JFK-CPH', 'CPH-LHR LHR-CPH'])
    expect(trips[0]).toMatchObject({ date: '2024-04', endDate: '2024-05' })
  })

  it('puts the one added last first, of trips that started and ended the same months', () => {
    const trips = tripsOf([leg('CPH-LHR', '2024-04'), leg('LHR-CPH', '2024-04'), leg('CPH-CDG', '2024-04'), leg('CDG-CPH', '2024-04')])
    expect(paths(tripsByDate(trips))).toEqual(['CPH-CDG CDG-CPH', 'CPH-LHR LHR-CPH'])
    // A single flight is a trip too
    expect(paths(tripsByDate(tripsOf([leg('CPH-LHR', '2024-04'), leg('CPH-CDG', '2024-04')])))).toEqual(['CPH-CDG', 'CPH-LHR'])
  })

  it('puts the newest first, then the undated, the last added first', () => {
    const trips = tripsOf([leg('CPH-LHR'), leg('CPH-CDG', '2019-05'), leg('CPH-JFK'), leg('CPH-NRT', '2024')])
    expect(paths(tripsByDate(trips))).toEqual(['CPH-NRT', 'CPH-CDG', 'CPH-JFK', 'CPH-LHR'])
  })
})

describe('stopsOf', () => {
  it('names the cities in order, without the airport', () => {
    const [trip] = tripsOf([leg('CPH-ICN', '2025-04'), leg('ICN-NRT', '2025-04'), leg('NRT-CPH', '2025-04')])
    expect(stopsOf(trip)).toEqual(['Copenhagen', 'Seoul', 'Tokyo', 'Copenhagen'])
  })
})
