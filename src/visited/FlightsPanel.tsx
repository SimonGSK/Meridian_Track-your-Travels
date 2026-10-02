import { useState } from 'react'
import { cityOf, type Airport } from '../data/airports'
import { flightStats, formatDistance, type Route } from '../data/flights'
import { CloseIcon } from '../icons'
import StatsBox from '../ui/StatsBox'
import AirportSearch from './AirportSearch'

type Props = {
  /** Your flights with their cities, in the order added */
  routes: Route[]
  /** Every airport, or null while they load */
  airports: Airport[] | null
  onAdd: (from: string, to: string) => void
  onRemove: (id: string) => void
  /** Shows a flight's route on the globe */
  onShow: (route: Route) => void
}

const oneDecimal = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })

/** The Visited tab's flights: what they add up to, a form to add one, and the list */
export default function FlightsPanel({ routes, airports, onAdd, onRemove, onShow }: Props) {
  const [from, setFrom] = useState<Airport | null>(null)
  const [to, setTo] = useState<Airport | null>(null)
  const { flights, km, aroundEarth } = flightStats(routes)

  const add = () => {
    if (!from || !to || from === to) return
    onAdd(from.code, to.code)
    // The next leg of the trip starts where this one landed
    setFrom(to)
    setTo(null)
  }

  return (
    <div className="flights">
      <StatsBox
        label="Your flights"
        stats={[
          { label: 'Flights', value: flights },
          { label: 'Distance', value: formatDistance(km) },
          { label: 'Earth laps', value: `${oneDecimal.format(aroundEarth)}×`, title: 'Times around the Earth, at 40,075 km' },
        ]}
      />

      <h3>Add a flight</h3>
      {!airports ? (
        <p className="muted">Loading airports…</p>
      ) : (
        <form
          className="flight-form"
          onSubmit={(e) => {
            e.preventDefault()
            add()
          }}
        >
          <AirportSearch label="From" airports={airports} value={from} onChange={setFrom} />
          <button
            type="button"
            className="swap-button"
            onClick={() => {
              setFrom(to)
              setTo(from)
            }}
            disabled={!from && !to}
            aria-label="Swap From and To"
            title="Swap, for the flight back"
          >
            ⇅
          </button>
          <AirportSearch label="To" airports={airports} value={to} onChange={setTo} />
          <button type="submit" className="primary-button" disabled={!from || !to || from === to}>
            Add flight
          </button>
          {from && to && from === to && <p className="input-hint">From and To are the same airport.</p>}
        </form>
      )}

      <h3>Your flights</h3>
      {routes.length === 0 ? (
        <p className="muted">None yet. Each flight you add is drawn on the globe.</p>
      ) : (
        <ul className="flight-list" aria-label="Flights">
          {[...routes].reverse().map((route) => (
            <li key={route.flight.id} className="country-item">
              <button type="button" className="country-row" onClick={() => onShow(route)}>
                <span className="row-text">
                  <span className="row-name">
                    {cityOf(route.from)} → {cityOf(route.to)}
                  </span>
                  <span className="row-note">
                    {route.from.code} → {route.to.code} · {formatDistance(route.km)}
                  </span>
                </span>
              </button>
              <button
                type="button"
                className="icon-button small"
                onClick={() => onRemove(route.flight.id)}
                aria-label={`Remove flight from ${cityOf(route.from)} to ${cityOf(route.to)}`}
              >
                <CloseIcon size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
