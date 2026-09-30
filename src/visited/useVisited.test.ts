import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { VISITED_STORAGE_KEY, useVisited } from './useVisited'

describe('useVisited', () => {
  it('starts empty', () => {
    const { result } = renderHook(() => useVisited())
    expect(result.current.visited.size).toBe(0)
  })

  it('adds, removes and toggles countries', () => {
    const { result } = renderHook(() => useVisited())
    act(() => result.current.add('Denmark'))
    act(() => result.current.add('Denmark'))
    act(() => result.current.add('Japan'))
    expect([...result.current.visited]).toEqual(['Denmark', 'Japan'])

    act(() => result.current.remove('Denmark'))
    expect([...result.current.visited]).toEqual(['Japan'])

    act(() => result.current.toggle('Japan'))
    act(() => result.current.toggle('Peru'))
    expect([...result.current.visited]).toEqual(['Peru'])
  })

  it('remembers visited countries across reloads', () => {
    const first = renderHook(() => useVisited())
    act(() => first.result.current.add('Denmark'))
    expect(JSON.parse(localStorage.getItem(VISITED_STORAGE_KEY)!)).toEqual(['Denmark'])
    first.unmount()

    const second = renderHook(() => useVisited())
    expect(second.result.current.visited.has('Denmark')).toBe(true)
  })

  it('ignores corrupted saved data', () => {
    localStorage.setItem(VISITED_STORAGE_KEY, '{"oops": 1}')
    const { result } = renderHook(() => useVisited())
    expect(result.current.visited.size).toBe(0)
  })
})
