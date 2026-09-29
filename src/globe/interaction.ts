import { geoDistance } from 'd3-geo'

export type Point = { x: number; y: number }
export type LatLng = { lat: number; lng: number }

/** Pointer movement (px) above which a press counts as a drag, not a click */
export const DRAG_THRESHOLD_PX = 5

export const INITIAL_VIEW = { lat: 25, lng: 10, altitude: 1.9 }

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

/** Move `current` a fraction of the way to `target`, snapping when close. */
export function approach(current: number, target: number, factor: number) {
  const next = current + (target - current) * factor
  return Math.abs(target - next) < 0.001 ? target : next
}
