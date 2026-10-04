import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { VISIT_DATES_KEY, isVisitDates, useVisitDates } from './useVisitDates'

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

  it('checks what was saved', () => {
    expect(isVisitDates({ Denmark: ['2023-05'] })).toBe(true)
    expect(isVisitDates({ Denmark: ['last summer'] })).toBe(false)
    expect(isVisitDates(['2023'])).toBe(false)
  })
})
