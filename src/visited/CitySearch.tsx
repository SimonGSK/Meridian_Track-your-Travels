import { useId, useState } from 'react'
import { countryOfCity, findCities, type City } from '../data/cities'
import { CloseIcon } from '../icons'

type Props = {
  /** "From" or "To" */
  label: string
  cities: readonly City[]
  value: City | null
  onChange: (city: City | null) => void
}

const countryName = (city: City) => countryOfCity(city)?.properties.name ?? ''

/** Picks one city from all of them, showing each one's country: there's more than one London */
export default function CitySearch({ label, cities, value, onChange }: Props) {
  const [query, setQuery] = useState('')
  const listId = useId()

  if (value) {
    return (
      <div className="city-choice">
        <span className="city-choice-label">{label}</span>
        <span className="city-chip">
          <span>
            {value.name} <span className="muted">{countryName(value)}</span>
          </span>
          <button type="button" className="remove-button" onClick={() => onChange(null)} aria-label={`Change ${label}`}>
            <CloseIcon size={14} />
          </button>
        </span>
      </div>
    )
  }

  const results = findCities(cities, query)
  const choose = (city: City) => {
    onChange(city)
    setQuery('')
  }

  return (
    <div className="city-choice">
      <label className="city-choice-label" htmlFor={`${listId}-input`}>
        {label}
      </label>
      <div className="city-adder">
        <input
          id={`${listId}-input`}
          type="search"
          autoComplete="off"
          placeholder="Search cities…"
          aria-controls={listId}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && results[0]) {
              e.preventDefault()
              choose(results[0])
            }
          }}
        />
        {query.trim() && (
          <ul id={listId} className="suggestions" aria-label={`${label} cities`}>
            {results.map((city) => (
              <li key={city.id}>
                <button type="button" onClick={() => choose(city)}>
                  <span>{city.name}</span>
                  <span className="row-meta">{countryName(city)}</span>
                </button>
              </li>
            ))}
            {results.length === 0 && <li className="muted">No city called “{query.trim()}” in the list.</li>}
          </ul>
        )}
      </div>
    </div>
  )
}
