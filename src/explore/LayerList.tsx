import { EyeIcon, EyeOffIcon } from '../icons'
import type { Settings } from './useSettings'

type Layer = {
  key: keyof Settings
  label: string
  description: string
  dot: 'accent' | 'blue'
  /** Only offered while this layer is on, indented under it */
  under?: keyof Settings
}

const LAYERS: Layer[] = [
  { key: 'showVisited', label: 'Visited countries', description: "Color the countries you've visited", dot: 'accent' },
  { key: 'showRegions', label: 'Visited states', description: "Color the states you've visited, a shade darker", dot: 'accent' },
  { key: 'showCities', label: 'City pins', description: "A pin on each city you've visited", dot: 'accent' },
  { key: 'showFlights', label: 'Flights', description: "A line for each flight you've taken", dot: 'blue' },
  { key: 'showMarkers', label: 'Small islands', description: 'Rings around small islands and territories', dot: 'blue' },
  { key: 'showDayNight', label: 'Day and night', description: 'Night where the sun has set now', dot: 'blue' },
  { key: 'showCityLights', label: 'City lights', description: 'Cities lit up on the night side', dot: 'blue', under: 'showDayNight' },
]

/** A switch with an eye for each layer on the globe */
export default function LayerList({ settings, onChange }: { settings: Settings; onChange: (changes: Partial<Settings>) => void }) {
  return (
    <ul className="row-list layers">
      {LAYERS.filter(({ under }) => !under || settings[under]).map(({ key, label, description, dot, under }) => (
        <li key={key} className={under ? 'sublayer' : undefined}>
          <button
            type="button"
            role="switch"
            aria-checked={settings[key]}
            className="row-button layer"
            title={description}
            onClick={() => onChange({ [key]: !settings[key] })}
          >
            <span className={`dot ${dot}`} aria-hidden="true" />
            <span>{label}</span>
            <span className="eye" aria-hidden="true">
              {settings[key] ? <EyeIcon /> : <EyeOffIcon />}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
