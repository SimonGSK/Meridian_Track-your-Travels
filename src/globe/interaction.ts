import { geoCentroid, geoDistance, geoInterpolate } from 'd3-geo'

export type Point = { x: number; y: number }
export type LatLng = { lat: number; lng: number }

/** Pointer movement (px) above which a press counts as a drag, not a click */
export const DRAG_THRESHOLD_PX = 5

export const INITIAL_VIEW = { lat: 25, lng: 10, altitude: 2.2 }
/**
 * The screensaver spins around the poles, so its latitude stays put: just
 * north of the equator shows Europe and Canada, and Australia and New
 * Zealand too as they come round.
 */
export const SCREENSAVER_VIEW = { lat: 8, lng: 10, altitude: 2.2 }

/** Closest and farthest the camera flies to when selecting a country */
const MIN_FLIGHT_ALTITUDE = 0.4
const MAX_FLIGHT_ALTITUDE = 1.8

const MIN_FLIGHT_MS = 500
const MAX_FLIGHT_MS = 1600

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export function isClick(down: Point, up: Point) {
  return Math.hypot(up.x - down.x, up.y - down.y) <= DRAG_THRESHOLD_PX
}

/** Short hops are quick, flights to the other side of the world take longer. */
export function flightDuration(from: LatLng, to: LatLng) {
  const radians = geoDistance([from.lng, from.lat], [to.lng, to.lat])
  return Math.round(clamp(MIN_FLIGHT_MS + (radians / Math.PI) * MAX_FLIGHT_MS, MIN_FLIGHT_MS, MAX_FLIGHT_MS))
}

/** Keep the user's zoom level, but make sure the selected country is in view. */
export function flightAltitude(currentAltitude: number) {
  return clamp(currentAltitude, MIN_FLIGHT_ALTITUDE, MAX_FLIGHT_ALTITUDE)
}

/** An altitude that fits a country of this size (in degrees) comfortably in view. */
export function fitAltitude(extent: number) {
  return clamp(extent * 0.09, MIN_FLIGHT_ALTITUDE, MAX_FLIGHT_ALTITUDE)
}

/** A place to keep in view: a point, and how far around it the place reaches, in degrees */
export type Spot = LatLng & { radius?: number }

const DEGREES = 180 / Math.PI

/**
 * Where to look from to see places whole: the middle of them, and how wide
 * they spread, in degrees, with some room around (for fitAltitude)
 */
export function viewOf(spots: readonly Spot[]) {
  const [lng, lat] = geoCentroid({ type: 'MultiPoint', coordinates: spots.map((spot) => [spot.lng, spot.lat]) })
  // Places all around the world have no middle: look from the first, as far out as it goes
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return { lat: spots[0].lat, lng: spots[0].lng, extent: 360 }
  const spread = Math.max(
    ...spots.map((spot) => geoDistance([lng, lat], [spot.lng, spot.lat]) * DEGREES + (spot.radius ?? 0)),
  )
  return { lat, lng, extent: spread * 2 * 1.3 }
}

/** A route's ends, and its middle, where its arc rises highest */
export function spotsOfRoute({ from, to }: { from: LatLng; to: LatLng }): Spot[] {
  const [lng, lat] = geoInterpolate([from.lng, from.lat], [to.lng, to.lat])(0.5)
  return [{ lat: from.lat, lng: from.lng }, { lat, lng }, { lat: to.lat, lng: to.lng }]
}

/** Move `current` a fraction of the way to `target`, snapping when close. */
export function approach(current: number, target: number, factor: number) {
  const next = current + (target - current) * factor
  return Math.abs(target - next) < 0.001 ? target : next
}
