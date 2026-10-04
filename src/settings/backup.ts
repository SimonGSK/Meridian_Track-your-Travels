import { THEME_STORAGE_KEY, isThemeId } from '../design/useTheme'
import { SETTINGS_KEY, isSettings } from '../explore/useSettings'
import { BEST_TIMES_KEY } from '../games/records'
import { BEST_SCORES_KEY, isBestScores } from '../games/useGame'
import { DAILY_KEY, isDailyResults } from '../games/daily'
import { FLIGHTS_KEY, isFlightList } from '../visited/useFlights'
import { VISITED_STORAGE_KEY, isNameList } from '../visited/useVisited'
import { VISITED_CITIES_KEY, isCityIdList } from '../visited/useVisitedCities'
import { VISITED_REGIONS_KEY, isRegionIdList } from '../visited/useVisitedRegions'
import { VISIT_DATES_KEY, isVisitDates } from '../visited/useVisitDates'

/**
 * Everything is saved in this browser only, so a backup is a file with all
 * of it: places and when you went, states, cities, flights, best scores and times, the design
 * and the layers. Restoring one replaces what's here, part by part checked
 * as the app checks it when loading.
 */

/** What a backup keeps, each with the check the app makes when it loads it */
const SAVED: { key: string; isValid: (value: unknown) => boolean }[] = [
  { key: VISITED_STORAGE_KEY, isValid: isNameList },
  { key: VISITED_REGIONS_KEY, isValid: isRegionIdList },
  { key: VISITED_CITIES_KEY, isValid: isCityIdList },
  { key: VISIT_DATES_KEY, isValid: isVisitDates },
  { key: FLIGHTS_KEY, isValid: isFlightList },
  { key: BEST_SCORES_KEY, isValid: isBestScores },
  { key: BEST_TIMES_KEY, isValid: isBestScores },
  { key: DAILY_KEY, isValid: isDailyResults },
  { key: THEME_STORAGE_KEY, isValid: isThemeId },
  { key: SETTINGS_KEY, isValid: isSettings },
]

/** When a backup was last downloaded here; not part of the backup */
export const LAST_BACKUP_KEY = 'countries-app.last-backup'

export const BACKUP_APP = 'meridian'
export const BACKUP_VERSION = 1

export type Backup = {
  app: typeof BACKUP_APP
  version: typeof BACKUP_VERSION
  /** When it was made, as an ISO date */
  savedAt: string
  /** The saved values by their storage key, as JSON values (not strings), so the file is readable */
  data: Record<string, unknown>
}

/** What a backup holds, to show before restoring it */
export type BackupSummary = {
  savedAt: Date
  places: number
  states: number
  cities: number
  flights: number
  /** Games and difficulties with a best score */
  records: number
}

/** All that's saved in this browser, as a backup */
export function createBackup(storage: Storage = localStorage, now = new Date()): Backup {
  const data: Record<string, unknown> = {}
  for (const { key, isValid } of SAVED) {
    try {
      const raw = storage.getItem(key)
      if (raw === null) continue
      const value: unknown = JSON.parse(raw)
      if (isValid(value)) data[key] = value
    } catch {
      // Unreadable: the app ignores it too
    }
  }
  return { app: BACKUP_APP, version: BACKUP_VERSION, savedAt: now.toISOString(), data }
}

/** "meridian-backup-2026-10-04.json", by the local date */
export function backupFileName(now = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `meridian-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`
}

const count = (value: unknown) => (Array.isArray(value) ? value.length : 0)

export function summarize(backup: Backup): BackupSummary {
  const { data } = backup
  return {
    savedAt: new Date(backup.savedAt),
    places: count(data[VISITED_STORAGE_KEY]),
    states: count(data[VISITED_REGIONS_KEY]),
    cities: count(data[VISITED_CITIES_KEY]),
    flights: count(data[FLIGHTS_KEY]),
    records: Object.keys((data[BEST_SCORES_KEY] as object | undefined) ?? {}).length,
  }
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** "30 places, 4 states, 45 cities, 12 flights and 8 best scores", leaving out what there's none of */
export function describeBackup({ places, states, cities, flights, records }: BackupSummary) {
  const parts = [
    plural(places, 'place'),
    states && plural(states, 'state'),
    cities && plural(cities, 'city', 'cities'),
    flights && plural(flights, 'flight'),
    records && plural(records, 'best score'),
  ].filter((part): part is string => !!part)
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0]
}

export class BackupError extends Error {}

/**
 * A backup file's contents, checked. Throws a BackupError saying what's
 * wrong, so nothing is restored from a file that isn't a whole, good backup.
 */
export function readBackup(text: string): Backup {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new BackupError("This file isn't a Meridian backup.")
  }
  const backup = parsed as Partial<Backup> | null
  if (typeof backup !== 'object' || backup === null || backup.app !== BACKUP_APP || typeof backup.data !== 'object' || backup.data === null) {
    throw new BackupError("This file isn't a Meridian backup.")
  }
  if (backup.version !== BACKUP_VERSION) throw new BackupError('This backup is from a newer version of Meridian.')
  if (typeof backup.savedAt !== 'string' || Number.isNaN(Date.parse(backup.savedAt))) {
    throw new BackupError("This backup's date is damaged.")
  }
  const data = backup.data as Record<string, unknown>
  const damaged = SAVED.filter(({ key, isValid }) => key in data && !isValid(data[key]))
  if (damaged.length) throw new BackupError('Part of this backup is damaged, so nothing was restored.')
  // Only what the app knows; anything else in the file is left out
  const known = Object.fromEntries(SAVED.filter(({ key }) => key in data).map(({ key }) => [key, data[key]]))
  return { app: BACKUP_APP, version: BACKUP_VERSION, savedAt: backup.savedAt, data: known }
}

/** Replaces what's saved in this browser with the backup: parts it doesn't have are cleared */
export function restoreBackup(backup: Backup, storage: Storage = localStorage) {
  for (const { key } of SAVED) {
    if (key in backup.data) storage.setItem(key, JSON.stringify(backup.data[key]))
    else storage.removeItem(key)
  }
}
