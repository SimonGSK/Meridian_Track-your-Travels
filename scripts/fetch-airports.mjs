// Downloads the airports with scheduled flights and an IATA code from
// OurAirports (public domain): every international airport, and the
// regional ones with airline service, for adding flights.
//
//   npm run data:airports
import { writeFile } from 'node:fs/promises'

const SOURCE = 'https://davidmegginson.github.io/ourairports-data/airports.csv'
const OUTPUT = new URL('../src/data/airports.json', import.meta.url)

/** Rows of a CSV file, with quoted fields */
function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (ch === '"') quoted = false
      else field += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (ch !== '\r') field += ch
  }
  if (field || row.length) rows.push([...row, field])
  return rows
}

const response = await fetch(SOURCE)
if (!response.ok) throw new Error(`${SOURCE}: ${response.status}`)
const [header, ...rows] = parseCsv(await response.text())
const column = Object.fromEntries(header.map((name, i) => [name, i]))
const round = (value) => Math.round(Number(value) * 1e4) / 1e4

const airports = rows
  .filter((row) => ['large_airport', 'medium_airport'].includes(row[column.type]))
  .filter((row) => row[column.scheduled_service] === 'yes' && /^[A-Z]{3}$/.test(row[column.iata_code]))
  .map((row) => ({
    code: row[column.iata_code],
    name: row[column.name],
    city: row[column.municipality] || row[column.name],
    country: row[column.iso_country],
    lat: round(row[column.latitude_deg]),
    lng: round(row[column.longitude_deg]),
    ...(row[column.type] === 'large_airport' && { large: true }),
  }))
  .sort((a, b) => a.code.localeCompare(b.code))

// The odd code is shared by two airports; keep the bigger
const byCode = new Map()
for (const airport of airports) if (!byCode.has(airport.code) || airport.large) byCode.set(airport.code, airport)

await writeFile(OUTPUT, JSON.stringify([...byCode.values()]) + '\n')
console.log(`Wrote ${byCode.size} airports to ${OUTPUT.pathname}`)
