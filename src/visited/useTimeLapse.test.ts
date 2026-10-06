import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { LAPSE_STEP_MS, useTimeLapse } from './useTimeLapse'

describe('useTimeLapse', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())
  const wait = (steps = 1) => act(() => vi.advanceTimersByTime(LAPSE_STEP_MS * steps))

  it('plays through the steps, one at a time, and stops on the last', () => {
    const { result } = renderHook(() => useTimeLapse(3))
    expect(result.current.lapse).toBeNull()
    act(() => result.current.play())
    expect(result.current.lapse).toEqual({ step: 0, playing: true })
    wait()
    expect(result.current.lapse).toEqual({ step: 1, playing: true })
    wait()
    expect(result.current.lapse).toEqual({ step: 2, playing: false })
    wait(3)
    expect(result.current.lapse).toEqual({ step: 2, playing: false })
  })

  it('pauses, plays on from there, and starts over once at the end', () => {
    const { result } = renderHook(() => useTimeLapse(3))
    act(() => result.current.play())
    wait()
    act(() => result.current.pause())
    wait(2)
    expect(result.current.lapse).toEqual({ step: 1, playing: false })
    act(() => result.current.play())
    expect(result.current.lapse).toEqual({ step: 1, playing: true })
    wait()
    act(() => result.current.play()) // at the end: from the start again
    expect(result.current.lapse).toEqual({ step: 0, playing: true })
  })

  it('stops showing when stopped, or when its steps are gone', () => {
    const { result, rerender } = renderHook(({ count }) => useTimeLapse(count), { initialProps: { count: 3 } })
    act(() => result.current.play())
    wait(2)
    rerender({ count: 1 })
    expect(result.current.lapse).toBeNull()
    act(() => result.current.play())
    expect(result.current.lapse).toEqual({ step: 0, playing: false }) // one year: nothing to play through
    act(() => result.current.stop())
    expect(result.current.lapse).toBeNull()
  })
})
