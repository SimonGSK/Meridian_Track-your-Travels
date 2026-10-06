import { useEffect, useRef, type ReactNode } from 'react'
import Card from '../ui/Card'

export type VisitedView = 'countries' | 'flights' | 'years' | 'achievements'

type Props = {
  view: VisitedView
  onViewChange: (view: VisitedView) => void
  /** Countries and territories visited, for the header */
  places: number
  flights: number
  /** Years with dated visits or flights */
  years: number
  /** Achievements earned, and how many there are */
  earned: number
  achievementCount: number
  countries: ReactNode
  flightsPanel: ReactNode
  yearsPanel: ReactNode
  achievements: ReactNode
}

const VIEWS: { id: VisitedView; label: string }[] = [
  { id: 'countries', label: 'Countries' },
  { id: 'flights', label: 'Flights' },
  { id: 'years', label: 'Years' },
  { id: 'achievements', label: 'Achievements' },
]

const plural = (n: number, one: string) => `${n} ${n === 1 ? one : `${one}s`}`

/** The Visited tab: your countries, your flights, your years or your achievements, switched at the top */
export default function VisitedTab(props: Props) {
  const { view, onViewChange, places, flights, years, earned, achievementCount } = props
  const meta = {
    countries: plural(places, 'place'),
    flights: plural(flights, 'flight'),
    years: plural(years, 'year'),
    achievements: `${earned} / ${achievementCount}`,
  }[view]
  const panel = {
    countries: props.countries,
    flights: props.flightsPanel,
    years: props.yearsPanel,
    achievements: props.achievements,
  }[view]

  // Switching, from here or from an achievement's note, brings the switch back into view if it was scrolled away
  const tabs = useRef<HTMLDivElement>(null)
  const shown = useRef(view)
  useEffect(() => {
    if (shown.current === view) return
    shown.current = view
    tabs.current?.scrollIntoView?.({ block: 'nearest' })
  }, [view])

  return (
    <Card label="Visited atlas" meta={meta}>
      <div ref={tabs} className="segmented" role="tablist" aria-label="Show">
        {VIEWS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`visited-${id}-tab`}
            aria-selected={view === id}
            aria-controls={`visited-${id}`}
            onClick={() => onViewChange(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`visited-${view}`} aria-labelledby={`visited-${view}-tab`}>
        {panel}
      </div>
    </Card>
  )
}
