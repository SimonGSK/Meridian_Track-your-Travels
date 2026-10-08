import { useState } from 'react'
import type { RegionFeature } from './data/regions'
import { normalizeName } from './data/names'
import { percentLabel } from './visited/percentLabel'
import { noAutofill } from './ui/noAutofill'

type Props = {
  /** The country's regions, or null while they load */
  regions: RegionFeature[] | null
  /** What they're called, e.g. "States" */
  label: string
  visited: ReadonlySet<string>
  onToggle: (region: RegionFeature) => void
}

/**
 * "3 of 51 states explored · California, New York, Texas", opening the list
 * of states to tick off. They can also be clicked on the globe.
 */
export default function RegionPicker({ regions, label, visited, onToggle }: Props) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const name = label.toLowerCase()

  if (!regions) return <p className="regions-line muted">Loading {name}…</p>

  const visitedRegions = regions.filter((r) => visited.has(r.properties.id))
  const query = normalizeName(filter)
  const shown = query ? regions.filter((r) => normalizeName(r.properties.name).includes(query)) : regions

  return (
    <div className="regions">
      <p className="regions-line">
        <button type="button" className="link-button" aria-expanded={open} onClick={() => setOpen(!open)}>
          {visitedRegions.length} of {regions.length} {name} explored
        </button>
        {visitedRegions.length > 0 && <span> · {visitedRegions.map((r) => r.properties.name).join(', ')}</span>}
      </p>
      {open && (
        <section className="region-picker" aria-label={label}>
          <div
            className="progress small"
            role="progressbar"
            aria-label={`${label} visited`}
            aria-valuemin={0}
            aria-valuemax={regions.length}
            aria-valuenow={visitedRegions.length}
            aria-valuetext={percentLabel(visitedRegions.length, regions.length)}
          >
            <div style={{ width: `${(visitedRegions.length / regions.length) * 100}%` }} />
          </div>
          <p className="muted">Tick them here, or click them on the globe.</p>
          {regions.length > 12 && (
            <input
              {...noAutofill('region')}
              type="search"
              className="regions-filter"
              aria-label={`Filter ${name}`}
              placeholder={`Filter ${name}…`}
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
      )}
    </div>
  )
}
