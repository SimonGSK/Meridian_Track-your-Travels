import { GlobeIcon } from '../icons'
import { VIEWS, type ViewId } from './views'

type Props = {
  view: ViewId | null
  onChange: (view: ViewId | null) => void
}

/** The menu on the left (a tab bar at the bottom on phones). */
export default function NavRail({ view, onChange }: Props) {
  return (
    <nav className="rail" aria-label="Main">
      <div className="rail-logo">
        <GlobeIcon size={28} />
      </div>
      {VIEWS.map((item) => (
        <button
          key={item.id}
          type="button"
          className="rail-item"
          aria-expanded={view === item.id}
          aria-controls="side-panel"
          onClick={() => onChange(view === item.id ? null : item.id)}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
