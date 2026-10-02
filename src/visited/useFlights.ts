import { useCallback } from 'react'
import type { Flight } from '../data/flights'
import { usePersistentState } from '../storage'

export const FLIGHTS_KEY = 'countries-app.flights'

const isFlightList = (value: unknown): value is Flight[] =>
  Array.isArray(value) &&
  value.every(
    (f) => typeof f === 'object' && f !== null && typeof f.id === 'string' && typeof f.from === 'number' && typeof f.to === 'number',
  )

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`)

/** Flights you've taken, in the order added, saved in this browser. */
export function useFlights() {
  const [flights, setFlights] = usePersistentState<Flight[]>(FLIGHTS_KEY, [], isFlightList)
  const add = useCallback(
    (from: number, to: number) => {
      if (from !== to) setFlights((prev) => [...prev, { id: newId(), from, to }])
    },
    [setFlights],
  )
  const remove = useCallback((id: string) => setFlights((prev) => prev.filter((f) => f.id !== id)), [setFlights])
  return { flights, add, remove }
}
