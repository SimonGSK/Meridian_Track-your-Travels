import { useCallback, useMemo } from 'react'
import { usePersistentState } from '../storage'

export const VISITED_REGIONS_KEY = 'countries-app.visited-regions'

const isIdList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((v) => typeof v === 'string')

/** States and provinces the user has visited, by id ("US-CA"), saved in this browser. */
export function useVisitedRegions() {
  const [ids, setIds] = usePersistentState<string[]>(VISITED_REGIONS_KEY, [], isIdList)
  const visitedRegions = useMemo(() => new Set(ids), [ids])
  const toggle = useCallback(
    (id: string) => setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])),
    [setIds],
  )
  return { visitedRegions, toggle }
}
