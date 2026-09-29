import { describe, expect, it } from 'vitest'
import { PerspectiveCamera, type Vector3 } from 'three'
import type { GlobeMethods } from 'react-globe.gl'
import { screenToLatLng } from './picking'

const RADIUS = 100
const SIZE = 800

/** Same convention as three-globe: lng 0 faces +z, north is +y. */
function toGeoCoords({ x, y, z }: Vector3) {
  const r = Math.hypot(x, y, z)
  return {
    lat: 90 - (Math.acos(y / r) * 180) / Math.PI,
    lng: 90 - (Math.atan2(z, x) * 180) / Math.PI,
    altitude: r / RADIUS - 1,
  }
}

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
    toGeoCoords,
  } as unknown as GlobeMethods
}

describe('screenToLatLng', () => {
  it('maps the center of the screen to the point facing the camera', () => {
    const pos = screenToLatLng(fakeGlobe(), SIZE / 2, SIZE / 2)!
    expect(pos.lat).toBeCloseTo(0)
    expect(pos.lng).toBeCloseTo(0)
  })

  it('maps up and right to north and east', () => {
    const pos = screenToLatLng(fakeGlobe(), SIZE / 2 + 100, SIZE / 2 - 100)!
    expect(pos.lat).toBeGreaterThan(5)
    expect(pos.lng).toBeGreaterThan(5)
  })

  it('returns null when pointing past the globe into space', () => {
    expect(screenToLatLng(fakeGlobe(), 5, 5)).toBeNull()
  })
})
