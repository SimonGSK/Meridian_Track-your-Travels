import { describe, expect, it } from 'vitest'
import { countdown, dayOf, formatDay, isDay, isToCome, monthOf, nextDay } from './plans'

const now = new Date(2026, 9, 9, 15, 30) // 9 October 2026, afternoon

describe('plans', () => {
  it('reads days', () => {
    expect(isDay('2026-11-12')).toBe(true)
    expect(['2026-11', '2026-13-01', '2026-11-32', 20261112, '12/11/2026'].map(isDay)).toEqual([false, false, false, false, false])
  })

  it('gives today here, the next day, the month, and a day to read', () => {
    expect(dayOf(now)).toBe('2026-10-09')
    expect(nextDay('2026-10-31')).toBe('2026-11-01')
    expect(nextDay('2026-12-31')).toBe('2027-01-01')
    expect(monthOf('2026-11-12')).toBe('2026-11')
    expect(formatDay('2026-11-02')).toBe('2 Nov 2026')
  })

  it('counts down to a day', () => {
    expect(countdown('2026-10-09', now)).toBe('today')
    expect(countdown('2026-10-10', now)).toBe('tomorrow')
    expect(countdown('2026-11-01', now)).toBe('in 23 days')
    expect(countdown('2026-12-08', now)).toBe('in 60 days')
    expect(countdown('2027-03-20', now)).toBe('in 5 months')
  })

  it('counts down to a month or a year', () => {
    expect(countdown('2026-11', now)).toBe('next month')
    expect(countdown('2027-02', now)).toBe('in 4 months')
    expect(countdown('2029-01', now)).toBe('in 2 years')
    expect(countdown('2027', now)).toBe('next year')
    expect(countdown('2030', now)).toBe('in 4 years')
  })

  it('tells a flight still to come: after this month, or after this year with just the year', () => {
    expect(['2026-09', '2026-10', '2026', '2025'].map((d) => isToCome(d, now))).toEqual([false, false, false, false])
    expect(['2026-11', '2027-01', '2027'].map((d) => isToCome(d, now))).toEqual([true, true, true])
  })
})
