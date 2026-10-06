import { useCallback, useEffect, useState } from 'react'

/** How long each year shows, long enough for the globe to turn to it */
export const LAPSE_STEP_MS = 2200

/**
 * Playing through `count` steps, one every LAPSE_STEP_MS: the step shown and
 * whether it's moving on, or null when it isn't showing at all. It stops on
 * the last step.
 */
export function useTimeLapse(count: number) {
  const [lapse, setLapse] = useState<{ step: number; playing: boolean } | null>(null)

  useEffect(() => {
    if (!lapse?.playing) return
    const timer = setTimeout(
      () =>
        setLapse((now) => {
          if (!now) return now
          const step = now.step + 1
          return { step, playing: step + 1 < count }
        }),
      LAPSE_STEP_MS,
    )
    return () => clearTimeout(timer)
  }, [lapse, count])

  /** From the start, or on from where it was paused */
  const play = useCallback(
    () => setLapse((now) => (now && !now.playing && now.step + 1 < count ? { ...now, playing: true } : { step: 0, playing: count > 1 })),
    [count],
  )
  const pause = useCallback(() => setLapse((now) => now && { ...now, playing: false }), [])
  const stop = useCallback(() => setLapse(null), [])

  // Steps that are gone (dates removed) end it
  const shown = lapse && lapse.step < count ? lapse : null
  return { lapse: shown, play, pause, stop }
}
