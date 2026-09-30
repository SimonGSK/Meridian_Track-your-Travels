import { useCallback, useMemo } from 'react'
import { findCountryByName } from '../countries'
import { usePersistentState } from '../storage'

export const VISITED_STORAGE_KEY = 'countries-app.visited'

const isNameList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((v) => typeof v === 'string')

// Earlier versions saved the map's names ("Dem. Rep. Congo"); read them as today's names
const canonical = (name: string) => findCountryByName(name)?.properties.name ?? name
const canonicalList = (names: string[]) => [...new Set(names.map(canonical))]

/** Countries the user has visited, by name, saved in this browser. */
export function useVisited() {
  const [names, setNames] = usePersistentState<string[]>(VISITED_STORAGE_KEY, [], isNameList)
  const visited = useMemo(() => new Set(canonicalList(names)), [names])

  const update = useCallback(
    (change: (names: string[]) => string[]) => setNames((prev) => change(canonicalList(prev))),
    [setNames],
  )
  const add = useCallback((name: string) => update((prev) => (prev.includes(name) ? prev : [...prev, name])), [update])
  const remove = useCallback((name: string) => update((prev) => prev.filter((n) => n !== name)), [update])
  const toggle = useCallback(
    (name: string) => update((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name])),
    [update],
  )

  return { visited, add, remove, toggle }
}
