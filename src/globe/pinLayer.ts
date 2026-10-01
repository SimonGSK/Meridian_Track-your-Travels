import {
  BufferGeometry,
  CanvasTexture,
  Color,
  Float32BufferAttribute,
  Points,
  ShaderMaterial,
  Vector3,
  type ColorRepresentation,
  type PerspectiveCamera,
} from 'three'
import type { GlobeMethods } from 'react-globe.gl'
import type { Point } from './interaction'
import { toUnitVector } from './sphereMesh'
import { LAND_ALTITUDE, SELECTED_ALTITUDE } from './style'

/** A pin stuck in the globe. `raised` pins stand on the raised, selected country. */
export type Pin = { lat: number; lng: number; raised?: boolean }

/** On-screen size of a pin's square, in pixels. The pin fills its upper half, with its tip in the middle. */
export const PIN_SIZE_PX = 40

// The pin's shape, in the texture's 64 × 64 pixels
const TEXTURE_PX = 64
const TIP_Y = 32
const HEAD_Y = 14
const HEAD_RADIUS = 11
const SCALE = PIN_SIZE_PX / TEXTURE_PX
/** How far a pointer may be off a pin's head and still point at it, in pixels */
const HIT_SLOP_PX = 3

export type PinLayer = {
  object: Points
  show(pins: readonly Pin[]): void
  setColor(color: ColorRepresentation): void
  /** Where pins fade out near the edge of the globe */
  setFade(fade: PinFade): void
  dispose(): void
}

/** Pins at their place on the globe, lifted with the land (and the selected country). */
export function pinPosition({ lat, lng, raised }: Pin, globeRadius: number) {
  const radius = globeRadius * (1 + (raised ? SELECTED_ALTITUDE : LAND_ALTITUDE) * 1.1)
  return new Vector3(...toUnitVector([lng, lat])).multiplyScalar(radius)
}

/**
 * How squarely a pin faces the camera: 1 in the middle of the globe, 0 at
 * its edge. Pins near the edge would stick out past it, and be hard to tell
 * from what's beside them, so they fade out between these two, and are gone
 * beyond.
 */
export const PIN_HIDDEN_BELOW = 0.3
export const PIN_SOLID_ABOVE = 0.55

export type PinFade = { hiddenBelow: number; solidAbove: number }
export const PIN_FADE: PinFade = { hiddenBelow: PIN_HIDDEN_BELOW, solidAbove: PIN_SOLID_ABOVE }
/** Nothing points at a screensaver, so its pins stay until close to the edge, showing far-off places */
export const SCREENSAVER_PIN_FADE: PinFade = { hiddenBelow: 0.12, solidAbove: 0.3 }

/** The globe is centered on the origin, so a point's position is also its normal */
export const facing = (position: Vector3, camera: Vector3) =>
  position.clone().normalize().dot(camera.clone().sub(position).normalize())

/**
 * Pins drawn on top of everything, the same size on screen at any zoom.
 * They skip the depth test, or the globe would cut off their heads near its
 * edge; the shader fades out the ones near the edge and hides those beyond.
 */
export function createPinLayer(globeRadius: number): PinLayer {
  const geometry = new BufferGeometry()
  const texture = new CanvasTexture(document.createElement('canvas'))
  const material = new ShaderMaterial({
    uniforms: {
      map: { value: texture },
      size: { value: PIN_SIZE_PX },
      hiddenBelow: { value: PIN_HIDDEN_BELOW },
      solidAbove: { value: PIN_SOLID_ABOVE },
    },
    vertexShader: `
      uniform float size;
      uniform float hiddenBelow;
      uniform float solidAbove;
      varying float fade;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        // As facing() below: the globe is centered on the origin, so a point's position is also its normal
        float facing = dot(normalize(world.xyz), normalize(cameraPosition - world.xyz));
        fade = smoothstep(hiddenBelow, solidAbove, facing);
        gl_Position = fade > 0.0 ? projectionMatrix * viewMatrix * world : vec4(2.0, 2.0, 2.0, 1.0);
        gl_PointSize = size;
      }
    `,
    fragmentShader: `
      uniform sampler2D map;
      varying float fade;
      void main() {
        vec4 color = texture2D(map, vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y));
        if (color.a < 0.5) discard;
        gl_FragColor = vec4(color.rgb, color.a * fade);
      }
    `,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  })
  const object = new Points(geometry, material)
  object.name = 'city-pins'
  object.renderOrder = 10
  // Points are sized in device pixels
  object.onBeforeRender = (renderer) => {
    material.uniforms.size.value = PIN_SIZE_PX * renderer.getPixelRatio()
  }
  // Pins are added and removed often; don't skip them based on stale bounds
  object.frustumCulled = false

  return {
    object,
    show(pins) {
      const positions = pins.flatMap((pin) => pinPosition(pin, globeRadius).toArray())
      geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
    },
    setFade({ hiddenBelow, solidAbove }) {
      material.uniforms.hiddenBelow.value = hiddenBelow
      material.uniforms.solidAbove.value = solidAbove
    },
    setColor(color) {
      drawPin(texture.image as HTMLCanvasElement, color)
      texture.needsUpdate = true
    },
    dispose() {
      geometry.dispose()
      texture.dispose()
      material.dispose()
    },
  }
}

/** A map pin: a round head in `color` with a white dot, tapering to a tip in the middle of the canvas */
function drawPin(canvas: HTMLCanvasElement, color: ColorRepresentation) {
  canvas.width = canvas.height = TEXTURE_PX
  const context = canvas.getContext('2d')
  if (!context) return // no canvas (tests)
  const center = TEXTURE_PX / 2
  // Where the sides meet the head: tangents from the tip
  const angle = Math.acos(HEAD_RADIUS / (TIP_Y - HEAD_Y))
  context.beginPath()
  context.moveTo(center, TIP_Y)
  context.arc(center, HEAD_Y, HEAD_RADIUS, Math.PI / 2 + angle, Math.PI / 2 - angle + Math.PI * 2)
  context.closePath()
  context.fillStyle = `#${new Color(color).getHexString()}`
  context.fill()
  context.lineWidth = 2.5
  context.strokeStyle = 'rgba(0, 0, 0, 0.65)'
  context.stroke()
  context.beginPath()
  context.arc(center, HEAD_Y, 4.5, 0, Math.PI * 2)
  context.fillStyle = '#fff'
  context.fill()
}

/** The pin whose head is under a point on the screen, if any: the closest. */
export function pinAt<P extends Pin>(globe: GlobeMethods, pins: readonly P[], { x, y }: Point): P | null {
  const camera = globe.camera() as PerspectiveCamera
  const rect = globe.renderer().domElement.getBoundingClientRect()
  const radius = globe.getGlobeRadius()
  let closest: P | null = null
  let closestDistance = Infinity
  for (const pin of pins) {
    const position = pinPosition(pin, radius)
    if (facing(position, camera.position) <= PIN_HIDDEN_BELOW) continue
    const { x: ndcX, y: ndcY } = position.project(camera)
    const tipX = rect.left + ((ndcX + 1) / 2) * rect.width
    const tipY = rect.top + ((1 - ndcY) / 2) * rect.height
    // Only the head: the stem and tip stand on the map, and what's under them (Vatican City, under
    // Rome's pin) must stay clickable
    const head = Math.hypot(x - tipX, y - (tipY - (TIP_Y - HEAD_Y) * SCALE))
    if (head <= HEAD_RADIUS * SCALE + HIT_SLOP_PX && head < closestDistance) {
      closest = pin
      closestDistance = head
    }
  }
  return closest
}
