import { useState } from 'react'
import { cityOf, type Airport } from '../data/airports'
import { flightStats, formatDistance, type Route } from '../data/flights'
import { countdown } from '../data/plans'
import { stopsOf, tripsByDate, tripsOf } from '../data/trips'
import { formatVisitDate, type VisitDate } from '../data/visitDates'
import { CloseIcon, PencilIcon, PlayIcon } from '../icons'
import StatsBox from '../ui/StatsBox'
import { noAutofill } from '../ui/noAutofill'
import AirportSearch from './AirportSearch'
import MonthYearSelect from './MonthYearSelect'
import { TRIP_NAME_MAX, TRIP_NOTE_MAX, type TripName } from './useTripNames'

type Props = {
  /** Your flights with their cities, in the order added: those flown */
  routes: Route[]
  /** Flights booked: dated in a month or year still to come */
  upcoming?: Route[]
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
  /** A trip's name and note, from its flights' ids */
  nameOf?: (legs: readonly string[]) => TripName | null
  /** Names a trip; with neither a name nor a note, it has none */
  onName?: (legs: readonly string[], name: TripName) => void
  /** Follows a trip on the globe, flight by flight */
  onFollowTrip?: (routes: Route[]) => void
}

const oneDecimal = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })

type RowProps = {
  route: Route
  /** How long until it, for a flight still to come */
  countdown?: string
  /** Its date being changed */
  editing: boolean
  onEdit: () => void
  onShow: () => void
  onRemove: () => void
  onDate: (date: VisitDate | null) => void
}

/** A flight in the list: its route, its date (which can be changed) and a button to remove it */
function FlightRow({ route, countdown, editing, onEdit, onShow, onRemove, onDate }: RowProps) {
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
            {[`${route.from.code} → ${route.to.code}`, formatDistance(route.km), countdown].filter(Boolean).join(' · ')}
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
          <MonthYearSelect label={`When you took the ${name}`} value={when ?? null} onChange={onDate} optional future />
          <button type="button" className="link-button" onClick={onEdit}>
            Done
          </button>
        </div>
      )}
    </li>
  )
}

/** The Visited tab's flights: what they add up to, a form to add one, and the list, grouped into trips */
export default function FlightsPanel(props: Props) {
  const { routes, upcoming = [], airports, onAdd, onRemove, onDate, onShow, onShowTrip, nameOf, onName, onFollowTrip } = props
  const [from, setFrom] = useState<Airport | null>(null)
  const [to, setTo] = useState<Airport | null>(null)
  // Kept for the next leg too, which is likely the same trip
  const [date, setDate] = useState<VisitDate | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  /** The trip being named, by its first flight */
  const [naming, setNaming] = useState<string | null>(null)
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
            <MonthYearSelect label="When you flew" value={date} onChange={setDate} optional future />
          </div>
          <button type="submit" className="primary-button" disabled={!from || !to || from === to}>
            Add flight
          </button>
          {from && to && from === to && <p className="input-hint">From and To are the same airport.</p>}
        </form>
      )}

      {upcoming.length > 0 && (
        <>
          <h3>Upcoming</h3>
          <ul className="flight-list" aria-label="Upcoming flights">
            {[...upcoming]
              .sort((a, b) => a.flight.date!.localeCompare(b.flight.date!))
              .map((route) => (
                <FlightRow
                  key={route.flight.id}
                  route={route}
                  countdown={countdown(route.flight.date!)}
                  editing={editing === route.flight.id}
                  onEdit={() => setEditing(editing === route.flight.id ? null : route.flight.id)}
                  onShow={() => onShow(route)}
                  onRemove={() => onRemove(route.flight.id)}
                  onDate={(d) => onDate(route.flight.id, d)}
                />
              ))}
          </ul>
        </>
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
            const legs = trip.routes.map((route) => route.flight.id)
            const id = legs[0]
            const named = nameOf?.(legs) ?? null
            const name = named?.name.trim() ? named.name : null
            return (
              <li key={id} className="trip">
                <div className="trip-top">
                  <button type="button" className="trip-header" onClick={() => onShowTrip(trip.routes)}>
                    <span className="trip-meta">{meta.filter(Boolean).join(' · ')}</span>
                    {name && <span className="trip-name">{name}</span>}
                    <span className={name ? 'trip-stops' : 'trip-route'}>{stops}</span>
                    {named?.note && naming !== id && <span className="visit-note">{named.note}</span>}
                  </button>
                  {onName && (
                    <button
                      type="button"
                      className="remove-button note-button"
                      aria-expanded={naming === id}
                      onClick={() => setNaming(naming === id ? null : id)}
                      aria-label={name ? `Rename the trip ${name}` : `Name the trip ${stops}`}
                    >
                      <PencilIcon size={14} />
                    </button>
                  )}
                  {onFollowTrip && (
                    <button
                      type="button"
                      className="remove-button note-button"
                      onClick={() => onFollowTrip(trip.routes)}
                      aria-label={`Follow the trip ${name ?? stops}`}
                      title="Follow it on the globe, flight by flight"
                    >
                      <PlayIcon size={14} />
                    </button>
                  )}
                </div>
                {onName && naming === id && (
                  <form
                    className="note-editor trip-name-editor"
                    onSubmit={(e) => {
                      e.preventDefault()
                      setNaming(null)
                    }}
                  >
                    <input
                      {...noAutofill('trip-name')}
                      type="text"
                      aria-label={`Name of the trip ${stops}`}
                      placeholder="Interrail 2019"
                      maxLength={TRIP_NAME_MAX}
                      value={named?.name ?? ''}
                      onChange={(e) => onName(legs, { name: e.target.value, note: named?.note })}
                      // Opened by pressing the pencil, to write in straight away
                      autoFocus
                    />
                    <input
                      {...noAutofill('trip-note')}
                      type="text"
                      aria-label={`Note on the trip ${stops}`}
                      placeholder="Who with, what you did…"
                      maxLength={TRIP_NOTE_MAX}
                      value={named?.note ?? ''}
                      onChange={(e) => onName(legs, { name: named?.name ?? '', note: e.target.value })}
                    />
                    <button type="submit" className="link-button">
                      Done
                    </button>
                  </form>
                )}
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
