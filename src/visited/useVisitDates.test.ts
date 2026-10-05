import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { VISIT_DATES_KEY, VISIT_NOTES_KEY, isVisitDates, isVisitNotes, useVisitDates } from './useVisitDates'

describe('useVisitDates', () => {
  it('adds visits, newest first, once each, and remembers them', () => {
    const first = renderHook(() => useVisitDates())
    act(() => first.result.current.addVisit('Denmark', '2019'))
    act(() => first.result.current.addVisit('Denmark', '2023-05'))
    act(() => first.result.current.addVisit('Denmark', '2019'))
    expect(first.result.current.datesOf('Denmark')).toEqual(['2023-05', '2019'])
    expect(first.result.current.datesOf('Japan')).toEqual([])
    first.unmount()
    expect(renderHook(() => useVisitDates()).result.current.datesOf('Denmark')).toEqual(['2023-05', '2019'])
  })

  it('removes a visit, and forgets a country without any', () => {
    const { result } = renderHook(() => useVisitDates())
    act(() => result.current.addVisit('Peru', '2018-03'))
    act(() => result.current.addVisit('Peru', '2024'))
    act(() => result.current.removeVisit('Peru', '2018-03'))
    expect(result.current.datesOf('Peru')).toEqual(['2024'])
    act(() => result.current.removeVisit('Peru', '2024'))
    expect(JSON.parse(localStorage.getItem(VISIT_DATES_KEY)!)).toEqual({})
  })

  it('keeps a note on a visit, and forgets it when emptied', () => {
    const first = renderHook(() => useVisitDates())
    act(() => first.result.current.addVisit('Japan', '2023-05'))
    act(() => first.result.current.setNote('Japan', '2023-05', 'Honeymoon'))
    expect(first.result.current.noteOf('Japan', '2023-05')).toBe('Honeymoon')
    expect(first.result.current.noteOf('Japan', '2019')).toBeUndefined()
    first.unmount()

    const second = renderHook(() => useVisitDates())
    expect(second.result.current.noteOf('Japan', '2023-05')).toBe('Honeymoon')
    act(() => second.result.current.setNote('Japan', '2023-05', '  '))
    expect(second.result.current.noteOf('Japan', '2023-05')).toBeUndefined()
    expect(JSON.parse(localStorage.getItem(VISIT_NOTES_KEY)!)).toEqual({})
  })

  it('cuts a note at 200 characters', () => {
    const { result } = renderHook(() => useVisitDates())
    act(() => result.current.setNote('Japan', '2023', 'x'.repeat(250)))
    expect(result.current.noteOf('Japan', '2023')).toHaveLength(200)
  })

  it("removes a visit's note with the visit, and leaves the others", () => {
    const { result } = renderHook(() => useVisitDates())
    act(() => result.current.addVisit('Peru', '2018-03'))
    act(() => result.current.addVisit('Peru', '2024'))
    act(() => result.current.setNote('Peru', '2018-03', 'Machu Picchu'))
    act(() => result.current.setNote('Peru', '2024', 'Lima'))
    act(() => result.current.removeVisit('Peru', '2018-03'))
    expect(result.current.noteOf('Peru', '2018-03')).toBeUndefined()
    expect(result.current.noteOf('Peru', '2024')).toBe('Lima')
  })

  it('checks the notes that were saved', () => {
    expect(isVisitNotes({ Japan: { '2023-05': 'Honeymoon' } })).toBe(true)
    expect(isVisitNotes({ Japan: { 'last summer': 'Honeymoon' } })).toBe(false)
    expect(isVisitNotes({ Japan: { '2023': 5 } })).toBe(false)
    expect(isVisitNotes({ Japan: ['Honeymoon'] })).toBe(false)
    expect(isVisitNotes(null)).toBe(false)
  })

  it('checks what was saved', () => {
    expect(isVisitDates({ Denmark: ['2023-05'] })).toBe(true)
    expect(isVisitDates({ Denmark: ['last summer'] })).toBe(false)
    expect(isVisitDates(['2023'])).toBe(false)
  })
})
