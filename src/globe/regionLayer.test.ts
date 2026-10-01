import { describe, expect, it } from 'vitest'
import { BufferGeometry, Color, LineBasicMaterial, LineSegments, Mesh, Vector3 } from 'three'
import { loadRegions } from '../data/regions'
import { createRegionLayer } from './regionLayer'

const regions = await loadRegions()
const byName = (name: string) => regions.find((r) => r.properties.name === name)!
const layer = createRegionLayer(regions, 100)
const fill = layer.object.children.find((c): c is Mesh<BufferGeometry> => c instanceof Mesh)!
const lines = layer.object.children.find(
  (c): c is LineSegments<BufferGeometry, LineBasicMaterial> => c instanceof LineSegments,
)!
const triangles = () => (fill.geometry.index?.count ?? 0) / 3
const segments = () => (lines.geometry.index?.count ?? 0) / 2

describe('createRegionLayer', () => {
  it('shows nothing until asked', () => {
    expect(triangles()).toBe(0)
    expect(segments()).toBe(0)
  })

  it('fills the given regions in their colors', () => {
    layer.show(new Map([[byName('California'), '#ff0000']]), [])
    expect(triangles()).toBeGreaterThan(0)
    const colors = fill.geometry.getAttribute('color')
    const first = fill.geometry.index!.getX(0)
    expect(new Color(colors.getX(first), colors.getY(first), colors.getZ(first)).getHexString()).toBe('ff0000')
    expect(segments()).toBe(0)
  })

  it('outlines the given regions', () => {
    layer.show(new Map(), [byName('California'), byName('Texas')])
    expect(triangles()).toBe(0)
    expect(segments()).toBeGreaterThan(0)
  })

  it('hides regions no longer given', () => {
    layer.show(new Map([[byName('Texas'), '#00ff00']]), [byName('Texas')])
    const texasOnly = triangles()
    layer.show(new Map([[byName('Texas'), '#00ff00'], [byName('California'), '#00ff00']]), [])
    expect(triangles()).toBeGreaterThan(texasOnly)
    layer.show(new Map(), [])
    expect(triangles()).toBe(0)
  })

  it('keeps every part of a region above the land, and outlines above the regions, so nothing shows through', () => {
    const land = 100 * 1.006
    const all = new Map(regions.map((r) => [r, '#000000']))
    layer.show(all, regions)
    const lowestCenter = (mesh: Mesh | LineSegments, size: number) => {
      const pos = mesh.geometry.getAttribute('position')
      const index = mesh.geometry.index!
      let lowest = Infinity
      for (let i = 0; i < index.count; i += size) {
        const center = new Vector3()
        for (let k = 0; k < size; k++) center.add(new Vector3().fromBufferAttribute(pos, index.getX(i + k)))
        lowest = Math.min(lowest, center.divideScalar(size).length())
      }
      return lowest
    }
    const highestCorner = (mesh: Mesh) => {
      const pos = mesh.geometry.getAttribute('position')
      return Math.max(...Array.from({ length: pos.count }, (_, i) => new Vector3().fromBufferAttribute(pos, i).length()))
    }
    expect(lowestCenter(fill, 3)).toBeGreaterThan(land)
    expect(lowestCenter(lines, 2)).toBeGreaterThan(highestCorner(fill))
    layer.show(new Map(), [])
  })

  it('draws regions just above the countries, and outlines above that', () => {
    const radius = (mesh: Mesh | LineSegments) => new Vector3().fromBufferAttribute(mesh.geometry.getAttribute('position'), 0).length()
    expect(radius(fill)).toBeGreaterThan(100.6)
    expect(radius(lines)).toBeGreaterThan(radius(fill))
  })

  it('recolors the outlines', () => {
    layer.setOutlineColor('#123456', 0.4)
    expect(lines.material.color.getHexString()).toBe('123456')
    expect(lines.material.opacity).toBe(0.4)
  })
})

describe('disposing', () => {
  it('frees the geometry', () => {
    const own = createRegionLayer(regions.slice(0, 2), 100)
    const mesh = own.object.children.find((c): c is Mesh<BufferGeometry> => c instanceof Mesh)!
    let disposed = false
    mesh.geometry.addEventListener('dispose', () => (disposed = true))
    own.dispose()
    expect(disposed).toBe(true)
  })
})
