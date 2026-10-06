import { describe, expect, it } from 'vitest'
import { PerspectiveCamera, type Mesh, type MeshBasicMaterial, type Sprite, Vector3 } from 'three'
import { FLIGHT_BASE, PLANE_SIZE_PX, createFlightLayer, flightPath, flightSeconds, pointAlong } from './flightLayer'
import { LAND_ALTITUDE } from './style'
import { fakeCanvas } from '../test/fakeCanvas'

const RADIUS = 100
const copenhagen = { lat: 55.62, lng: 12.66 }
const bangkok = { lat: 13.69, lng: 100.75 }
const paris = { lat: 49.01, lng: 2.55 }
const altitudeOf = (point: Vector3) => point.length() / RADIUS - 1

function camera() {
  const c = new PerspectiveCamera(50, 1, 0.1, 10000)
  c.position.set(0, 0, 300) // looking at lat 0, lng 0
  c.lookAt(0, 0, 0)
  c.updateMatrixWorld()
  c.updateProjectionMatrix()
  return c
}

describe('flightPath', () => {
  it('leaves and lands just above the land', () => {
    const path = flightPath(copenhagen, bangkok, RADIUS)
    expect(altitudeOf(path[0])).toBeCloseTo(FLIGHT_BASE)
    expect(altitudeOf(path.at(-1)!)).toBeCloseTo(FLIGHT_BASE)
    expect(FLIGHT_BASE).toBeGreaterThan(LAND_ALTITUDE)
    expect(path[0].clone().normalize().y).toBeCloseTo(Math.sin((copenhagen.lat * Math.PI) / 180), 3)
  })

  it('rises highest in the middle, and higher for longer flights', () => {
    const long = flightPath(copenhagen, bangkok, RADIUS)
    const short = flightPath(copenhagen, paris, RADIUS)
    const peak = (path: Vector3[]) => Math.max(...path.map(altitudeOf))
    expect(altitudeOf(long[32])).toBeCloseTo(peak(long))
    expect(peak(long)).toBeGreaterThan(peak(short))
    expect(peak(short)).toBeGreaterThan(FLIGHT_BASE)
  })
})

describe('pointAlong', () => {
  it('goes from the start to the end of a path, in between in the middle', () => {
    const path = [new Vector3(0, 0, 0), new Vector3(10, 0, 0), new Vector3(10, 10, 0)]
    expect(pointAlong(path, 0).toArray()).toEqual([0, 0, 0])
    expect(pointAlong(path, 0.25).toArray()).toEqual([5, 0, 0])
    expect(pointAlong(path, 1).toArray()).toEqual([10, 10, 0])
    expect(pointAlong(path, 2).toArray()).toEqual([10, 10, 0])
  })
})

describe('createFlightLayer', () => {
  const lines = [
    { key: 'cph-bkk', from: copenhagen, to: bangkok },
    { key: 'cph-cdg', from: copenhagen, to: paris, highlighted: true },
  ]
  const parts = (layer: ReturnType<typeof createFlightLayer>) => ({
    tubes: layer.object.children.filter((c) => c.type === 'Mesh') as Mesh[],
    planes: layer.object.children.filter((c) => c.type === 'Sprite') as Sprite[],
  })

  it('draws a line and a plane for each route, and clears them for new routes', () => {
    const layer = createFlightLayer(RADIUS)
    layer.show(lines)
    expect(parts(layer).tubes).toHaveLength(2)
    expect(parts(layer).planes).toHaveLength(2)
    layer.show([])
    expect(layer.object.children).toHaveLength(0)
    layer.dispose()
  })

  it('colors the routes, the picked one in the highlight color', () => {
    const layer = createFlightLayer(RADIUS)
    layer.show(lines)
    layer.setColors('#0000ff', '#ff0000')
    const [plain, picked] = parts(layer).tubes.map((t) => (t.material as MeshBasicMaterial).color.getHexString())
    expect([plain, picked]).toEqual(['0000ff', 'ff0000'])
    layer.dispose()
  })

  it('flies the planes along their routes over time, the same size on screen', () => {
    const layer = createFlightLayer(RADIUS)
    layer.show([lines[0]])
    const [plane] = parts(layer).planes
    const cam = camera()
    layer.tick(0, cam, 800, 800)
    const first = plane.position.clone()
    layer.tick(1, cam, 800, 800)
    expect(plane.position.distanceTo(first)).toBeGreaterThan(1)
    // On the route: between the ends' heights and the peak
    expect(altitudeOf(plane.position)).toBeGreaterThanOrEqual(FLIGHT_BASE - 1e-6)
    // Sized so it's PLANE_SIZE_PX tall at any distance
    expect(plane.scale.x * cam.projectionMatrix.elements[5] * 400).toBeCloseTo(PLANE_SIZE_PX)
    layer.dispose()
  })

  it('turns each plane to face its way on screen', () => {
    const layer = createFlightLayer(RADIUS)
    // Due north along the meridian facing the camera: straight up the screen
    layer.show([{ key: 'north', from: { lat: -10, lng: 0 }, to: { lat: 10, lng: 0 } }])
    const [plane] = parts(layer).planes
    layer.tick(flightSeconds(0.35) * 0.3, camera(), 800, 800)
    expect(plane.material.rotation).toBeCloseTo(0, 1)
    // Due east: to the right, a quarter turn clockwise
    layer.show([{ key: 'east', from: { lat: 0, lng: -10 }, to: { lat: 0, lng: 10 } }])
    const [eastward] = parts(layer).planes
    layer.tick(flightSeconds(0.35) * 0.3, camera(), 800, 800)
    expect(eastward.material.rotation).toBeCloseTo(-Math.PI / 2, 1)
    layer.dispose()
  })
})

describe('flightSeconds', () => {
  it('gives longer flights more time', () => {
    expect(flightSeconds(1)).toBeGreaterThan(flightSeconds(0.1))
    expect(flightSeconds(0)).toBeGreaterThan(0)
  })

  it('takes its time: Copenhagen to Bangkok, about 1.35 radians, in about 14 seconds', () => {
    expect(flightSeconds(1.35)).toBeCloseTo(14.1, 1)
  })
})

describe('plane texture', () => {
  it('draws a white plane, nose up, with a dark edge, for each plane to tint', () => {
    const { drawing, restore } = fakeCanvas()
    const layer = createFlightLayer(RADIUS)
    expect(drawing.fills).toEqual(['#fff'])
    expect(drawing.strokes).toHaveLength(1)
    expect(drawing.lines).toBeGreaterThan(10) // fuselage, wings and tail
    layer.dispose()
    restore()
  })
})
