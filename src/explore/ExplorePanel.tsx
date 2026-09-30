import { GearIcon } from '../icons'
import type { Settings } from './useSettings'

type Props = {
  settings: Settings
  onChange: (changes: Partial<Settings>) => void
}

function Switch({ label, description, checked, onChange }: {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="switch">
      <span>
        <strong>{label}</strong>
        <span className="muted">{description}</span>
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  )
}

export default function ExplorePanel({ settings, onChange }: Props) {
  return (
    <>
      <ul className="tips">
        <li>Drag to spin the globe, scroll or pinch to zoom.</li>
        <li>Hover a country to see its name and flag, click it to fly there.</li>
        <li>Small islands and microstates have a ring around them.</li>
        <li>Escape closes whatever is open.</li>
      </ul>

      <h3 className="with-icon">
        <GearIcon size={16} /> Settings
      </h3>
      <div className="switches">
        <Switch
          label="Visited countries"
          description="Color the countries you've visited on the globe"
          checked={settings.showVisited}
          onChange={(showVisited) => onChange({ showVisited })}
        />
        <Switch
          label="Island markers"
          description="Rings around small islands and territories"
          checked={settings.showMarkers}
          onChange={(showMarkers) => onChange({ showMarkers })}
        />
      </div>
    </>
  )
}
