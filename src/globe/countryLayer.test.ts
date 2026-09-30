import { describe, expect, it } from 'vitest'
import { BufferAttribute, BufferGeometry, Color, LineBasicMaterial, LineSegments, Mesh, MeshLambertMaterial, Points, Vector3 } from 'three'
import { borders, countries } from '../countries'
import { createCountryLayer, createRaisedCountry } from './countryLayer'

const LAND = '#48a078'
const HOVER = '#ffc850'

const RADIUS = 100

describe('createCountryLayer', () => {
  const layer = createCountryLayer(countries, borders, RADIUS)
  const land = layer.object.children.find((c): c is Mesh => c instanceof Mesh)!
  const colors = land.geometry.getAttribute('color') as BufferAttribute
  const colorAt = (i: number) => new Color(colors.getX(i), colors.getY(i), colors.getZ(i)).getHexString()
  const allColors = () => Array.from({ length: colors.count }, (_, i) => colorAt(i))
  const hex = (color: string) => new Color(color).getHexString()

  it('draws all countries as one mesh, one set of lines and one set of markers', () => {
    expect(layer.object.children).toHaveLength(3)
    expect(layer.object.children.filter((c) => c instanceof Mesh)).toHaveLength(1)
    expect(layer.object.children.filter((c) => c instanceof LineSegments)).toHaveLength(1)
    expect(layer.object.children.filter((c) => c instanceof Points)).toHaveLength(1)
  })

  it('marks every tiny place, in its own color', () => {
    const markers = layer.object.children.find((c): c is Points<BufferGeometry> => c instanceof Points)!
    const tiny = countries.filter((c) => c.properties.tiny)
    expect(markers.geometry.getAttribute('position').count).toBe(tiny.length)
    const grenada = tiny.findIndex((c) => c.properties.name === 'Grenada')
    layer.paint(tiny[grenada], HOVER)
    const markerColors = markers.geometry.getAttribute('color')
    const color = new Color(markerColors.getX(grenada), markerColors.getY(grenada), markerColors.getZ(grenada))
    expect(color.getHexString()).toBe(hex(HOVER))
    layer.paint(tiny[grenada], LAND)
  })

  for (const country of countries) layer.paint(country, LAND)

  it('paints every country', () => {
    expect(new Set(allColors())).toEqual(new Set([hex(LAND)]))
  })

  it("paints only the given country's part of the mesh", () => {
    const denmark = countries.find((c) => c.properties.name === 'Denmark')!
    layer.paint(denmark, HOVER)
    const painted = allColors().filter((c) => c === hex(HOVER)).length
    expect(painted).toBeGreaterThan(0)
    expect(painted).toBeLessThan(colors.count / 100) // a small country, not the world

    layer.paint(denmark, LAND)
    expect(new Set(allColors())).toEqual(new Set([hex(LAND)]))
  })

  it('queues both countries for upload when switching hover in one frame', () => {
    const [a, b] = countries
    colors.clearUpdateRanges()
    layer.paint(a, LAND)
    layer.paint(b, HOVER)
    expect(colors.updateRanges).toHaveLength(2)
  })

  it('recolors the borders', () => {
    const lines = layer.object.children.find((c): c is LineSegments<BufferGeometry, LineBasicMaterial> => c instanceof LineSegments)!
    layer.setBorders('#ff0000', 0.5)
    expect(lines.material.color.getHexString()).toBe('ff0000')
    expect(lines.material.opacity).toBe(0.5)
  })
})

describe('createRaisedCountry', () => {
  const denmark = countries.find((c) => c.properties.name === 'Denmark')!
  const raised = createRaisedCountry(denmark, RADIUS, RADIUS * 1.01)
  const [cap, walls] = raised.object.children as Mesh<BufferGeometry, MeshLambertMaterial>[]
  const radii = (mesh: Mesh) => {
    const pos = mesh.geometry.getAttribute('position')
    return Array.from({ length: pos.count }, (_, i) => new Vector3().fromBufferAttribute(pos, i).length())
  }

  it('puts the surface at the raised height', () => {
    for (const r of radii(cap)) expect(r).toBeCloseTo(RADIUS * 1.01, 3)
  })

  it('has walls from the globe up to the surface', () => {
    const r = radii(walls)
    expect(Math.min(...r)).toBeCloseTo(RADIUS, 3)
    expect(Math.max(...r)).toBeCloseTo(RADIUS * 1.01, 3)
  })

  it('colors the walls darker than the surface', () => {
    raised.setColor('#ff7846')
    expect(cap.material.color.getHexString()).toBe('ff7846')
    expect(walls.material.color.getHSL({ h: 0, s: 0, l: 0 }).l).toBeLessThan(cap.material.color.getHSL({ h: 0, s: 0, l: 0 }).l)
  })
})
