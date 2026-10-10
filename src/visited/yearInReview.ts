import { countries, type CountryFeature } from '../countries'
import { CONTINENTS, type Continent } from '../data/continents'
import type { Route } from '../data/flights'
import { countriesOf, countryOfPlace } from '../data/sovereigns'
import { partsOf, type VisitDate } from '../data/visitDates'
import { spotsOfRoute, type Spot } from '../globe/interaction'

/**
 * A year in review: where you went that year and the flights you took, from
 * the dates you've added. Places and flights without a date aren't in any
 * year.
 */

/** What the years are made from */
export type Travels = {
  /** Places visited, by name; dates kept for a place since unmarked don't count */
  visited: ReadonlySet<string>
  datesOf: (name: string) => readonly VisitDate[]
  routes: readonly Route[]
}

/** The places visited in a month, or with just the year (month null) */
export type MonthOfYear = { month: number | null; places: CountryFeature[] }

export type YearReview = {
  year: number
  /** Places visited that year, countries and territories, by name */
  places: CountryFeature[]
  /** Their names, for the globe */
  names: ReadonlySet<string>
  /** Countries been to that year: those visited, and those a territory visited belongs to (Greenland is Denmark's) */
  countryCount: number
  /** Places visited that year that are no country's: Antarctica, Western Sahara, the Siachen Glacier */
  noCountry: CountryFeature[]
  /** Places first visited that year: their earliest date is in it. Territories too: Greenland is new the first time
   * there, even after Denmark */
  firstVisits: ReadonlySet<CountryFeature>
  continents: Continent[]
  /** January first; the places with only the year come last */
  months: MonthOfYear[]
  /** Flights dated that year, in the order added */
  flights: Route[]
  km: number
  longest: Route | null
  /** More places than any other year */
  mostTravelled: boolean
}

const yearOf = (date: VisitDate) => partsOf(date).year
const byName = (a: CountryFeature, b: CountryFeature) => a.properties.name.localeCompare(b.properties.name)

/** Visited places that have dates, and their dates */
function datedPlaces({ visited, datesOf }: Travels) {
  return countries
    .filter((c) => visited.has(c.properties.name))
    .map((country) => ({ country, dates: datesOf(country.properties.name) }))
    .filter(({ dates }) => dates.length > 0)
}

/** The years with a dated visit or flight, newest first */
export function yearsOf(travels: Travels): number[] {
  const years = new Set<number>()
  for (const { dates } of datedPlaces(travels)) for (const date of dates) years.add(yearOf(date))
  for (const { flight } of travels.routes) if (flight.date) years.add(yearOf(flight.date))
  return [...years].sort((a, b) => b - a)
}

/** How a year went */
export function reviewOf(year: number, travels: Travels): YearReview {
  const dated = datedPlaces(travels)
  const placesIn = (y: number) => dated.filter(({ dates }) => dates.some((date) => yearOf(date) === y))
  const thisYear = placesIn(year)
  const places = thisYear.map(({ country }) => country).sort(byName)

  // Each place in the months it was visited; one dated only by the year, at the end
  const byMonth = new Map<number | null, CountryFeature[]>()
  for (const { country, dates } of thisYear) {
    const months = dates.filter((date) => yearOf(date) === year).map((date) => partsOf(date).month)
    const withMonth = months.filter((month) => month !== null)
    for (const month of withMonth.length ? new Set(withMonth) : [null]) byMonth.set(month, [...(byMonth.get(month) ?? []), country])
  }
  const months = [...byMonth.keys()]
    .sort((a, b) => (a ?? 13) - (b ?? 13))
    .map((month) => ({ month, places: byMonth.get(month)!.sort(byName) }))

  const flights = travels.routes.filter(({ flight }) => flight.date && yearOf(flight.date) === year)
  const others = new Set(dated.flatMap(({ dates }) => dates.map(yearOf)))
  others.delete(year)

  return {
    year,
    places,
    names: new Set(places.map((c) => c.properties.name)),
    countryCount: countriesOf(places).size,
    noCountry: places.filter((place) => !countryOfPlace(place)),
    firstVisits: new Set(
      thisYear.filter(({ dates }) => Math.min(...dates.map(yearOf)) === year).map(({ country }) => country),
    ),
    continents: CONTINENTS.filter((continent) => places.some((c) => c.properties.continent === continent)),
    months,
    flights,
    km: flights.reduce((sum, route) => sum + route.km, 0),
    longest: flights.reduce<Route | null>((longest, route) => (!longest || route.km > longest.km ? route : longest), null),
    mostTravelled: others.size > 0 && [...others].every((y) => placesIn(y).length < places.length),
  }
}

/** What to keep in view to see a year on the globe: its places, each as wide as it is, and its flights */
export const spotsOf = ({ places, flights }: YearReview): Spot[] => [
  ...places.map(({ properties: { centroid, extent } }) => ({ lng: centroid[0], lat: centroid[1], radius: extent / 2 })),
  ...flights.flatMap(spotsOfRoute),
]

/** A year of the time-lapse: all you'd been to by its end, and what was new that year */
export type TimelineStep = {
  year: number
  /** Places first visited by the end of the year, by name */
  names: ReadonlySet<string>
  /** The countries they're in: Greenland counts as Denmark */
  countryCount: number
  continents: number
  /** Places first visited that year */
  newPlaces: CountryFeature[]
  /** Places visited that year that had been visited in an earlier one */
  revisits: CountryFeature[]
  /** Flights dated by the end of the year, and those that year */
  flights: Route[]
  newFlights: Route[]
}

/**
 * Your travels year by year, oldest first, for the time-lapse: each year
 * with a dated visit or flight. A place joins in the year of its first
 * dated visit, and stands out again in each year it's visited after;
 * places and flights without dates aren't in it.
 */
export function timelineOf(travels: Travels): TimelineStep[] {
  const dates = datedPlaces(travels).map(({ country, dates }) => ({ country, years: new Set(dates.map(yearOf)) }))
  const firsts = dates.map(({ country, years }) => ({ country, year: Math.min(...years) }))
  const dated = travels.routes.filter(({ flight }) => flight.date)
  return [...yearsOf(travels)].reverse().map((year) => {
    const places = firsts.filter((p) => p.year <= year).map((p) => p.country)
    return {
      year,
      names: new Set(places.map((c) => c.properties.name)),
      countryCount: countriesOf(places).size,
      continents: CONTINENTS.filter((continent) => places.some((c) => c.properties.continent === continent)).length,
      newPlaces: firsts.filter((p) => p.year === year).map((p) => p.country).sort(byName),
      revisits: dates
        .filter((p, i) => p.years.has(year) && firsts[i].year < year)
        .map((p) => p.country)
        .sort(byName),
      flights: dated.filter(({ flight }) => yearOf(flight.date!) <= year),
      newFlights: dated.filter(({ flight }) => yearOf(flight.date!) === year),
    }
  })
}

/** What to keep in view in a year of the time-lapse: its places, new and visited again, and its flights */
export const spotsOfStep = ({ newPlaces, revisits, newFlights }: TimelineStep): Spot[] => [
  ...[...newPlaces, ...revisits].map(({ properties: { centroid, extent } }) => ({ lng: centroid[0], lat: centroid[1], radius: extent / 2 })),
  ...newFlights.flatMap(spotsOfRoute),
]
