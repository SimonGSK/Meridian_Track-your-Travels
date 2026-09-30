import type { CountryFeature } from './countries'
import { CheckIcon } from './icons'

type Props = {
  country: CountryFeature
  visited: boolean
  onToggleVisited: () => void
  onClose: () => void
}

// Placeholder panel — the info shown per country is still to be decided.
export default function CountryPanel({ country, visited, onToggleVisited, onClose }: Props) {
  const { name, isoCode } = country.properties

  return (
    <aside className="panel" aria-labelledby="country-panel-title">
      <button className="panel-close" onClick={onClose} aria-label="Close">
        ×
      </button>
      <h2 id="country-panel-title">{name}</h2>
      {isoCode && <p className="panel-meta">ISO numeric code: {isoCode}</p>}
      <button
        type="button"
        className={`toggle-button${visited ? ' on' : ''}`}
        aria-pressed={visited}
        onClick={onToggleVisited}
      >
        {visited && <CheckIcon />}
        {visited ? 'Visited' : 'Mark as visited'}
      </button>
      <p className="panel-placeholder">Country info coming soon.</p>
    </aside>
  )
}
