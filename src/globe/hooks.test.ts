import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { EventDispatcher } from 'three'
import type { GlobeMethods } from 'react-globe.gl'
import { RESUME_DELAY_MS, SPIN_SPEED, useSmoothAutoRotate } from './hooks'

type FakeControls = EventDispatcher<{ start: object; end: object }> & {
  autoRotate: boolean
  autoRotateSpeed: number
}

function setup(active = true) {
  const controls = Object.assign(new EventDispatcher(), {
    autoRotate: true,
    autoRotateSpeed: 2, // OrbitControls' default, should be overridden
  }) as FakeControls
  const globe = { controls: () => controls } as unknown as GlobeMethods
  const hook = renderHook(({ active }) => useSmoothAutoRotate(globe, active), { initialProps: { active } })
  return { controls, ...hook }
}

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms))

describe('useSmoothAutoRotate', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame'] })
  })
  afterEach(() => vi.useRealTimers())

  it('eases the spin in from standstill', () => {
    const { controls } = setup()
    advance(100)
    expect(controls.autoRotate).toBe(true)
    expect(controls.autoRotateSpeed).toBeGreaterThan(0)
    expect(controls.autoRotateSpeed).toBeLessThan(SPIN_SPEED)

    advance(5000)
    expect(controls.autoRotateSpeed).toBe(SPIN_SPEED)
  })

  it('eases the spin out when no longer active, e.g. while hovering', () => {
    const { controls, rerender } = setup()
    advance(5000)

    rerender({ active: false })
    advance(100)
    expect(controls.autoRotateSpeed).toBeGreaterThan(0)
    expect(controls.autoRotateSpeed).toBeLessThan(SPIN_SPEED)

    advance(5000)
    expect(controls.autoRotateSpeed).toBe(0)
    expect(controls.autoRotate).toBe(false)
  })

  it('stops instantly when the globe is grabbed and resumes after letting go', () => {
    const { controls } = setup()
    advance(5000)

    act(() => controls.dispatchEvent({ type: 'start' }))
    expect(controls.autoRotate).toBe(false)
    expect(controls.autoRotateSpeed).toBe(0)

    act(() => controls.dispatchEvent({ type: 'end' }))
    advance(RESUME_DELAY_MS - 100)
    expect(controls.autoRotateSpeed).toBe(0)

    advance(100)
    advance(5000)
    expect(controls.autoRotateSpeed).toBe(SPIN_SPEED)
  })

  it('keeps waiting if the globe is grabbed again before resuming', () => {
    const { controls } = setup()
    advance(5000)

    act(() => controls.dispatchEvent({ type: 'start' }))
    act(() => controls.dispatchEvent({ type: 'end' }))
    advance(RESUME_DELAY_MS - 100)
    act(() => controls.dispatchEvent({ type: 'start' }))
    advance(RESUME_DELAY_MS)
    expect(controls.autoRotateSpeed).toBe(0)
  })
})
