import { Raycaster, Sphere, Vector2, Vector3 } from 'three'
import type { GlobeMethods } from 'react-globe.gl'
import type { LatLng } from './interaction'

const raycaster = new Raycaster()
const ndc = new Vector2()
const hit = new Vector3()
const sphere = new Sphere()

/**
 * The lat/lng under a screen position, or null when pointing at space.
 *
 * Intersects a ray with the globe's sphere mathematically instead of
 * raycasting against every country mesh, so it's cheap enough to run on
 * every pointer move.
 */
export function screenToLatLng(globe: GlobeMethods, clientX: number, clientY: number): LatLng | null {
  const rect = globe.renderer().domElement.getBoundingClientRect()
  ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1)
  raycaster.setFromCamera(ndc, globe.camera())
  sphere.radius = globe.getGlobeRadius()

  if (!raycaster.ray.intersectSphere(sphere, hit)) return null
  const { lat, lng } = globe.toGeoCoords(hit)
  return { lat, lng }
}
