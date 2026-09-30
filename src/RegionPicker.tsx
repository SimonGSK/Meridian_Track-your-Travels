import { useState } from 'react'
import type { RegionFeature } from './data/regions'
import { normalizeName } from './data/names'
import { percentLabel } from './visited/percentLabel'

type Props = {
  /** The country's regions, or null while they load */
  regions: RegionFeature[] | null
  /** What they're called, e.g. "States" */
  label: string
  visited: ReadonlySet<string>
  onToggle: (region: RegionFeature) => void
}

/** The states or provinces of a country, to tick off the ones visited. */
export default function RegionPicker({ regions, label, visited, onToggle }: Props) {
  const [filter, setFilter] = useState('')

  if (!regions) {
    return (
      <section className="regions" aria-label={label}>
        <h3>{label}</h3>
        <p className="muted">Loading…</p>
      </section>
    )
  }

  const count = regions.filter((r) => visited.has(r.properties.id)).length
  const query = normalizeName(filter)
  const shown = query ? regions.filter((r) => normalizeName(r.properties.name).includes(query)) : regions

  return (
    <section className="regions" aria-labelledby="regions-heading">
      <h3 id="regions-heading">{label}</h3>
      <p className="regions-count">
        <strong>{count}</strong> of {regions.length} visited
      </p>
      <div
        className="progress small"
        role="progressbar"
        aria-label={`${label} visited`}
        aria-valuemin={0}
        aria-valuemax={regions.length}
        aria-valuenow={count}
        aria-valuetext={percentLabel(count, regions.length)}
      >
        <div style={{ width: `${(count / regions.length) * 100}%` }} />
      </div>
      <p className="muted">Click them on the globe, or tick them here.</p>
      {regions.length > 12 && (
        <input
          type="search"
          className="regions-filter"
          aria-label={`Filter ${label.toLowerCase()}`}
          placeholder={`Filter ${label.toLowerCase()}…`}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      )}
      <ul className="region-list">
        {shown.map((region) => (
          <li key={region.properties.id}>
            <label>
              <input
                type="checkbox"
                checked={visited.has(region.properties.id)}
                onChange={() => onToggle(region)}
              />
              {region.properties.name}
            </label>
          </li>
        ))}
      </ul>
    </section>
  )
}
