import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { DEFAULT_SETTINGS, SETTINGS_KEY, useSettings } from './useSettings'

describe('useSettings', () => {
  it('shows visited countries and markers by default', () => {
    const { result } = renderHook(() => useSettings())
    expect(result.current[0]).toEqual({ showVisited: true, showMarkers: true, showRegions: true })
  })

  it('changes and remembers settings', () => {
    const first = renderHook(() => useSettings())
    act(() => first.result.current[1]({ showMarkers: false }))
    expect(first.result.current[0]).toEqual({ showVisited: true, showMarkers: false, showRegions: true })
    first.unmount()
    expect(renderHook(() => useSettings()).result.current[0].showMarkers).toBe(false)
  })

  it('fills in settings missing from what was saved', () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ showVisited: false }))
    expect(renderHook(() => useSettings()).result.current[0]).toEqual({ showVisited: false, showMarkers: true, showRegions: true })
  })

  it('ignores corrupted settings', () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ showVisited: 'no', theme: 1 }))
    expect(renderHook(() => useSettings()).result.current[0]).toEqual(DEFAULT_SETTINGS)
  })
})
