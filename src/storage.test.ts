import { describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { readStored, usePersistentState } from './storage'

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
