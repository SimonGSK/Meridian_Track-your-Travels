// Copies the few places the 1:50m map leaves out (too small) from the
// 1:10m map, so the app doesn't have to load the whole 3.6 MB file.
//
//   npm run data:extra
import { readFile, writeFile } from 'node:fs/promises'
import { feature } from 'topojson-client'

const NAMES = ['Tuvalu', 'Gibraltar']
const OUTPUT = new URL('../src/data/extra-countries.json', import.meta.url)

const world = JSON.parse(await readFile(new URL('../node_modules/world-atlas/countries-10m.json', import.meta.url)))
const round = (value) => (Array.isArray(value) ? value.map(round) : Math.round(value * 1e4) / 1e4)

const features = feature(world, world.objects.countries)
  .features.filter((f) => NAMES.includes(f.properties.name))
  .map((f) => ({ type: 'Feature', id: f.id, properties: f.properties, geometry: { ...f.geometry, coordinates: round(f.geometry.coordinates) } }))

const missing = NAMES.filter((name) => !features.some((f) => f.properties.name === name))
if (missing.length) throw new Error(`Not found in the 1:10m map: ${missing.join(', ')}`)

await writeFile(OUTPUT, JSON.stringify({ type: 'FeatureCollection', features }) + '\n')
console.log(`Wrote ${features.length} places to ${OUTPUT.pathname}`)
