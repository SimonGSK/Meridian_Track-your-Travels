import { useId, useState } from 'react'
import type { City } from './data/cities'
import { normalizeName } from './data/names'
import { CloseIcon } from './icons'
import Card from './ui/Card'
import { noAutofill } from './ui/noAutofill'

type Props = {
  /** The country's cities, capital first then biggest, or null while they load */
  cities: City[] | null
  visited: ReadonlySet<number>
  onToggle: (city: City) => void
}

const SUGGESTIONS = 6

/** The cities of a country you've visited, and a box to add more. Each one visited gets a pin. */
export default function CityPicker({ cities, visited, onToggle }: Props) {
  const visitedCities = cities?.filter((c) => visited.has(c.id)) ?? []
  return (
    <Card label="Visited cities" meta={String(visitedCities.length).padStart(2, '0')} className="cities-card">
      {!cities ? (
        <p className="muted">Loading…</p>
      ) : (
        <>
          {visitedCities.length > 0 ? (
            <ul className="city-list" aria-label="Visited cities">
              {visitedCities.map((city) => (
                <li key={city.id}>
                  <span className="dot" aria-hidden="true" />
                  <span className="city-name">{city.name}</span>
                  {city.capital && <span className="city-capital">capital</span>}
                  <button
                    type="button"
                    className="remove-button"
                    onClick={() => onToggle(city)}
                    aria-label={`Remove ${city.name}`}
                  >
                    <CloseIcon size={14} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">None yet. Add the ones you've been to; each gets a pin on the globe.</p>
          )}
          <CityAdder cities={cities.filter((c) => !visited.has(c.id))} onAdd={onToggle} />
        </>
      )}
    </Card>
  )
}

/** A search box over the cities not visited yet. Focused and empty, it suggests the biggest. */
function CityAdder({ cities, onAdd }: { cities: City[]; onAdd: (city: City) => void }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const listId = useId()
  if (cities.length === 0) return null

  const wanted = normalizeName(query)
  const suggestions = (wanted ? cities.filter((c) => normalizeName(c.name).includes(wanted)) : cities).slice(
    0,
    SUGGESTIONS,
  )
  const add = (city: City) => {
    onAdd(city)
    setQuery('')
  }

  return (
    <div className="city-adder" onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}>
      <input
        {...noAutofill('city')}
        type="search"
        aria-label="Add a city"
        aria-controls={listId}
        aria-expanded={open}
        placeholder={`Add a city (${cities.length} to pick from)…`}
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && suggestions[0]) add(suggestions[0])
          if (e.key === 'Escape' && open) {
            e.stopPropagation() // closes the suggestions, not the whole panel
            setOpen(false)
          }
        }}
      />
      {open && (
        <ul id={listId} className="suggestions" aria-label="Cities to add">
          {suggestions.map((city) => (
            <li key={city.id}>
              {/* Keeps the focus in the box, so another city can be added straight away */}
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => add(city)}>
                <span>{city.name}</span>
                {city.capital && <span className="city-capital">capital</span>}
              </button>
            </li>
          ))}
          {suggestions.length === 0 && <li className="muted">No city called “{query.trim()}” here.</li>}
        </ul>
      )}
    </div>
  )
}
