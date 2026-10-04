import { useEffect, useRef, useState } from 'react'

/** What was saved under a key: the value if it could be read, and the raw text if it couldn't */
function readSaved<T>(key: string, isValid: (value: unknown) => value is T): { value?: T; unreadable?: string } {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return {}
    try {
      const value: unknown = JSON.parse(raw)
      return isValid(value) ? { value } : { unreadable: raw }
    } catch {
      return { unreadable: raw }
    }
  } catch {
    return {} // storage unavailable (private mode)
  }
}

/**
 * Reads a JSON value saved in this browser. Falls back when nothing is
 * stored, the data is malformed, or storage is unavailable (private mode).
 */
export function readStored<T>(key: string, fallback: T, isValid: (value: unknown) => value is T): T {
  const { value } = readSaved(key, isValid)
  return value === undefined ? fallback : value
}

/** Where data that couldn't be read is kept, rather than lost, once it's replaced */
export const unreadableKey = (key: string) => `${key}.unreadable`

/**
 * useState that survives page reloads, saved in this browser only.
 *
 * Nothing is written until the value changes, so data the app can't read
 * (from a newer version, or damaged) isn't replaced by the fallback just
 * by opening the app; when a change does replace it, it's kept under
 * unreadableKey(key).
 */
export function usePersistentState<T>(key: string, fallback: T, isValid: (value: unknown) => value is T) {
  const [{ initial, unreadable }] = useState(() => {
    const saved = readSaved(key, isValid)
    return { initial: saved.value === undefined ? fallback : saved.value, unreadable: saved.unreadable }
  })
  const [value, setValue] = useState(initial)
  // The value as read, until it changes; it isn't written back
  const asRead = useRef<{ value: T } | null>({ value: initial })

  useEffect(() => {
    if (asRead.current && Object.is(asRead.current.value, value)) return
    asRead.current = null
    try {
      if (unreadable !== undefined && localStorage.getItem(unreadableKey(key)) === null) {
        localStorage.setItem(unreadableKey(key), unreadable)
      }
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Storage full or blocked: keep working for this session
    }
  }, [key, value, unreadable])
  return [value, setValue] as const
}
