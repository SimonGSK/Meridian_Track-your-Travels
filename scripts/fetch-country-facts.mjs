// Downloads capitals, population and area from the World Bank's open data
// API (CC BY 4.0) and keeps what the app shows, by ISO alpha-2 code.
// Places the World Bank doesn't cover are filled in from
// src/data/country-facts-extra.json.
//
//   npm run data:facts
import { readFile, writeFile } from 'node:fs/promises'

const API = 'https://api.worldbank.org/v2'
const OUTPUT = new URL('../src/data/country-facts.json', import.meta.url)
const EXTRA = new URL('../src/data/country-facts-extra.json', import.meta.url)

async function get(path) {
  const response = await fetch(`${API}/${path}${path.includes('?') ? '&' : '?'}format=json&per_page=20000`)
  if (!response.ok) throw new Error(`${response.status} for ${path}`)
  const [meta, rows] = await response.json()
  if (meta.pages > 1) throw new Error(`More than one page for ${path}`)
  return rows
}

/** The latest value per country (ISO alpha-2) of an indicator, with its year */
async function latest(indicator, years) {
  const values = {}
  for (const row of await get(`country/all/indicator/${indicator}?date=${years}`)) {
    if (row.value === null) continue
    const code = row.country.id
    if (!values[code] || Number(row.date) > values[code].year) values[code] = { value: row.value, year: Number(row.date) }
  }
  return values
}

const countryList = (await get('country')).filter((c) => c.region.id !== 'NA') // aggregates have no region
const population = await latest('SP.POP.TOTL', '2019:2024')
const area = await latest('AG.SRF.TOTL.K2', '2015:2024')

const facts = {}
for (const country of countryList) {
  const code = country.iso2Code
  facts[code] = {
    capital: country.capitalCity || null,
    population: population[code]?.value ?? null,
    populationYear: population[code]?.year ?? null,
    areaKm2: area[code] ? Math.round(area[code].value) : null,
    source: 'World Bank',
  }
}
const extra = JSON.parse(await readFile(EXTRA, 'utf8'))
for (const [code, values] of Object.entries(extra)) facts[code] = { ...facts[code], ...values }

await writeFile(OUTPUT, JSON.stringify(facts, null, 1) + '\n')
console.log(`Wrote facts for ${Object.keys(facts).length} places to ${OUTPUT.pathname}`)
