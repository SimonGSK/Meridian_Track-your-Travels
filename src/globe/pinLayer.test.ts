import { describe, expect, it } from 'vitest'
import { PerspectiveCamera, type BufferAttribute, type ShaderMaterial } from 'three'
import type { GlobeMethods } from 'react-globe.gl'
import { PIN_HIDDEN_BELOW, PIN_SIZE_PX, createPinLayer, facing, pinAt, pinPosition } from './pinLayer'
import { toUnitVector } from './sphereMesh'
import { LAND_ALTITUDE, SELECTED_ALTITUDE } from './style'

const RADIUS = 100
const SIZE = 800
const CENTER = SIZE / 2
/** Where a pin's head is drawn, above its tip */
const HEAD_ABOVE_TIP = (PIN_SIZE_PX * (32 - 14)) / 64

function fakeGlobe(): GlobeMethods {
  const camera = new PerspectiveCamera(50, 1, 0.1, 10000)
  camera.position.set(0, 0, 300) // looking straight at lat 0, lng 0
  camera.lookAt(0, 0, 0)
  camera.updateMatrixWorld()
  const canvas = { getBoundingClientRect: () => ({ left: 0, top: 0, width: SIZE, height: SIZE }) }
  return {
    renderer: () => ({ domElement: canvas }),
    camera: () => camera,
    getGlobeRadius: () => RADIUS,
  } as unknown as GlobeMethods
}

describe('pinPosition', () => {
  it('puts pins on the land, or on the raised selected country', () => {
    expect(pinPosition({ lat: 0, lng: 0 }, RADIUS).length()).toBeGreaterThan(RADIUS * (1 + LAND_ALTITUDE))
    expect(pinPosition({ lat: 0, lng: 0 }, RADIUS).length()).toBeLessThan(RADIUS * (1 + SELECTED_ALTITUDE))
    expect(pinPosition({ lat: 0, lng: 0, raised: true }, RADIUS).length()).toBeGreaterThan(
      RADIUS * (1 + SELECTED_ALTITUDE),
    )
  })

  it('points the same way as the place', () => {
    const [x, y, z] = toUnitVector([12.57, 55.68])
    const position = pinPosition({ lat: 55.68, lng: 12.57 }, RADIUS).normalize()
    expect(position.x).toBeCloseTo(x)
    expect(position.y).toBeCloseTo(y)
    expect(position.z).toBeCloseTo(z)
  })
})

describe('pinAt', () => {
  const front = { name: 'front', lat: 0, lng: 0 } // right in the middle of the screen

  it("finds the pin whose head is pointed at, leaving what's beside its tip free", () => {
    expect(pinAt(fakeGlobe(), [front], { x: CENTER, y: CENTER - HEAD_ABOVE_TIP })).toBe(front)
    expect(pinAt(fakeGlobe(), [front], { x: CENTER + 4, y: CENTER - HEAD_ABOVE_TIP - 4 })).toBe(front)
    // Beside the tip: Vatican City, next to Rome's pin
    expect(pinAt(fakeGlobe(), [front], { x: CENTER + 5, y: CENTER })).toBeNull()
    expect(pinAt(fakeGlobe(), [front], { x: CENTER - 5, y: CENTER - 1 })).toBeNull()
  })

  it('finds nothing beside or below a pin', () => {
    expect(pinAt(fakeGlobe(), [front], { x: CENTER + 20, y: CENTER - HEAD_ABOVE_TIP })).toBeNull()
    expect(pinAt(fakeGlobe(), [front], { x: CENTER, y: CENTER + 15 })).toBeNull()
  })

  it('ignores pins on the far side of the globe', () => {
    const behind = { name: 'behind', lat: 0, lng: 180 } // right behind the front one on screen
    expect(pinAt(fakeGlobe(), [behind], { x: CENTER, y: CENTER - HEAD_ABOVE_TIP })).toBeNull()
  })

  it('ignores pins near the edge of the globe, where they fade out, but not further in', () => {
    const globe = fakeGlobe()
    const camera = globe.camera() as PerspectiveCamera
    const headOf = (pin: { lat: number; lng: number }) => {
      const { x, y } = pinPosition(pin, RADIUS).project(camera)
      return { x: ((x + 1) / 2) * SIZE, y: ((1 - y) / 2) * SIZE - HEAD_ABOVE_TIP }
    }
    const nearEdge = { lat: 0, lng: 60 } // in view, but close to the edge
    expect(facing(pinPosition(nearEdge, RADIUS), camera.position)).toBeLessThan(PIN_HIDDEN_BELOW)
    expect(pinAt(globe, [nearEdge], headOf(nearEdge))).toBeNull()

    const further = { lat: 0, lng: 30 }
    expect(pinAt(globe, [further], headOf(further))).toBe(further)
  })

  it('picks the pin whose head is closest', () => {
    const north = { name: 'north', lat: 1, lng: 0 } // about 7 pixels higher
    expect(pinAt(fakeGlobe(), [front, north], { x: CENTER, y: CENTER - HEAD_ABOVE_TIP - 5 })?.name).toBe('north')
    expect(pinAt(fakeGlobe(), [north, front], { x: CENTER, y: CENTER - 2 })?.name).toBe('front')
  })
})

describe('createPinLayer', () => {
  it('places a point per pin, drawn over everything', () => {
    const layer = createPinLayer(RADIUS)
    const pin = { lat: 0, lng: 0 }
    layer.show([pin, { lat: 10, lng: 20, raised: true }])
    const positions = layer.object.geometry.getAttribute('position') as BufferAttribute
    expect(positions.count).toBe(2)
    expect(positions.getZ(0)).toBeCloseTo(pinPosition(pin, RADIUS).z)
    expect((layer.object.material as ShaderMaterial).depthTest).toBe(false)

    layer.show([])
    expect(layer.object.geometry.getAttribute('position').count).toBe(0)
    layer.dispose()
  })
})
