import { useCallback, useEffect, useMemo } from 'react'
import type { Airport } from '../data/airports'
import type { City } from '../data/cities'
import { isAirportFlight, migrateFlights, type StoredFlight } from '../data/flights'
import { usePersistentState } from '../storage'

export const FLIGHTS_KEY = 'countries-app.flights'

const isEnd = (end: unknown) => typeof end === 'string' || typeof end === 'number'
const isFlightList = (value: unknown): value is StoredFlight[] =>
  Array.isArray(value) &&
  value.every((f) => typeof f === 'object' && f !== null && typeof f.id === 'string' && isEnd(f.from) && isEnd(f.to))

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`)

/**
 * Flights you've taken, between airports, in the order added, saved in this
 * browser. Flights saved between cities move to their airports once the
 * cities and airports have loaded.
 */
export function useFlights(cities: readonly City[] | null, airports: readonly Airport[] | null) {
  const [stored, setStored] = usePersistentState<StoredFlight[]>(FLIGHTS_KEY, [], isFlightList)
  const flights = useMemo(() => stored.filter(isAirportFlight), [stored])

  useEffect(() => {
    if (!cities || !airports || stored.every(isAirportFlight)) return
    setStored(migrateFlights(stored, new Map(cities.map((c) => [c.id, c])), airports))
  }, [cities, airports, stored, setStored])

  const add = useCallback(
    (from: string, to: string) => {
      if (from !== to) setStored((prev) => [...prev, { id: newId(), from, to }])
    },
    [setStored],
  )
  const remove = useCallback((id: string) => setStored((prev) => prev.filter((f) => f.id !== id)), [setStored])
  return { flights, add, remove }
}
