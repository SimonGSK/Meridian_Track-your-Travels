import { useId, useState } from 'react'
import { cityOf, countryOf, findAirports, type Airport } from '../data/airports'
import { CloseIcon } from '../icons'
import { noAutofill } from '../ui/noAutofill'

type Props = {
  /** "From" or "To" */
  label: string
  airports: readonly Airport[]
  value: Airport | null
  onChange: (airport: Airport | null) => void
}

/** Picks one airport, by its city, its name or its code ("CPH") */
export default function AirportSearch({ label, airports, value, onChange }: Props) {
  const [query, setQuery] = useState('')
  const listId = useId()

  if (value) {
    return (
      <div className="city-choice">
        <span className="city-choice-label">{label}</span>
        <span className="city-chip" title={value.name}>
          <span>
            <strong>{value.code}</strong> {cityOf(value)} <span className="muted">{countryOf(value)}</span>
          </span>
          <button type="button" className="remove-button" onClick={() => onChange(null)} aria-label={`Change ${label}`}>
            <CloseIcon size={14} />
          </button>
        </span>
      </div>
    )
  }

  const results = findAirports(airports, query)
  const choose = (airport: Airport) => {
    onChange(airport)
    setQuery('')
  }

  return (
    <div className="city-choice">
      <label className="city-choice-label" htmlFor={`${listId}-input`}>
        {label}
      </label>
      <div className="city-adder">
        <input
          {...noAutofill('airport')}
          id={`${listId}-input`}
          type="search"
          placeholder="City, airport or code…"
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
          <ul id={listId} className="suggestions" aria-label={`${label} airports`}>
            {results.map((airport) => (
              <li key={airport.code}>
                <button type="button" className="airport-option" onClick={() => choose(airport)}>
                  <span>
                    <strong>{airport.code}</strong> {cityOf(airport)}
                  </span>
                  <span className="row-meta">
                    {airport.name} · {countryOf(airport)}
                  </span>
                </button>
              </li>
            ))}
            {results.length === 0 && <li className="muted">No airport for “{query.trim()}” in the list.</li>}
          </ul>
        )}
      </div>
    </div>
  )
}
