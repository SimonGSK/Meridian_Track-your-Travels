import { useEffect, useRef, type ReactNode } from 'react'
import { CalendarIcon, FlagIcon, PeopleIcon, PlaneIcon, TrophyIcon } from '../icons'
import Card from '../ui/Card'

export type VisitedView = 'countries' | 'flights' | 'years' | 'achievements' | 'compare'

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
  /** The friend you compare with, by name, if any */
  friend: string | null
  countries: ReactNode
  flightsPanel: ReactNode
  yearsPanel: ReactNode
  achievements: ReactNode
  compare: ReactNode
}

/**
 * Five, so each is a symbol: its name shows when pointed at, and is read
 * out. The card's header names what's shown, short enough for one line.
 */
const VIEWS: { id: VisitedView; label: string; header: string; icon: ReactNode }[] = [
  { id: 'countries', label: 'Countries', header: 'Visited atlas', icon: <FlagIcon size={18} /> },
  { id: 'flights', label: 'Flights', header: 'Flights', icon: <PlaneIcon size={18} /> },
  { id: 'years', label: 'Years', header: 'Years', icon: <CalendarIcon size={18} /> },
  { id: 'achievements', label: 'Achievements', header: 'Achievements', icon: <TrophyIcon size={18} /> },
  { id: 'compare', label: 'Compare with a friend', header: 'Compare', icon: <PeopleIcon size={18} /> },
]

const plural = (n: number, one: string) => `${n} ${n === 1 ? one : `${one}s`}`

/** The Visited tab: your countries, flights, years, achievements, or comparing with a friend, switched at the top */
export default function VisitedTab(props: Props) {
  const { view, onViewChange, places, flights, years, earned, achievementCount, friend } = props
  const meta = {
    countries: plural(places, 'place'),
    flights: plural(flights, 'flight'),
    years: plural(years, 'year'),
    achievements: `${earned} / ${achievementCount}`,
    compare: friend ? `with ${friend}` : 'a friend',
  }[view]
  const panel = {
    countries: props.countries,
    flights: props.flightsPanel,
    years: props.yearsPanel,
    achievements: props.achievements,
    compare: props.compare,
  }[view]
  const label = VIEWS.find((v) => v.id === view)!.header

  // Switching, from here or from an achievement's note, brings the switch back into view if it was scrolled away
  const tabs = useRef<HTMLDivElement>(null)
  const shown = useRef(view)
  useEffect(() => {
    if (shown.current === view) return
    shown.current = view
    tabs.current?.scrollIntoView?.({ block: 'nearest' })
  }, [view])

  return (
    <Card label={label} meta={meta}>
      <div ref={tabs} className="segmented icons" role="tablist" aria-label="Show">
        {VIEWS.map(({ id, label, icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`visited-${id}-tab`}
            aria-label={label}
            title={label}
            aria-selected={view === id}
            aria-controls={`visited-${id}`}
            onClick={() => onViewChange(id)}
          >
            {icon}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`visited-${view}`} aria-labelledby={`visited-${view}-tab`}>
        {panel}
      </div>
    </Card>
  )
}
