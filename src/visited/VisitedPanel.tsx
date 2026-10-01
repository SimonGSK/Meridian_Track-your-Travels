import { useState } from 'react'
import { countries, searchCountries, type CountryFeature } from '../countries'
import { citiesLabel } from '../data/cities'
import { CONTINENTS, type Continent } from '../data/continents'
import { flagUrl } from '../flags'
import { percentLabel } from './percentLabel'

type Props = {
  visited: ReadonlySet<string>
  onAdd: (name: string) => void
  onRemove: (name: string) => void
  onShow: (country: CountryFeature) => void
  /** States and cities visited, e.g. "3 of 51 states · 4 cities" */
  note?: (country: CountryFeature) => string | null
  /** Cities visited, all over the world */
  cityCount?: number
}

const byName = (a: CountryFeature, b: CountryFeature) => a.properties.name.localeCompare(b.properties.name)
const isCountry = (c: CountryFeature) => c.properties.kind === 'country'
const COUNTRY_COUNT = countries.filter(isCountry).length
const TERRITORY_COUNT = countries.length - COUNTRY_COUNT
/** Countries per continent; Antarctica has none, so it gets no row */
const COUNTRIES_IN = new Map(
  CONTINENTS.map((continent) => [continent, countries.filter((c) => isCountry(c) && c.properties.continent === continent).length]),
)
const INHABITED = CONTINENTS.filter((continent) => COUNTRIES_IN.get(continent)! > 0)
const MAX_RESULTS = 6
// No spaces: aria-labelledby reads spaces as separators between ids
const headingId = (continent: Continent) => `visited-${continent.replace(/\s+/g, '-')}`

function Flag({ country }: { country: CountryFeature }) {
  const url = flagUrl(country)
  return url ? <img className="mini-flag" src={url} alt="" /> : <span className="mini-flag" />
}

export default function VisitedPanel({ visited, onAdd, onRemove, onShow, note, cityCount = 0 }: Props) {
  const [query, setQuery] = useState('')

  const visitedList = countries.filter((c) => visited.has(c.properties.name)).sort(byName)
  const notVisited = countries.filter((c) => !visited.has(c.properties.name))
  const matches = searchCountries(query, notVisited, MAX_RESULTS)
  const visitedCountries = visitedList.filter(isCountry).length
  const visitedTerritories = visitedList.length - visitedCountries
  const visitedIn = (continent: Continent) => visitedList.filter((c) => c.properties.continent === continent)
  // A second line under the name: "Territory", and states and cities visited
  const noteFor = (c: CountryFeature) =>
    [isCountry(c) ? null : 'Territory', note?.(c)].filter(Boolean).join(' · ') || null

  const add = (country: CountryFeature) => {
    onAdd(country.properties.name)
    setQuery('')
  }

  return (
    <div className="visited">
      <div className="visited-stats">
        <p>
          <strong>{visitedCountries}</strong> of {COUNTRY_COUNT} countries
        </p>
        <div
          className="progress"
          role="progressbar"
          aria-label="Share of the world's countries visited"
          aria-valuemin={0}
          aria-valuemax={COUNTRY_COUNT}
          aria-valuenow={visitedCountries}
          aria-valuetext={percentLabel(visitedCountries, COUNTRY_COUNT)}
        >
          <div style={{ width: `${(visitedCountries / COUNTRY_COUNT) * 100}%` }} />
        </div>
        <span className="visited-percent">
          {percentLabel(visitedCountries, COUNTRY_COUNT)}
          {visitedTerritories > 0 && ` · plus ${visitedTerritories} of ${TERRITORY_COUNT} territories`}
          {cityCount > 0 && ` · ${citiesLabel(cityCount)}`}
        </span>
      </div>

      <h3>By continent</h3>
      <ul className="continent-stats" aria-label="Countries visited by continent">
        {INHABITED.map((continent) => {
          const total = COUNTRIES_IN.get(continent)!
          const count = visitedIn(continent).filter(isCountry).length
          return (
            <li key={continent}>
              <span className="continent-name">{continent}</span>
              <span className="continent-count">
                {count} / {total}
              </span>
              <span className="continent-percent">{percentLabel(count, total)}</span>
              <div
                className="progress small"
                role="progressbar"
                aria-label={`${continent}: ${count} of ${total} countries`}
                aria-valuemin={0}
                aria-valuemax={total}
                aria-valuenow={count}
                aria-valuetext={percentLabel(count, total)}
              >
                <div style={{ width: `${(count / total) * 100}%` }} />
              </div>
            </li>
          )
        })}
      </ul>

      <form
        className="search"
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          if (matches[0]) add(matches[0].country)
        }}
      >
        <label htmlFor="visited-search">Add a country</label>
        <input
          id="visited-search"
          type="search"
          placeholder="Search countries…"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </form>

      {matches.length > 0 && (
        <ul className="country-list" aria-label="Search results">
          {matches.map(({ country: c, matchedAlias }) => (
            <li key={c.properties.name}>
              <button type="button" className="country-row" onClick={() => add(c)}>
                <Flag country={c} />
                <span className="row-name">
                  {c.properties.name}
                  {matchedAlias && <span className="muted"> ({matchedAlias})</span>}
                </span>
                <span className="row-action">Add</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {query.trim() && matches.length === 0 && <p className="muted">No matching countries.</p>}

      <h3>Your countries</h3>
      {visitedList.length === 0 ? (
        <p className="muted">
          None yet. Search above, or click a country on the globe and mark it as visited.
        </p>
      ) : (
        <ul className="continent-groups" aria-label="Visited countries">
          {CONTINENTS.filter((continent) => visitedIn(continent).length > 0).map((continent) => (
            <li key={continent}>
              <h4 id={headingId(continent)}>
                {continent} <span className="muted">{visitedIn(continent).length}</span>
              </h4>
              <ul className="country-list" aria-labelledby={headingId(continent)}>
                {visitedIn(continent).map((c) => (
                  <li key={c.properties.name} className="country-item">
                    <button type="button" className="country-row" onClick={() => onShow(c)}>
                      <Flag country={c} />
                      <span className="row-text">
                        <span className="row-name">{c.properties.name}</span>
                        {noteFor(c) && <span className="row-note">{noteFor(c)}</span>}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="icon-button small"
                      onClick={() => onRemove(c.properties.name)}
                      aria-label={`Remove ${c.properties.name}`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
