import { useCallback } from 'react'
import { usePersistentState } from '../storage'

export const TRIP_NAMES_KEY = 'countries-app.trip-names'

/** The longest name kept: a few words */
export const TRIP_NAME_MAX = 60
/** The longest note kept: a line or two, as for visits */
export const TRIP_NOTE_MAX = 200

/** What you call a trip ("Interrail 2019"), and a note if you like */
export type TripName = { name: string; note?: string }

/** By flight id: each leg of a named trip carries its name, so it stays when one leg is removed */
type TripNames = Record<string, TripName>

const isTripName = (value: unknown): value is TripName =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as TripName).name === 'string' &&
  ((value as TripName).note === undefined || typeof (value as TripName).note === 'string')

export const isTripNames = (value: unknown): value is TripNames =>
  typeof value === 'object' && value !== null && !Array.isArray(value) && Object.values(value).every(isTripName)

/**
 * Names for trips, saved in this browser. Trips are worked out from the
 * flights, so a name goes with the flights of the trip named: a trip is
 * called what the first of its flights with a name is called, and keeps
 * it as flights are added to it or removed.
 */
export function useTripNames() {
  const [saved, setSaved] = usePersistentState<TripNames>(TRIP_NAMES_KEY, {}, isTripNames)

  /** A trip's name and note, from its flights' ids, or null */
  const nameOf = useCallback((legs: readonly string[]) => legs.map((id) => saved[id]).find(Boolean) ?? null, [saved])

  /**
   * Names a trip, from its flights' ids; with neither a name nor a note, it
   * has none. Names of flights no longer there (`flights`) are let go.
   */
  const setName = useCallback(
    (legs: readonly string[], { name, note = '' }: TripName, flights: readonly string[]) => {
      const kept = { name: name.slice(0, TRIP_NAME_MAX), note: note.slice(0, TRIP_NOTE_MAX) }
      const named = kept.name.trim() || kept.note.trim() ? { name: kept.name, ...(kept.note ? { note: kept.note } : {}) } : null
      const there = new Set(flights)
      setSaved((prev) => {
        const next = Object.fromEntries(Object.entries(prev).filter(([id]) => there.has(id) && !legs.includes(id)))
        if (named) for (const id of legs) next[id] = named
        return next
      })
    },
    [setSaved],
  )
  return { nameOf, setName }
}
