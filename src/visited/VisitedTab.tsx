import type { ReactNode } from 'react'
import { CalendarIcon, FlagIcon, PlaneIcon } from '../icons'
import Card from '../ui/Card'

export type VisitedView = 'countries' | 'flights' | 'years'

type Props = {
  view: VisitedView
  onViewChange: (view: VisitedView) => void
  /** Countries and territories visited, for the header */
  places: number
  flights: number
  /** Years with dated visits or flights */
  years: number
  countries: ReactNode
  flightsPanel: ReactNode
  yearsPanel: ReactNode
}

/**
 * Each a symbol: its name shows when pointed at, and is read out. The
 * card's header names what's shown, short enough for one line.
 */
const VIEWS: { id: VisitedView; label: string; header: string; icon: ReactNode }[] = [
  { id: 'countries', label: 'Countries', header: 'Visited atlas', icon: <FlagIcon size={18} /> },
  { id: 'flights', label: 'Flights', header: 'Flights', icon: <PlaneIcon size={18} /> },
  { id: 'years', label: 'Years', header: 'Years', icon: <CalendarIcon size={18} /> },
]

const plural = (n: number, one: string) => `${n} ${n === 1 ? one : `${one}s`}`

/** The Visited tab: your countries, flights or years, switched at the top */
export default function VisitedTab(props: Props) {
  const { view, onViewChange, places, flights, years } = props
  const meta = {
    countries: plural(places, 'place'),
    flights: plural(flights, 'flight'),
    years: plural(years, 'year'),
  }[view]
  const panel = {
    countries: props.countries,
    flights: props.flightsPanel,
    years: props.yearsPanel,
  }[view]
  const label = VIEWS.find((v) => v.id === view)!.header

  return (
    <Card label={label} meta={meta}>
      <div className="segmented icons" role="tablist" aria-label="Show">
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
