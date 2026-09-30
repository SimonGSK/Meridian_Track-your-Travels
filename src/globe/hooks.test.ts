import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { BufferGeometry, EventDispatcher, Mesh, MeshLambertMaterial, PerspectiveCamera, Scene } from 'three'
import type { GlobeMethods } from 'react-globe.gl'
import { countries, type CountryFeature } from '../countries'
import { IDLE_DELAY_MS, SPIN_SPEED, useDepthPrecision, useSelectedCountry, useSmoothAutoRotate } from './hooks'
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
