import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { VISITED_CITIES_KEY, useVisitedCities } from './useVisitedCities'

describe('useVisitedCities', () => {
  it('toggles cities and remembers them', () => {
    const first = renderHook(() => useVisitedCities())
    act(() => first.result.current.toggle(2618425))
    act(() => first.result.current.toggle(2624652))
    act(() => first.result.current.toggle(2618425))
    expect([...first.result.current.visitedCities]).toEqual([2624652])
    first.unmount()
    expect(JSON.parse(localStorage.getItem(VISITED_CITIES_KEY)!)).toEqual([2624652])
    expect(renderHook(() => useVisitedCities()).result.current.visitedCities.has(2624652)).toBe(true)
  })

  it('adds a city once', () => {
    const { result } = renderHook(() => useVisitedCities())
    act(() => result.current.add(2618425))
    act(() => result.current.add(2618425))
    expect([...result.current.visitedCities]).toEqual([2618425])
  })

  it('ignores corrupted data', () => {
    localStorage.setItem(VISITED_CITIES_KEY, JSON.stringify(['Paris']))
    expect(renderHook(() => useVisitedCities()).result.current.visitedCities.size).toBe(0)
  })
})
