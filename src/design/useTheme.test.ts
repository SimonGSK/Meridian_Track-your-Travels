import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { DEFAULT_THEME } from '../globe/themes'
import { THEME_STORAGE_KEY, useTheme } from './useTheme'

describe('useTheme', () => {
  it('starts with the default design', () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current[0]).toBe(DEFAULT_THEME)
  })

  it('switches and remembers the design', () => {
    const first = renderHook(() => useTheme())
    act(() => first.result.current[1]('vintage'))
    expect(first.result.current[0].name).toBe('Vintage')
    first.unmount()

    const second = renderHook(() => useTheme())
    expect(second.result.current[0].name).toBe('Vintage')
  })

  it('ignores an unknown saved design', () => {
    localStorage.setItem(THEME_STORAGE_KEY, '"disco"')
    const { result } = renderHook(() => useTheme())
    expect(result.current[0]).toBe(DEFAULT_THEME)
  })
})
