import { useState } from 'react'
import { cityOf, type Airport } from '../data/airports'
import { flightStats, formatDistance, type Route } from '../data/flights'
import { stopsOf, tripsByDate, tripsOf } from '../data/trips'
import { formatVisitDate, type VisitDate } from '../data/visitDates'
import { CloseIcon } from '../icons'
import StatsBox from '../ui/StatsBox'
import AirportSearch from './AirportSearch'
import MonthYearSelect from './MonthYearSelect'

type Props = {
  /** Your flights with their cities, in the order added */
  routes: Route[]
  /** Every airport, or null while they load */
  airports: Airport[] | null
  onAdd: (from: string, to: string, date: VisitDate | null) => void
  onRemove: (id: string) => void
  /** Sets when a flight was, or null for no date */
  onDate: (id: string, date: VisitDate | null) => void
  /** Shows a flight's route on the globe */
  onShow: (route: Route) => void
  /** Shows a trip's routes on the globe */
  onShowTrip: (routes: Route[]) => void
}

const oneDecimal = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })

type RowProps = {
  route: Route
  /** Its date being changed */
  editing: boolean
  onEdit: () => void
  onShow: () => void
  onRemove: () => void
  onDate: (date: VisitDate | null) => void
}

/** A flight in the list: its route, its date (which can be changed) and a button to remove it */
function FlightRow({ route, editing, onEdit, onShow, onRemove, onDate }: RowProps) {
  const when = route.flight.date
  const name = `flight from ${cityOf(route.from)} to ${cityOf(route.to)}`
  return (
    <li className={`country-item${editing ? ' editing' : ''}`}>
      <button type="button" className="country-row" onClick={onShow}>
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
        className="link-button flight-date"
        aria-expanded={editing}
        aria-label={`${when ? `Change the date, ${formatVisitDate(when)},` : 'Add a date to the'} ${name}`}
        onClick={onEdit}
      >
        {when ? formatVisitDate(when) : 'Add date'}
      </button>
      <button type="button" className="icon-button small" onClick={onRemove} aria-label={`Remove ${name}`}>
        <CloseIcon size={14} />
      </button>
      {editing && (
        <div className="flight-date-editor">
          <MonthYearSelect label={`When you took the ${name}`} value={when ?? null} onChange={onDate} optional />
          <button type="button" className="link-button" onClick={onEdit}>
            Done
          </button>
        </div>
      )}
    </li>
  )
}

/** The Visited tab's flights: what they add up to, a form to add one, and the list, grouped into trips */
export default function FlightsPanel({ routes, airports, onAdd, onRemove, onDate, onShow, onShowTrip }: Props) {
  const [from, setFrom] = useState<Airport | null>(null)
  const [to, setTo] = useState<Airport | null>(null)
  // Kept for the next leg too, which is likely the same trip
  const [date, setDate] = useState<VisitDate | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const { flights, km, aroundEarth } = flightStats(routes)

  const add = () => {
    if (!from || !to || from === to) return
    onAdd(from.code, to.code, date)
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
          <div className="city-choice">
            <span className="city-choice-label">When (optional)</span>
            <MonthYearSelect label="When you flew" value={date} onChange={setDate} optional />
          </div>
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
          {tripsByDate(tripsOf(routes)).map((trip) => {
            const row = (route: Route) => (
              <FlightRow
                key={route.flight.id}
                route={route}
                editing={editing === route.flight.id}
                onEdit={() => setEditing(editing === route.flight.id ? null : route.flight.id)}
                onShow={() => onShow(route)}
                onRemove={() => onRemove(route.flight.id)}
                onDate={(d) => onDate(route.flight.id, d)}
              />
            )
            if (trip.routes.length === 1) return row(trip.routes[0])
            const stops = stopsOf(trip).join(' → ')
            const meta = ['Trip', trip.date && formatVisitDate(trip.date), `${trip.routes.length} flights`, formatDistance(trip.km)]
            return (
              <li key={trip.routes[0].flight.id} className="trip">
                <button type="button" className="trip-header" onClick={() => onShowTrip(trip.routes)}>
                  <span className="trip-meta">{meta.filter(Boolean).join(' · ')}</span>
                  <span className="trip-route">{stops}</span>
                </button>
                <ul className="flight-list trip-legs" aria-label={`Flights of the trip ${stops}`}>
                  {trip.routes.map(row)}
                </ul>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
