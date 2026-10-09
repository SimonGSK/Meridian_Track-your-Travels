import {
  CanvasTexture,
  CatmullRomCurve3,
  NearestFilter,
  RepeatWrapping,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  Sprite,
  SpriteMaterial,
  TubeGeometry,
  Vector3,
  type ColorRepresentation,
  type PerspectiveCamera,
  type Texture,
} from 'three'
import { geoDistance, geoInterpolate } from 'd3-geo'
import { toUnitVector } from './sphereMesh'
import { LAND_ALTITUDE } from './style'

type LatLng = { lat: number; lng: number }

/**
 * A route to draw: from where to where, whether it's the one picked, whether
 * it was flown back too, and whether it's still to come (dashed, no plane yet)
 */
export type FlightLine = {
  key: string
  from: LatLng
  to: LatLng
  highlighted?: boolean
  bothWays?: boolean
  upcoming?: boolean
}

/** Routes leave from just above the land, so their ends aren't hidden in it */
export const FLIGHT_BASE = LAND_ALTITUDE * 1.5
/** How high a route rises at its middle, as a share of the globe radius, per radian flown */
const RISE = 0.15
/** Points along each route */
const SAMPLES = 64
/** Width of a route's line, in globe units (the globe's radius is 100) */
const LINE_RADIUS = 0.22
const HIGHLIGHT_RADIUS = 0.38
const LINE_OPACITY = 0.5
/** On-screen size of the planes, in pixels */
export const PLANE_SIZE_PX = 18
/** Dashes along a flight still to come, per radian */
const DASHES_PER_RADIAN = 24

/**
 * A plane takes its time, more for long flights, then sets off again: Copenhagen to Bangkok about 28 seconds,
 * slow enough that many flights drift calmly rather than bustle
 */
export const flightSeconds = (radians: number) => 12 + radians * 12

/** Points along the great circle from `from` to `to`, rising in an arc that's higher for longer flights */
export function flightPath(from: LatLng, to: LatLng, globeRadius: number, samples = SAMPLES) {
  const ends: [[number, number], [number, number]] = [
    [from.lng, from.lat],
    [to.lng, to.lat],
  ]
  const interpolate = geoInterpolate(...ends)
  const peak = geoDistance(...ends) * RISE
  return Array.from({ length: samples + 1 }, (_, i) => {
    const t = i / samples
    const altitude = FLIGHT_BASE + peak * Math.sin(Math.PI * t)
    return new Vector3(...toUnitVector(interpolate(t))).multiplyScalar(globeRadius * (1 + altitude))
  })
}

/** Where along its path a plane is, `t` from 0 to 1 */
export function pointAlong(path: readonly Vector3[], t: number, into = new Vector3()) {
  const position = Math.min(Math.max(t, 0), 1) * (path.length - 1)
  const i = Math.min(Math.floor(position), path.length - 2)
  return into.copy(path[i]).lerp(path[i + 1], position - i)
}

/** A plane on a route flown both ways flies back on every other trip */
type Plane = { sprite: Sprite; path: Vector3[]; seconds: number; offset: number; bothWays: boolean }

export type FlightLayer = {
  object: Group
  show(lines: readonly FlightLine[]): void
  setColors(line: ColorRepresentation, highlight: ColorRepresentation): void
  /** Moves the planes to where they are at `seconds`, facing their way on screen */
  tick(seconds: number, camera: PerspectiveCamera, width: number, height: number): void
  dispose(): void
}

/** The same small offset for a route every time, so its plane doesn't jump when the list changes */
const offsetOf = (key: string) => [...key].reduce((sum, ch) => (sum * 31 + ch.charCodeAt(0)) % 997, 7) / 997

/**
 * Flights as thin arcs above the globe, each with a little plane flying
 * along it from where the flight left, and back again on the next trip if
 * it was flown both ways. The planes keep their size on screen and turn to
 * face the way they're flying. Flights still to come are dashed, with no
 * plane yet.
 */
export function createFlightLayer(globeRadius: number): FlightLayer {
  const object = new Group()
  object.name = 'flights'
  const texture = planeTexture()
  const dashes = dashTexture()
  const colors = { line: new Color('#ffffff'), highlight: new Color('#ffffff') }
  let lines: { mesh: Mesh<TubeGeometry, MeshBasicMaterial>; highlighted: boolean }[] = []
  let planes: (Plane & { highlighted: boolean })[] = []

  const clear = () => {
    for (const { mesh } of lines) {
      mesh.geometry.dispose()
      // Its own copy of the dashes, repeated to its length
      if (mesh.material.alphaMap !== null) mesh.material.alphaMap.dispose()
      mesh.material.dispose()
    }
    for (const { sprite } of planes) sprite.material.dispose()
    object.clear()
    lines = []
    planes = []
  }

  const paint = () => {
    for (const { mesh, highlighted } of lines) mesh.material.color.copy(highlighted ? colors.highlight : colors.line)
    for (const { sprite, highlighted } of planes) sprite.material.color.copy(highlighted ? colors.highlight : colors.line)
  }

  const here = new Vector3()
  const ahead = new Vector3()

  return {
    object,
    show(routes) {
      clear()
      for (const route of routes) {
        const highlighted = !!route.highlighted
        const path = flightPath(route.from, route.to, globeRadius)
        const tube = new TubeGeometry(new CatmullRomCurve3(path), SAMPLES, highlighted ? HIGHLIGHT_RADIUS : LINE_RADIUS, 5)
        const radians = geoDistance([route.from.lng, route.from.lat], [route.to.lng, route.to.lat])
        const mesh = new Mesh(
          tube,
          new MeshBasicMaterial({
            transparent: true,
            opacity: highlighted ? 0.95 : LINE_OPACITY,
            depthWrite: false,
            alphaMap: route.upcoming ? dashesFor(dashes, radians) : null,
          }),
        )
        object.add(mesh)
        lines.push({ mesh, highlighted })
        if (route.upcoming) continue
        const sprite = new Sprite(new SpriteMaterial({ map: texture, sizeAttenuation: false, transparent: true, alphaTest: 0.5 }))
        sprite.renderOrder = 2
        const seconds = flightSeconds(radians)
        object.add(sprite)
        planes.push({ sprite, path, seconds, offset: offsetOf(route.key) * seconds, highlighted, bothWays: !!route.bothWays })
      }
      paint()
    },
    setColors(line, highlight) {
      colors.line.set(line)
      colors.highlight.set(highlight)
      paint()
    },
    tick(seconds, camera, width, height) {
      // Sprites that don't scale with distance are sized by the camera's projection
      const scale = PLANE_SIZE_PX / ((camera.projectionMatrix.elements[5] * height) / 2)
      for (const plane of planes) {
        const trips = (seconds + plane.offset) / plane.seconds
        const back = plane.bothWays && Math.floor(trips) % 2 === 1
        const t = back ? 1 - (trips % 1) : trips % 1
        pointAlong(plane.path, t, here)
        plane.sprite.position.copy(here)
        plane.sprite.scale.setScalar(scale)
        // Face the way it's going, as it looks on screen
        pointAlong(plane.path, back ? t - 0.01 : t + 0.01, ahead)
        const start = here.clone().project(camera)
        const end = ahead.project(camera)
        const dx = (end.x - start.x) * width
        const dy = (end.y - start.y) * height
        if (dx || dy) plane.sprite.material.rotation = Math.atan2(dy, dx) - Math.PI / 2
      }
    },
    dispose() {
      clear()
      texture.dispose()
      dashes.dispose()
    },
  }
}

/** A dash and a gap, to repeat along a route still to come: only the dash shows */
function dashTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 2
  canvas.height = 1
  const context = canvas.getContext('2d')
  if (context) {
    context.fillStyle = '#fff'
    context.fillRect(0, 0, 1, 1)
    context.fillStyle = '#000'
    context.fillRect(1, 0, 1, 1)
  }
  const texture = new CanvasTexture(canvas)
  texture.magFilter = NearestFilter
  texture.minFilter = NearestFilter
  return texture
}

/** The dashes repeated along a route this long, around a tube's length (its texture's u) */
function dashesFor(dashes: Texture, radians: number) {
  const texture = dashes.clone()
  texture.wrapS = RepeatWrapping
  texture.repeat.set(Math.max(4, Math.round(radians * DASHES_PER_RADIAN)), 1)
  texture.needsUpdate = true
  return texture
}

/** A white plane seen from above, nose up, with a dark edge; tinted by each sprite's color */
function planeTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 64
  const context = canvas.getContext('2d')
  if (context) {
    context.beginPath()
    context.moveTo(32, 3)
    context.quadraticCurveTo(36, 6, 36, 14)
    context.lineTo(36, 24)
    context.lineTo(61, 38)
    context.lineTo(61, 44)
    context.lineTo(36, 37)
    context.lineTo(36, 50)
    context.lineTo(45, 57)
    context.lineTo(45, 61)
    context.lineTo(32, 57)
    context.lineTo(19, 61)
    context.lineTo(19, 57)
    context.lineTo(28, 50)
    context.lineTo(28, 37)
    context.lineTo(3, 44)
    context.lineTo(3, 38)
    context.lineTo(28, 24)
    context.lineTo(28, 14)
    context.quadraticCurveTo(28, 6, 32, 3)
    context.closePath()
    context.fillStyle = '#fff'
    context.fill()
    context.lineWidth = 2.5
    context.strokeStyle = 'rgba(0, 0, 0, 0.7)'
    context.stroke()
  }
  return new CanvasTexture(canvas)
}
