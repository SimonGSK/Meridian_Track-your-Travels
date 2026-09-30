import { useCallback, useMemo } from 'react'
import { usePersistentState } from '../storage'

export const VISITED_STORAGE_KEY = 'countries-app.visited'

const isNameList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((v) => typeof v === 'string')

/** Countries the user has visited, by name, saved in this browser. */
export function useVisited() {
  const [names, setNames] = usePersistentState<string[]>(VISITED_STORAGE_KEY, [], isNameList)
  const visited = useMemo(() => new Set(names), [names])

  const add = useCallback(
    (name: string) => setNames((prev) => (prev.includes(name) ? prev : [...prev, name])),
    [setNames],
  )
  const remove = useCallback((name: string) => setNames((prev) => prev.filter((n) => n !== name)), [setNames])
  const toggle = useCallback(
    (name: string) => setNames((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name])),
    [setNames],
  )

  return { visited, add, remove, toggle }
}
