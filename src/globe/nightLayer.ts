import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  Mesh,
  Points,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
} from 'three'
import { toUnitVector } from './sphereMesh'
import { LAND_ALTITUDE } from './style'

/** Just above the land and its borders, under the raised country, pins and flights */
const NIGHT_LIFT = 0.0015
/** How dark full night is: dark enough to see, light enough to still read the map */
export const NIGHT_DARKNESS = 0.62
const NIGHT_COLOR = '#02060d'
const LIGHT_COLOR = '#ffd27f'

/**
 * How dark it is where the sun is at `sine` (the sine of its height above
 * the horizon): day above, twilight down to 18° below, then night.
 */
const NIGHT_GLSL = `
  float nightAt(float sine) {
    return 1.0 - smoothstep(-0.309, 0.035, sine);
  }
`

type LatLng = { lat: number; lng: number }
/** A city lit at night, bigger for more people */
export type Light = LatLng & { population: number }

export type NightLayer = {
  object: Group
  /** Where the sun is overhead */
  setSun(point: LatLng): void
  /** The cities that light up at night */
  setLights(lights: readonly Light[]): void
  dispose(): void
}

/** On-screen size of a city's light, in pixels: from 1.5 for a town to 5 for the biggest cities */
export const lightSize = (population: number) => 1.5 + Math.min(Math.max(Math.log10(Math.max(population, 1)) - 4.5, 0), 2.5) * 1.4

/**
 * Night on the globe: a dark, see-through shell over the side the sun has
 * set on, fading through twilight, with the cities lit on it.
 */
export function createNightLayer(globeRadius: number): NightLayer {
  const radius = globeRadius * (1 + LAND_ALTITUDE) * (1 + NIGHT_LIFT)
  const sun = new Vector3(1, 0, 0)

  const shell = new Mesh(
    new SphereGeometry(radius, 128, 64),
    new ShaderMaterial({
      uniforms: { sun: { value: sun }, color: { value: new Color(NIGHT_COLOR) }, darkness: { value: NIGHT_DARKNESS } },
      vertexShader: `
        varying vec3 direction;
        void main() {
          direction = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 sun;
        uniform vec3 color;
        uniform float darkness;
        varying vec3 direction;
        ${NIGHT_GLSL}
        void main() {
          gl_FragColor = vec4(color, nightAt(dot(normalize(direction), sun)) * darkness);
        }
      `,
      transparent: true,
      depthWrite: false,
    }),
  )
  shell.name = 'night'
  // Over the land, under the borders, rings, pins and flights, which stay readable at night
  shell.renderOrder = -1

  const lightGeometry = new BufferGeometry()
  const lightMaterial = new ShaderMaterial({
    uniforms: { sun: { value: sun }, color: { value: new Color(LIGHT_COLOR) }, pixelRatio: { value: 1 } },
    vertexShader: `
      uniform vec3 sun;
      uniform float pixelRatio;
      attribute float size;
      varying float glow;
      ${NIGHT_GLSL}
      void main() {
        glow = nightAt(dot(normalize(position), sun));
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = glow > 0.0 ? size * pixelRatio : 0.0;
      }
    `,
    fragmentShader: `
      uniform vec3 color;
      varying float glow;
      void main() {
        // A soft round dot
        float edge = 1.0 - smoothstep(0.15, 0.5, length(gl_PointCoord - 0.5));
        gl_FragColor = vec4(color, edge * glow * 0.9);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  })
  const lights = new Points(lightGeometry, lightMaterial)
  lights.name = 'city-lights'
  lights.renderOrder = 1
  // Points are sized in device pixels
  lights.onBeforeRender = (renderer) => {
    lightMaterial.uniforms.pixelRatio.value = renderer.getPixelRatio()
  }

  const object = new Group()
  object.name = 'day-and-night'
  object.add(shell, lights)

  return {
    object,
    setSun({ lat, lng }) {
      sun.set(...toUnitVector([lng, lat]))
    },
    setLights(cities) {
      const lightRadius = radius * (1 + NIGHT_LIFT)
      lightGeometry.setAttribute(
        'position',
        new Float32BufferAttribute(cities.flatMap(({ lat, lng }) => toUnitVector([lng, lat]).map((v) => v * lightRadius)), 3),
      )
      lightGeometry.setAttribute('size', new Float32BufferAttribute(cities.map((c) => lightSize(c.population)), 1))
      lightGeometry.computeBoundingSphere()
    },
    dispose() {
      shell.geometry.dispose()
      shell.material.dispose()
      lightGeometry.dispose()
      lightMaterial.dispose()
    },
  }
}
