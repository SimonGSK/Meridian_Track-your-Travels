// The 1:50m country shapes from world-atlas, with borders as the UN counts
// them (see un-borders.mjs), and Natural Earth's lakes cut out of them, so
// the Great Lakes and Lake Victoria show as water (and aren't part of any
// country when pointed at).
//
//   npm run data:map
import { readFile, writeFile } from 'node:fs/promises'
import { feature, quantize } from 'topojson-client'
import { topology } from 'topojson-server'
import { cutLakes, lakes } from './lakes.mjs'
import { followTheUn } from './un-borders.mjs'

const OUTPUT = new URL('../src/data/countries-50m.json', import.meta.url)
const world = JSON.parse(await readFile(new URL('../node_modules/world-atlas/countries-50m.json', import.meta.url), 'utf8'))

let cut = 0
const countries = feature(world, world.objects.countries)
countries.features = followTheUn(countries.features, world.transform).map((f) => {
  const geometry = cutLakes(f.geometry, world.transform)
  if (geometry !== f.geometry) cut++
  return { ...f, geometry }
})

// On the same grid as world-atlas, so every point not on a lake shore stays exactly where it was
const map = quantize(topology({ countries }), world.transform)
delete map.bbox
await writeFile(OUTPUT, JSON.stringify(map) + '\n')
console.log(`Cut ${lakes.length} lakes out of ${cut} of ${countries.features.length} countries into ${OUTPUT.pathname}`)
