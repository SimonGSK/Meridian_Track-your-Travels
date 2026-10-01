import { VIEWS, type ViewId } from './views'

type Props = {
  view: ViewId | null
  onChange: (view: ViewId) => void
}

/** The tabs at the top (a tab bar at the bottom on phones). */
export default function Tabs({ view, onChange }: Props) {
  return (
    <nav className="tabs" aria-label="Main">
      {VIEWS.map((item) => (
        <button
          key={item.id}
          type="button"
          className="tab"
          aria-expanded={view === item.id}
          aria-controls="side-panel"
          onClick={() => onChange(item.id)}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
