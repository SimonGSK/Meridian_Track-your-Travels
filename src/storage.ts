import { useEffect, useState } from 'react'

/**
 * Reads a JSON value saved in this browser. Falls back when nothing is
 * stored, the data is malformed, or storage is unavailable (private mode).
 */
export function readStored<T>(key: string, fallback: T, isValid: (value: unknown) => value is T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    const value: unknown = JSON.parse(raw)
    return isValid(value) ? value : fallback
  } catch {
    return fallback
  }
}

/** useState that survives page reloads, saved in this browser only. */
export function usePersistentState<T>(key: string, fallback: T, isValid: (value: unknown) => value is T) {
  const [value, setValue] = useState(() => readStored(key, fallback, isValid))
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Storage full or blocked: keep working for this session
    }
  }, [key, value])
  return [value, setValue] as const
}
