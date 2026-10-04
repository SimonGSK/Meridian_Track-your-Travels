import { geoBounds, geoContains } from 'd3-geo'
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import type { CountryFeature } from '../countries'

/**
 * States, provinces and territories, for the countries Natural Earth's
 * 1:50m map has them for. The shapes (src/data/regions.json, from
 * `npm run data:regions`) only carry postal codes, so the names are here.
 */
const REGIONS: Record<string, { alpha3: string; label: string; names: Record<string, string> }> = {
  US: {
    alpha3: 'USA',
    label: 'States',
    names: {
      AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado',
      CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii',
      ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
      ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
      MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
      NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
      OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
      TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
      WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
    },
  },
  CA: {
    alpha3: 'CAN',
    label: 'Provinces and territories',
    names: {
      AB: 'Alberta', BC: 'British Columbia', MB: 'Manitoba', NB: 'New Brunswick', NL: 'Newfoundland and Labrador',
      NS: 'Nova Scotia', NT: 'Northwest Territories', NU: 'Nunavut', ON: 'Ontario', PE: 'Prince Edward Island',
      QC: 'Quebec', SK: 'Saskatchewan', YT: 'Yukon',
    },
  },
  AU: {
    alpha3: 'AUS',
    label: 'States and territories',
    names: {
      CT: 'Australian Capital Territory', JB: 'Jervis Bay Territory', NS: 'New South Wales',
      NT: 'Northern Territory', QL: 'Queensland', SA: 'South Australia', TS: 'Tasmania', VI: 'Victoria',
      WA: 'Western Australia',
    },
  },
  BR: {
    alpha3: 'BRA',
    label: 'States',
    names: {
      AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará', DF: 'Federal District',
      ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul',
      MG: 'Minas Gerais', PA: 'Pará', PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco', PI: 'Piauí',
      RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima',
      SC: 'Santa Catarina', SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins',
    },
  },
}

export type RegionFeature = Feature<
  Polygon | MultiPolygon,
  {
    /** Unique id, e.g. "US-CA" */
    id: string
    name: string
    /** The country's ISO alpha-2 code */
    country: string
  }
>

type RawRegions = FeatureCollection<Polygon | MultiPolygon, { country: string; code: string }>

const byAlpha3 = new Map(Object.entries(REGIONS).map(([alpha2, r]) => [r.alpha3, alpha2]))

/** Whether we have states or provinces for a country */
export const hasRegions = (country: CountryFeature) =>
  country.properties.kind === 'country' && !!country.properties.isoAlpha2 && country.properties.isoAlpha2 in REGIONS

/** Every region of a country, by id ("US-CA"), without needing their shapes: none for a country without */
export const regionIdsOf = (alpha2: string) => Object.keys(REGIONS[alpha2]?.names ?? {}).map((code) => `${alpha2}-${code}`)

/** What a country's regions are called, e.g. "Provinces and territories" */
export const regionsLabel = (country: CountryFeature) => REGIONS[country.properties.isoAlpha2 ?? '']?.label ?? 'Regions'

export function parseRegions(raw: RawRegions): RegionFeature[] {
  return raw.features
    .map((f) => {
      const country = byAlpha3.get(f.properties.country)!
      const name = REGIONS[country].names[f.properties.code]
      if (!name) throw new Error(`No name for region ${f.properties.country}-${f.properties.code}`)
      return { ...f, properties: { id: `${country}-${f.properties.code}`, name, country } }
    })
    .sort((a, b) => a.properties.name.localeCompare(b.properties.name))
}

/** The region shapes, loaded on demand as they're fairly big. */
export const loadRegions = () => import('./regions.json').then((m) => parseRegions(m.default as RawRegions))

export const regionsOf = (regions: readonly RegionFeature[], country: CountryFeature) =>
  regions.filter((r) => r.properties.country === country.properties.isoAlpha2)

const bounds = new WeakMap<RegionFeature, [[number, number], [number, number]]>()

/** The region of a country at a point, if any. */
export function findRegionAt(regions: readonly RegionFeature[], lat: number, lng: number): RegionFeature | null {
  for (const region of regions) {
    let box = bounds.get(region)
    if (!box) bounds.set(region, (box = geoBounds(region) as [[number, number], [number, number]]))
    const [[west, south], [east, north]] = box
    if (lat < south || lat > north) continue
    if (west <= east ? lng < west || lng > east : lng < west && lng > east) continue
    if (geoContains(region, [lng, lat])) return region
  }
  return null
}
