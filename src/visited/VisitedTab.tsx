import type { ReactNode } from 'react'
import Card from '../ui/Card'

export type VisitedView = 'countries' | 'flights'

type Props = {
  view: VisitedView
  onViewChange: (view: VisitedView) => void
  /** Countries and territories visited, for the header */
  places: number
  flights: number
  countries: ReactNode
  flightsPanel: ReactNode
}

const VIEWS: { id: VisitedView; label: string }[] = [
  { id: 'countries', label: 'Countries' },
  { id: 'flights', label: 'Flights' },
]

/** The Visited tab: your countries or your flights, switched at the top */
export default function VisitedTab({ view, onViewChange, places, flights, countries, flightsPanel }: Props) {
  return (
    <Card
      letter="B"
      label="Visited atlas"
      meta={view === 'countries' ? `${places} ${places === 1 ? 'place' : 'places'}` : `${flights} ${flights === 1 ? 'flight' : 'flights'}`}
    >
      <div className="segmented" role="tablist" aria-label="Show">
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
        {view === 'countries' ? countries : flightsPanel}
      </div>
    </Card>
  )
}
