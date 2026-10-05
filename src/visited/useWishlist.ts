import { useCallback, useMemo } from 'react'
import { usePersistentState } from '../storage'
import { isNameList } from './useVisited'

export const WISHLIST_KEY = 'countries-app.wishlist'

/** Places you want to go, by name, saved in this browser. Going there takes them off: see App. */
export function useWishlist() {
  const [names, setNames] = usePersistentState<string[]>(WISHLIST_KEY, [], isNameList)
  const wishlist = useMemo(() => new Set(names), [names])

  const add = useCallback((name: string) => setNames((prev) => (prev.includes(name) ? prev : [...prev, name])), [setNames])
  const remove = useCallback(
    (name: string) => setNames((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : prev)),
    [setNames],
  )
  const toggle = useCallback(
    (name: string) => setNames((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name])),
    [setNames],
  )
  return { wishlist, add, remove, toggle }
}
