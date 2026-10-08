import { describe, expect, it } from 'vitest'
import { countries } from '../countries'
import type { Airport } from '../data/airports'
import type { Route } from '../data/flights'
import type { VisitDate } from '../data/visitDates'
import { reviewOf, spotsOf, spotsOfStep, timelineOf, yearsOf, type Travels } from './yearInReview'

const airport = (code: string): Airport => ({ code, name: code, city: code, country: 'DK', lat: 0, lng: 0 })
const route = (id: string, km: number, date?: VisitDate): Route => ({
  flight: { id, from: 'CPH', to: id, ...(date ? { date } : {}) },
  from: airport('CPH'),
  to: airport(id),
  km,
})

/** Places visited, with their dates, and flights */
function travels(dates: Record<string, VisitDate[]>, routes: Route[] = [], visited = Object.keys(dates)): Travels {
  return { visited: new Set(visited), datesOf: (name) => dates[name] ?? [], routes }
}

const names = (places: { properties: { name: string } }[]) => places.map((c) => c.properties.name)

describe('yearsOf', () => {
  it('lists the years with a dated visit or flight, newest first', () => {
    const t = travels({ Japan: ['2019-04', '2024'], Denmark: [], France: ['2024-07'] }, [route('NRT', 8700, '2021-03'), route('LHR', 950)])
    expect(yearsOf(t)).toEqual([2024, 2021, 2019])
  })

  it("leaves out the dates of places no longer marked as visited", () => {
    expect(yearsOf(travels({ Japan: ['2019-04'], France: ['2024-07'] }, [], ['France']))).toEqual([2024])
  })

  it('is empty with no dates', () => {
    expect(yearsOf(travels({ Japan: [] }, [route('LHR', 950)]))).toEqual([])
  })
})

describe('reviewOf', () => {
  it("has the year's places, its countries and continents", () => {
    const review = reviewOf(
      2024,
      travels({ Japan: ['2024-04'], Kenya: ['2024'], Greenland: ['2024-08'], France: ['2019'], Denmark: [] }),
    )
    expect(names(review.places)).toEqual(['Greenland', 'Japan', 'Kenya'])
    expect([...review.names]).toEqual(['Greenland', 'Japan', 'Kenya'])
    expect(review.countryCount).toBe(2) // Greenland is a territory
    expect(review.continents).toEqual(['Africa', 'Asia', 'North America'])
  })

  it('goes month by month, with the places dated only by the year last', () => {
    const review = reviewOf(
      2024,
      travels({
        Japan: ['2024-10', '2024-04', '2024'], // a month in the year, so not "sometime" too
        Kenya: ['2024'],
        France: ['2024-04', '2023-04'],
        Italy: ['2024'],
      }),
    )
    expect(review.months.map(({ month, places }) => [month, names(places)])).toEqual([
      [4, ['France', 'Japan']],
      [10, ['Japan']],
      [null, ['Italy', 'Kenya']],
    ])
  })

  it('marks the places first visited that year', () => {
    const review = reviewOf(2024, travels({ Japan: ['2024-04'], France: ['2024-07', '2016'], Kenya: ['2024', '2025-02'] }))
    expect(names([...review.firstVisits]).sort()).toEqual(['Japan', 'Kenya'])
  })

  it("adds up the year's dated flights and finds the longest", () => {
    const tokyo = route('NRT', 8700, '2024-04')
    const review = reviewOf(2024, travels({}, [route('LHR', 950, '2024-02'), tokyo, route('JFK', 6200, '2023-05'), route('BKK', 8600)]))
    expect(review.flights.map((r) => r.flight.id)).toEqual(['LHR', 'NRT'])
    expect(review.km).toBe(9650)
    expect(review.longest).toBe(tokyo)
    expect(review.places).toEqual([])
  })

  it('has no longest flight in a year without flights', () => {
    expect(reviewOf(2024, travels({ Japan: ['2024'] })).longest).toBeNull()
  })

  it('is the most travelled year with more places than any other', () => {
    const t = travels({ Japan: ['2024'], France: ['2024', '2023'], Kenya: ['2023'], Italy: ['2024'], Peru: ['2022'] })
    expect(reviewOf(2024, t).mostTravelled).toBe(true)
    expect(reviewOf(2023, t).mostTravelled).toBe(false)
    // A tie, or the only year, isn't
    expect(reviewOf(2023, travels({ Japan: ['2023'], France: ['2022'] })).mostTravelled).toBe(false)
    expect(reviewOf(2024, travels({ Japan: ['2024'] })).mostTravelled).toBe(false)
  })
})

describe('spotsOf', () => {
  it("keeps the year's places in view, each as far as it reaches, and its flights", () => {
    const japan = countries.find((c) => c.properties.name === 'Japan')!.properties
    const [lng, lat] = japan.centroid
    const spots = spotsOf(reviewOf(2024, travels({ Japan: ['2024-04'] }, [route('NRT', 8700, '2024-04')])))
    expect(spots).toHaveLength(4) // Japan, and the flight's ends and middle
    expect(spots[0]).toEqual({ lat, lng, radius: japan.extent / 2 })
  })
})

describe('timelineOf', () => {
  const t = travels(
    { Japan: ['2024-04'], France: ['2019-07', '2024'], Kenya: ['2021'], Greenland: ['2019-08'], Peru: [] },
    [route('NRT', 8700, '2024-04'), route('CDG', 1000, '2019-07'), route('LHR', 950)],
  )

  it('goes through the years with dates, oldest first, adding each place in its first year', () => {
    const steps = timelineOf(t)
    expect(steps.map((s) => s.year)).toEqual([2019, 2021, 2024])
    expect(steps.map((s) => [...s.names].sort())).toEqual([
      ['France', 'Greenland'],
      ['France', 'Greenland', 'Kenya'],
      ['France', 'Greenland', 'Japan', 'Kenya'],
    ])
    expect(steps.map((s) => names(s.newPlaces))).toEqual([['France', 'Greenland'], ['Kenya'], ['Japan']]) // France came back, but isn't new
    expect(steps.map((s) => names(s.revisits))).toEqual([[], [], ['France']])
    expect(steps.map((s) => s.countryCount)).toEqual([1, 2, 3]) // Greenland is a territory
    expect(steps.map((s) => s.continents)).toEqual([2, 3, 4])
  })

  it('adds the dated flights year by year', () => {
    const steps = timelineOf(t)
    expect(steps.map((s) => s.flights.map((r) => r.flight.id))).toEqual([['CDG'], ['CDG'], ['NRT', 'CDG']])
    expect(steps.map((s) => s.newFlights.map((r) => r.flight.id))).toEqual([['CDG'], [], ['NRT']])
  })

  it('keeps the places and flights of a year in view, those visited again too', () => {
    const [first, , last] = timelineOf(t)
    expect(spotsOfStep(first)).toHaveLength(2 + 3) // France and Greenland, and the flight's ends and middle
    expect(spotsOfStep(last)).toHaveLength(2 + 3) // Japan, France again, and the flight
  })

  it('counts a place visited twice in a year as new that year, not again', () => {
    const [step] = timelineOf(travels({ Italy: ['2014-03', '2014-09'] }))
    expect([names(step.newPlaces), names(step.revisits)]).toEqual([['Italy'], []])
  })

  it('is empty without dates', () => {
    expect(timelineOf(travels({ Peru: [] }, [route('LHR', 950)]))).toEqual([])
  })
})
