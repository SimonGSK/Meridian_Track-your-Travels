import { beforeEach, describe, expect, it } from 'vitest'
import {
  BACKUP_VERSION,
  BackupError,
  backupFileName,
  createBackup,
  describeBackup,
  readBackup,
  restoreBackup,
  summarize,
} from './backup'

const saved = {
  'countries-app.visited': ['Denmark', 'Japan'],
  'countries-app.visited-regions': ['US-CA'],
  'countries-app.visited-cities': [2618425],
  'countries-app.visit-dates': { Denmark: ['2023-05', '2019'] },
  'countries-app.flights': [{ id: 'a', from: 'CPH', to: 'NRT' }],
  'countries-app.wishlist': ['Peru', 'Iceland'],
  'countries-app.best-scores': { 'flags:easy': 9, 'letter:Z': 2 },
  'countries-app.best-times': { 'letter:Z': 8100 },
  'countries-app.daily': { '2026-10-05': { score: 6, max: 7, squares: '🟩🟩🟨🟩🟥' } },
  'countries-app.design': 'night',
  'countries-app.settings': { showMarkers: false },
}

function fill() {
  for (const [key, value] of Object.entries(saved)) localStorage.setItem(key, JSON.stringify(value))
}

describe('createBackup', () => {
  beforeEach(fill)

  it('keeps everything saved, as readable JSON', () => {
    const backup = createBackup(localStorage, new Date('2026-10-04T10:00:00Z'))
    expect(backup).toEqual({ app: 'meridian', version: BACKUP_VERSION, savedAt: '2026-10-04T10:00:00.000Z', data: saved })
  })

  it('leaves out what the app would ignore: damaged data, and other keys', () => {
    localStorage.setItem('countries-app.flights', 'not json')
    localStorage.setItem('countries-app.visited', JSON.stringify([1, 2]))
    localStorage.setItem('countries-app.visit-dates', JSON.stringify({ Denmark: ['last summer'] }))
    localStorage.setItem('countries-app.last-backup', JSON.stringify('2026-10-01T00:00:00Z'))
    const { data } = createBackup()
    expect(data).not.toHaveProperty('countries-app.flights')
    expect(data).not.toHaveProperty('countries-app.visited')
    expect(data).not.toHaveProperty('countries-app.visit-dates')
    expect(data).not.toHaveProperty('countries-app.last-backup')
  })
})

describe('reading and restoring', () => {
  it('restores a backup, replacing what is here', () => {
    fill()
    const text = JSON.stringify(createBackup())
    localStorage.clear()
    localStorage.setItem('countries-app.visited', JSON.stringify(['Peru']))
    restoreBackup(readBackup(text))
    for (const [key, value] of Object.entries(saved)) expect(JSON.parse(localStorage.getItem(key)!)).toEqual(value)
  })

  it('clears what the backup does not have', () => {
    localStorage.setItem('countries-app.flights', JSON.stringify([{ id: 'b', from: 'LHR', to: 'JFK' }]))
    restoreBackup(readBackup(JSON.stringify({ app: 'meridian', version: 1, savedAt: '2026-10-04T10:00:00Z', data: {} })))
    expect(localStorage.getItem('countries-app.flights')).toBeNull()
  })

  it('leaves out keys it does not know', () => {
    const backup = readBackup(
      JSON.stringify({ app: 'meridian', version: 1, savedAt: '2026-10-04T10:00:00Z', data: { 'something-else': 1 } }),
    )
    expect(backup.data).toEqual({})
  })

  it.each([
    ['not JSON', 'hello', "This file isn't a Meridian backup."],
    ['another app', JSON.stringify({ app: 'other', version: 1, savedAt: '2026-10-04', data: {} }), "This file isn't a Meridian backup."],
    ['a newer version', JSON.stringify({ app: 'meridian', version: 2, savedAt: '2026-10-04', data: {} }), 'newer version'],
    ['a damaged date', JSON.stringify({ app: 'meridian', version: 1, savedAt: 'soon', data: {} }), 'date is damaged'],
    [
      'damaged places',
      JSON.stringify({ app: 'meridian', version: 1, savedAt: '2026-10-04', data: { 'countries-app.visited': 'Denmark' } }),
      'Part of this backup is damaged',
    ],
  ])('refuses %s, restoring nothing', (_, text, message) => {
    expect(() => readBackup(text)).toThrow(BackupError)
    expect(() => readBackup(text)).toThrow(message)
  })
})

describe('describing a backup', () => {
  it('counts what it holds, leaving out what there is none of', () => {
    fill()
    const summary = summarize(createBackup(localStorage, new Date('2026-10-04T10:00:00Z')))
    expect(summary).toMatchObject({ places: 2, states: 1, cities: 1, flights: 1, wishlist: 2, records: 2 })
    expect(describeBackup(summary)).toBe('2 places, 1 state, 1 city, 1 flight, 2 on the wishlist and 2 best scores')
    const none = { states: 0, cities: 0, flights: 0, wishlist: 0, records: 0 }
    expect(describeBackup({ ...summary, ...none })).toBe('2 places')
    expect(describeBackup({ ...summary, ...none, places: 1, cities: 3 })).toBe('1 place and 3 cities')
  })

  it('names the file by the date', () => {
    expect(backupFileName(new Date(2026, 9, 4))).toBe('meridian-backup-2026-10-04.json')
  })
})
