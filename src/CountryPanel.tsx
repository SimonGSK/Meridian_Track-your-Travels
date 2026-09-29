import type { CountryFeature } from './countries'

type Props = {
  country: CountryFeature
  onClose: () => void
}

// Placeholder panel — the info shown per country is still to be decided.
export default function CountryPanel({ country, onClose }: Props) {
  const { name, isoCode } = country.properties

  return (
    <aside className="panel">
      <button className="panel-close" onClick={onClose} aria-label="Close">
        ×
      </button>
      <h2>{name}</h2>
      {isoCode && <p className="panel-meta">ISO numeric code: {isoCode}</p>}
      <p className="panel-placeholder">Country info coming soon.</p>
    </aside>
  )
}
