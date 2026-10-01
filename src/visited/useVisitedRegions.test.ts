import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { VISITED_REGIONS_KEY, useVisitedRegions } from './useVisitedRegions'

describe('useVisitedRegions', () => {
  it('toggles regions and remembers them', () => {
    const first = renderHook(() => useVisitedRegions())
    act(() => first.result.current.toggle('US-CA'))
    act(() => first.result.current.toggle('US-TX'))
    act(() => first.result.current.toggle('US-CA'))
    expect([...first.result.current.visitedRegions]).toEqual(['US-TX'])
    first.unmount()
    expect(JSON.parse(localStorage.getItem(VISITED_REGIONS_KEY)!)).toEqual(['US-TX'])
    expect(renderHook(() => useVisitedRegions()).result.current.visitedRegions.has('US-TX')).toBe(true)
  })

  it('adds a region once', () => {
    const { result } = renderHook(() => useVisitedRegions())
    act(() => result.current.add('US-NY'))
    act(() => result.current.add('US-NY'))
    expect([...result.current.visitedRegions]).toEqual(['US-NY'])
  })
})
