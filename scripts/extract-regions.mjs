// Copies the states and provinces of the countries Natural Earth's 1:50m
// map has them for (USA, Canada, Australia, Brazil) out of sane-topojson,
// so the app only loads those. Lakes are cut out, as from the countries.
//
//   npm run data:regions
import { readFile, writeFile } from 'node:fs/promises'
import { feature } from 'topojson-client'
import { cutLakes } from './lakes.mjs'

const OUTPUT = new URL('../src/data/regions.json', import.meta.url)
const world = JSON.parse(await readFile(new URL('../node_modules/sane-topojson/dist/world_50m.json', import.meta.url)))
/** Fine enough not to move any point once rounded to a thousandth of a degree */
const GRID = { scale: [1e-6, 1e-6], translate: [0, 0] }
const round = (value) => (Array.isArray(value) ? value.map(round) : Math.round(value * 1e3) / 1e3)

const features = feature(world, world.objects.subunits).features.map((f) => ({
  type: 'Feature',
  // "gu" is the country's ISO alpha-3 code, the id the region's postal code
  properties: { country: f.properties.gu, code: f.id },
  geometry: (({ type, coordinates }) => ({ type, coordinates: round(coordinates) }))(cutLakes(f.geometry, GRID)),
}))

await writeFile(OUTPUT, JSON.stringify({ type: 'FeatureCollection', features }) + '\n')
const countries = [...new Set(features.map((f) => f.properties.country))]
console.log(`Wrote ${features.length} regions of ${countries.join(', ')} to ${OUTPUT.pathname}`)
