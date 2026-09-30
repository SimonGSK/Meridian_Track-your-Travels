import { useCallback } from 'react'
import { usePersistentState } from '../storage'

export type Settings = {
  /** Color the countries you've visited on the globe */
  showVisited: boolean
  /** Rings around tiny places (islands, microstates) */
  showMarkers: boolean
}

export const SETTINGS_KEY = 'countries-app.settings'
export const DEFAULT_SETTINGS: Settings = { showVisited: true, showMarkers: true }

const isSettings = (value: unknown): value is Partial<Settings> =>
  typeof value === 'object' &&
  value !== null &&
  Object.entries(value).every(([key, v]) => key in DEFAULT_SETTINGS && typeof v === 'boolean')

/** Map settings, saved in this browser. */
export function useSettings() {
  const [saved, setSaved] = usePersistentState<Partial<Settings>>(SETTINGS_KEY, {}, isSettings)
  // Settings added later get their default
  const settings: Settings = { ...DEFAULT_SETTINGS, ...saved }
  const change = useCallback((changes: Partial<Settings>) => setSaved((prev) => ({ ...prev, ...changes })), [setSaved])
  return [settings, change] as const
}
