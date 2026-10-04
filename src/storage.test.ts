import { describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { readStored, unreadableKey, usePersistentState } from './storage'

const isNumber = (v: unknown): v is number => typeof v === 'number'

describe('readStored', () => {
  it('returns the saved value', () => {
    localStorage.setItem('k', '42')
    expect(readStored('k', 0, isNumber)).toBe(42)
  })

  it('falls back when nothing is saved', () => {
    expect(readStored('k', 7, isNumber)).toBe(7)
  })

  it('falls back on malformed or unexpected data', () => {
    localStorage.setItem('k', '{not json')
    expect(readStored('k', 7, isNumber)).toBe(7)
    localStorage.setItem('k', '"a string"')
    expect(readStored('k', 7, isNumber)).toBe(7)
  })

  it('falls back when storage is unavailable', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(readStored('k', 7, isNumber)).toBe(7)
    spy.mockRestore()
  })
})

describe('usePersistentState', () => {
  it('saves changes and restores them on the next mount', () => {
    const first = renderHook(() => usePersistentState('k', 0, isNumber))
    act(() => first.result.current[1](5))
    first.unmount()

    const second = renderHook(() => usePersistentState('k', 0, isNumber))
    expect(second.result.current[0]).toBe(5)
  })

  it('writes nothing just by loading', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    localStorage.setItem('k', '4')
    setItem.mockClear()
    renderHook(() => usePersistentState('k', 0, isNumber))
    renderHook(() => usePersistentState('other', 0, isNumber))
    expect(setItem).not.toHaveBeenCalled()
    expect(localStorage.getItem('other')).toBeNull()
    setItem.mockRestore()
  })

  it('leaves data it cannot read alone until something changes', () => {
    localStorage.setItem('k', '{"from": "a newer version"}')
    const { result, unmount } = renderHook(() => usePersistentState('k', 0, isNumber))
    expect(result.current[0]).toBe(0)
    unmount()
    expect(localStorage.getItem('k')).toBe('{"from": "a newer version"}')
  })

  it('keeps data it could not read aside when a change replaces it', () => {
    localStorage.setItem('k', '{not json')
    const { result } = renderHook(() => usePersistentState('k', 0, isNumber))
    act(() => result.current[1](2))
    expect(localStorage.getItem('k')).toBe('2')
    expect(localStorage.getItem(unreadableKey('k'))).toBe('{not json')
    // An older copy set aside isn't replaced
    act(() => result.current[1](3))
    expect(localStorage.getItem(unreadableKey('k'))).toBe('{not json')
  })

  it('saves a change back to the value it started with', () => {
    localStorage.setItem('k', '1')
    const { result } = renderHook(() => usePersistentState('k', 0, isNumber))
    act(() => result.current[1](2))
    act(() => result.current[1](1))
    expect(localStorage.getItem('k')).toBe('1')
    expect(localStorage.getItem(unreadableKey('k'))).toBeNull() // nothing was unreadable
  })

  it('keeps working when saving fails', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full')
    })
    const { result } = renderHook(() => usePersistentState('k', 0, isNumber))
    act(() => result.current[1](3))
    expect(result.current[0]).toBe(3)
    spy.mockRestore()
  })
})
