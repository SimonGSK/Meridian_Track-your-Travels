import { useCallback, useMemo } from 'react'
import { usePersistentState } from '../storage'

export const VISITED_CITIES_KEY = 'countries-app.visited-cities'

const isIdList = (value: unknown): value is number[] =>
  Array.isArray(value) && value.every((v) => typeof v === 'number')

/** Cities the user has visited, by GeoNames id, saved in this browser. */
export function useVisitedCities() {
  const [ids, setIds] = usePersistentState<number[]>(VISITED_CITIES_KEY, [], isIdList)
  const visitedCities = useMemo(() => new Set(ids), [ids])
  const toggle = useCallback(
    (id: number) => setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])),
    [setIds],
  )
  return { visitedCities, toggle }
}
