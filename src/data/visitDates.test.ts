import { describe, expect, it } from 'vitest'
import { MONTHS, describeVisits, formatVisitDate, isPast, isVisitDate, newestFirst, partsOf, visitDate } from './visitDates'

describe('visit dates', () => {
  it('are a month of a year, or just the year', () => {
    expect(visitDate(2023, 5)).toBe('2023-05')
    expect(visitDate(2023, null)).toBe('2023')
    expect(partsOf('2023-05')).toEqual({ year: 2023, month: 5 })
    expect(partsOf('2023')).toEqual({ year: 2023, month: null })
    for (const good of ['2023', '2023-01', '1999-12']) expect(isVisitDate(good)).toBe(true)
    for (const bad of ['23', '2023-13', '2023-5', '2023-00', 'May 2023', 2023, null]) expect(isVisitDate(bad)).toBe(false)
  })

  it('read as "May 2023", or "2023"', () => {
    expect(formatVisitDate('2023-05')).toBe('May 2023')
    expect(formatVisitDate('2023-12')).toBe('Dec 2023')
    expect(formatVisitDate('2019')).toBe('2019')
    expect(MONTHS[0]).toBe('January')
    expect(MONTHS).toHaveLength(12)
  })

  it('sort newest first, a year alone after its months', () => {
    expect(['2019', '2023-05', '2023', '2023-11'].sort(newestFirst)).toEqual(['2023-11', '2023-05', '2023', '2019'])
  })

  it('are no later than this month', () => {
    const now = new Date(2026, 9, 4) // October 2026
    expect(isPast('2026-10', now)).toBe(true)
    expect(isPast('2026', now)).toBe(true)
    expect(isPast('2026-11', now)).toBe(false)
    expect(isPast('2027', now)).toBe(false)
  })

  it('describe a country\'s visits by the latest', () => {
    expect(describeVisits([])).toBeNull()
    expect(describeVisits(['2023-05'])).toBe('May 2023')
    expect(describeVisits(['2019', '2023-05', '2021'])).toBe('3 visits, last May 2023')
  })
})
