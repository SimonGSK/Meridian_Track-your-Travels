import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { EventDispatcher } from 'three'
import type { GlobeMethods } from 'react-globe.gl'
import { IDLE_DELAY_MS, SPIN_SPEED, useSmoothAutoRotate } from './hooks'

type FakeControls = EventDispatcher<{ start: object; end: object }> & {
  autoRotate: boolean
  autoRotateSpeed: number
}

function setup(allowed = true) {
  const controls = Object.assign(new EventDispatcher(), {
    autoRotate: true,
    autoRotateSpeed: 2, // OrbitControls' default, should be overridden
  }) as FakeControls
  const canvas = document.createElement('canvas')
  const globe = { controls: () => controls, renderer: () => ({ domElement: canvas }) } as unknown as GlobeMethods
  const hook = renderHook(({ allowed }) => useSmoothAutoRotate(globe, allowed), { initialProps: { allowed } })
  const movePointer = () => act(() => canvas.dispatchEvent(new Event('pointermove')))
  return { controls, movePointer, ...hook }
}

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms))

describe('useSmoothAutoRotate', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame'] })
  })
  afterEach(() => vi.useRealTimers())

  it('eases the spin in from standstill when the page opens', () => {
    const { controls } = setup()
    advance(100)
    expect(controls.autoRotate).toBe(true)
    expect(controls.autoRotateSpeed).toBeGreaterThan(0)
    expect(controls.autoRotateSpeed).toBeLessThan(SPIN_SPEED)

    advance(5000)
    expect(controls.autoRotateSpeed).toBe(SPIN_SPEED)
  })

  it('eases the spin out when not allowed, e.g. while a country is selected', () => {
    const { controls, rerender } = setup()
    advance(5000)

    rerender({ allowed: false })
    advance(100)
    expect(controls.autoRotateSpeed).toBeGreaterThan(0)
    expect(controls.autoRotateSpeed).toBeLessThan(SPIN_SPEED)

    advance(5000)
    expect(controls.autoRotateSpeed).toBe(0)
    expect(controls.autoRotate).toBe(false)
  })

  it('stops when the pointer moves over the globe, and resumes 30 s after it last moved', () => {
    const { controls, movePointer } = setup()
    advance(5000)

    movePointer()
    advance(5000)
    expect(controls.autoRotateSpeed).toBe(0)

    movePointer() // still moving: the wait starts over
    advance(IDLE_DELAY_MS - 100)
    expect(controls.autoRotateSpeed).toBe(0)

    advance(100)
    advance(5000)
    expect(controls.autoRotateSpeed).toBe(SPIN_SPEED)
  })

  it('stops instantly when the globe is grabbed and resumes 30 s after letting go', () => {
    const { controls } = setup()
    advance(5000)

    act(() => controls.dispatchEvent({ type: 'start' }))
    expect(controls.autoRotate).toBe(false)
    expect(controls.autoRotateSpeed).toBe(0)

    act(() => controls.dispatchEvent({ type: 'end' }))
    advance(IDLE_DELAY_MS - 100)
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
    advance(IDLE_DELAY_MS - 100)
    act(() => controls.dispatchEvent({ type: 'start' }))
    advance(IDLE_DELAY_MS)
    expect(controls.autoRotateSpeed).toBe(0)
  })
})
