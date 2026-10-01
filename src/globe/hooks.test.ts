import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { BufferGeometry, EventDispatcher, Mesh, MeshLambertMaterial, PerspectiveCamera, Scene, Spherical } from 'three'
import type { GlobeMethods } from 'react-globe.gl'
import { countries, type CountryFeature } from '../countries'
import {
  IDLE_DELAY_MS,
  SPIN_SPEED,
  TINY_REACH_KM,
  hitDistances,
  stopGlide,
  useDepthPrecision,
  useSelectedCountry,
  useSmoothAutoRotate,
} from './hooks'
import { SELECTED_ALTITUDE } from './style'

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

  it('stops at once when not allowed, so a flight to a selected country lands on it', () => {
    const { controls, rerender } = setup()
    advance(5000)

    rerender({ allowed: false })
    expect(controls.autoRotateSpeed).toBe(0)
    expect(controls.autoRotate).toBe(false)
    advance(5000)
    expect(controls.autoRotateSpeed).toBe(0)

    // And eases back in when allowed again
    rerender({ allowed: true })
    advance(100)
    expect(controls.autoRotateSpeed).toBeGreaterThan(0)
    expect(controls.autoRotateSpeed).toBeLessThan(SPIN_SPEED)
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

describe('useSelectedCountry', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] })
  })
  afterEach(() => vi.useRealTimers())

  function setup() {
    const scene = new Scene()
    const globe = { scene: () => scene, getGlobeRadius: () => 100 } as unknown as GlobeMethods
    const denmark = countries.find((c) => c.properties.name === 'Denmark')!
    const france = countries.find((c) => c.properties.name === 'France')!
    const hook = renderHook(({ selected, color }) => useSelectedCountry(globe, selected, color), {
      initialProps: { selected: denmark as CountryFeature | null, color: '#ff0000' },
    })
    const raised = () => scene.children.filter((c) => c.name === 'selected-country')
    return { scene, raised, denmark, france, ...hook }
  }

  it('raises the selected country, rising from the surface into place', () => {
    const { raised } = setup()
    expect(raised()).toHaveLength(1)
    const start = raised()[0].scale.x
    expect(start).toBeLessThan(1)
    advance(1000)
    expect(raised()[0].scale.x).toBe(1)
  })

  it('colors it', () => {
    const { raised, rerender, denmark } = setup()
    const cap = raised()[0].children[0] as Mesh<BufferGeometry, MeshLambertMaterial>
    expect(cap.material.color.getHexString()).toBe('ff0000')
    rerender({ selected: denmark, color: '#00ff00' })
    expect(cap.material.color.getHexString()).toBe('00ff00')
  })

  it('swaps it for another country, and removes it when deselected', () => {
    const { raised, rerender, france } = setup()
    const first = raised()[0]
    rerender({ selected: france, color: '#ff0000' })
    expect(raised()).toHaveLength(1)
    expect(raised()[0]).not.toBe(first)
    rerender({ selected: null, color: '#ff0000' })
    expect(raised()).toHaveLength(0)
  })
})

describe('useDepthPrecision', () => {
  function setup(distance: number) {
    const camera = new PerspectiveCamera(50, 1, 0.05, 50_000)
    camera.position.set(0, 0, distance)
    const controls = Object.assign(new EventDispatcher<{ change: object }>(), { minDistance: 0 })
    const globe = { camera: () => camera, controls: () => controls, getGlobeRadius: () => 100 } as unknown as GlobeMethods
    renderHook(() => useDepthPrecision(globe))
    return { camera, controls }
  }

  it('moves the near plane out with the camera', () => {
    const { camera, controls } = setup(300)
    expect(camera.near).toBe(100) // half the distance to the surface
    camera.position.set(0, 0, 1100)
    act(() => controls.dispatchEvent({ type: 'change' }))
    expect(camera.near).toBe(500)
  })

  it('keeps the near plane close when zoomed right in', () => {
    const { camera } = setup(100.1)
    expect(camera.near).toBe(0.1)
  })

  it('stops the camera zooming into the raised countries', () => {
    const { controls } = setup(300)
    expect(controls.minDistance).toBeGreaterThan(100 * (1 + SELECTED_ALTITUDE))
  })
})

describe('hitDistances', () => {
  it('reaches at least a few km around tiny places when zoomed in', () => {
    const closeUp = 0.1 / 6371 // a pixel is 100 m
    expect(hitDistances(closeUp, true).markerRadius * 6371).toBeCloseTo(TINY_REACH_KM)
    expect(hitDistances(closeUp, false).markerRadius * 6371).toBeCloseTo(TINY_REACH_KM)
    expect(hitDistances(closeUp, false).tolerance * 6371).toBeLessThan(1) // coasts don't reach further
  })

  it('keeps tiny places clickable when their rings are hidden, in a smaller circle', () => {
    const shown = hitDistances(0.001, true)
    const hidden = hitDistances(0.001, false)
    expect(hidden.markerRadius).toBeGreaterThan(0)
    expect(hidden.markerRadius).toBeLessThan(shown.markerRadius)
    expect(hidden.tolerance).toBe(shown.tolerance)
  })
})

describe('stopGlide', () => {
  it("clears the turn the camera controls still have left", () => {
    const glide = new Spherical(0, 0.01, 0.02)
    stopGlide({ controls: () => ({ _sphericalDelta: glide }) } as unknown as GlobeMethods)
    expect([glide.radius, glide.phi, glide.theta]).toEqual([0, 0, 0])
  })

  it('does nothing if the controls keep it elsewhere', () => {
    expect(() => stopGlide({ controls: () => ({}) } as unknown as GlobeMethods)).not.toThrow()
  })
})
