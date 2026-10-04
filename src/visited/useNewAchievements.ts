import { useCallback, useEffect, useRef, useState } from 'react'
import { ACHIEVEMENTS, earnedIds, type Achievement, type Atlas } from './achievements'

/**
 * The achievements just earned by something you did: not those earned
 * already when the app opened, nor those that appear as the cities and
 * airports load in the background (`loaded` turns true then). Clear them
 * once shown.
 */
export function useNewAchievements(atlas: Atlas, loaded: boolean) {
  const [fresh, setFresh] = useState<Achievement[]>([])
  const before = useRef<Set<string> | null>(null)
  const loadedBefore = useRef(loaded)

  useEffect(() => {
    const earned = earnedIds(atlas)
    const previous = before.current
    const quietly = !previous || !loaded || loaded !== loadedBefore.current
    before.current = earned
    loadedBefore.current = loaded
    if (quietly) return
    const added = ACHIEVEMENTS.filter((a) => earned.has(a.id) && !previous.has(a.id))
    if (added.length) setFresh(added)
  }, [atlas, loaded])

  const clear = useCallback(() => setFresh([]), [])
  return [fresh, clear] as const
}
