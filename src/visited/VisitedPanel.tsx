import { useState } from 'react'
import { countries, searchCountries, type CountryFeature } from '../countries'
import { flagUrl } from '../flags'
import { percentLabel } from './percentLabel'

type Props = {
  visited: ReadonlySet<string>
  onAdd: (name: string) => void
  onRemove: (name: string) => void
  onShow: (country: CountryFeature) => void
}

const byName = (a: CountryFeature, b: CountryFeature) => a.properties.name.localeCompare(b.properties.name)
const COUNTRY_COUNT = countries.filter((c) => c.properties.kind === 'country').length
const TERRITORY_COUNT = countries.length - COUNTRY_COUNT
const MAX_RESULTS = 6

function Flag({ country }: { country: CountryFeature }) {
  const url = flagUrl(country)
  return url ? <img className="mini-flag" src={url} alt="" /> : <span className="mini-flag" />
}

export default function VisitedPanel({ visited, onAdd, onRemove, onShow }: Props) {
  const [query, setQuery] = useState('')

  const visitedList = countries.filter((c) => visited.has(c.properties.name)).sort(byName)
  const notVisited = countries.filter((c) => !visited.has(c.properties.name))
  const matches = searchCountries(query, notVisited, MAX_RESULTS)
  const visitedCountries = visitedList.filter((c) => c.properties.kind === 'country').length
  const visitedTerritories = visitedList.length - visitedCountries

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
        </span>
      </div>

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
        <ul className="country-list" aria-label="Visited countries">
          {visitedList.map((c) => (
            <li key={c.properties.name} className="country-item">
              <button type="button" className="country-row" onClick={() => onShow(c)}>
                <Flag country={c} />
                <span className="row-name">{c.properties.name}</span>
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
      )}
    </div>
  )
}
