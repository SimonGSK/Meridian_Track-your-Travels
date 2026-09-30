import { useState } from 'react'
import { countries, type CountryFeature } from '../countries'
import { flagUrl } from '../flags'
import { percentLabel } from './percentLabel'

type Props = {
  visited: ReadonlySet<string>
  onAdd: (name: string) => void
  onRemove: (name: string) => void
  onShow: (country: CountryFeature) => void
}

const byName = (a: CountryFeature, b: CountryFeature) => a.properties.name.localeCompare(b.properties.name)
const MAX_RESULTS = 6

function Flag({ country }: { country: CountryFeature }) {
  const url = flagUrl(country)
  return url ? <img className="mini-flag" src={url} alt="" /> : <span className="mini-flag" />
}

export default function VisitedPanel({ visited, onAdd, onRemove, onShow }: Props) {
  const [query, setQuery] = useState('')

  const visitedList = countries.filter((c) => visited.has(c.properties.name)).sort(byName)
  const search = query.trim().toLowerCase()
  const matches = search
    ? countries
        .filter((c) => !visited.has(c.properties.name) && c.properties.name.toLowerCase().includes(search))
        .sort(byName)
        .slice(0, MAX_RESULTS)
    : []

  const add = (country: CountryFeature) => {
    onAdd(country.properties.name)
    setQuery('')
  }

  return (
    <div className="visited">
      <div className="visited-stats">
        <p>
          <strong>{visitedList.length}</strong> of {countries.length} countries and territories
        </p>
        <div
          className="progress"
          role="progressbar"
          aria-label="Share of the world visited"
          aria-valuemin={0}
          aria-valuemax={countries.length}
          aria-valuenow={visitedList.length}
          aria-valuetext={percentLabel(visitedList.length, countries.length)}
        >
          <div style={{ width: `${(visitedList.length / countries.length) * 100}%` }} />
        </div>
        <span className="visited-percent">{percentLabel(visitedList.length, countries.length)}</span>
      </div>

      <form
        className="search"
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          if (matches[0]) add(matches[0])
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
          {matches.map((c) => (
            <li key={c.properties.name}>
              <button type="button" className="country-row" onClick={() => add(c)}>
                <Flag country={c} />
                <span className="row-name">{c.properties.name}</span>
                <span className="row-action">Add</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {search && matches.length === 0 && <p className="muted">No matching countries.</p>}

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
