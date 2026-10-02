import { useCallback } from 'react'
import { usePersistentState } from '../storage'

export type Settings = {
  /** Color the countries you've visited on the globe */
  showVisited: boolean
  /** Rings around tiny places (islands, microstates) */
  showMarkers: boolean
  /** Color the states and provinces you've visited, over their country */
  showRegions: boolean
  /** Pins on the cities you've visited */
  showCities: boolean
  /** Lines for the flights you've taken */
  showFlights: boolean
}

export const SETTINGS_KEY = 'countries-app.settings'
export const DEFAULT_SETTINGS: Settings = {
  showVisited: true,
  showMarkers: true,
  showRegions: true,
  showCities: true,
  showFlights: true,
}

const isSettings = (value: unknown): value is Partial<Settings> =>
  typeof value === 'object' && value !== null && Object.values(value).every((v) => typeof v === 'boolean')

/** Only the settings there are now: older versions saved some that are gone (which Explore cards to show) */
const known = (saved: Partial<Settings>) =>
  Object.fromEntries(Object.entries(saved).filter(([key]) => key in DEFAULT_SETTINGS)) as Partial<Settings>

/** Map settings, saved in this browser. */
export function useSettings() {
  const [saved, setSaved] = usePersistentState<Partial<Settings>>(SETTINGS_KEY, {}, isSettings)
  // Settings added later get their default
  const settings: Settings = { ...DEFAULT_SETTINGS, ...known(saved) }
  const change = useCallback(
    (changes: Partial<Settings>) => setSaved((prev) => ({ ...known(prev), ...changes })),
    [setSaved],
  )
  return [settings, change] as const
}
