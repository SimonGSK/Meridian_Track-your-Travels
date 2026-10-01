import { useState } from 'react'
import type { City } from './data/cities'
import { normalizeName } from './data/names'

type Props = {
  /** The country's cities, or null while they load */
  cities: City[] | null
  visited: ReadonlySet<number>
  onToggle: (city: City) => void
}

/** The big and well-known cities of a country, to tick off the ones visited. */
export default function CityPicker({ cities, visited, onToggle }: Props) {
  const [filter, setFilter] = useState('')

  if (!cities) {
    return (
      <section className="regions" aria-label="Cities">
        <h3>Cities</h3>
        <p className="muted">Loading…</p>
      </section>
    )
  }

  const count = cities.filter((c) => visited.has(c.id)).length
  const query = normalizeName(filter)
  const shown = query ? cities.filter((c) => normalizeName(c.name).includes(query)) : cities

  return (
    <section className="regions" aria-labelledby="cities-heading">
      <h3 id="cities-heading">Cities</h3>
      <p className="regions-count">
        <strong>{count}</strong> of {cities.length} visited
      </p>
      <p className="muted">The biggest and best-known. Each one you tick gets a pin on the globe.</p>
      {cities.length > 12 && (
        <input
          type="search"
          className="regions-filter"
          aria-label="Filter cities"
          placeholder="Filter cities…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      )}
      <ul className="region-list">
        {shown.map((city) => (
          <li key={city.id}>
            <label>
              <input type="checkbox" checked={visited.has(city.id)} onChange={() => onToggle(city)} />
              {city.name}
              {city.capital && <span className="city-capital">capital</span>}
            </label>
          </li>
        ))}
      </ul>
    </section>
  )
}
