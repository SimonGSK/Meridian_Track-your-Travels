import type { CountryFeature } from './countries'

// Flag SVGs from flag-icons, bundled as separate files and only fetched when shown
const FLAG_DIR = '/node_modules/flag-icons/flags/4x3/'
const flagUrls = import.meta.glob<string>('/node_modules/flag-icons/flags/4x3/*.svg', {
  query: '?url&no-inline',
  import: 'default',
  eager: true,
})

/** URL of the country's flag, or null if it has none (e.g. Somaliland, N. Cyprus). */
export function flagUrl(country: CountryFeature): string | null {
  const code = country.properties.isoAlpha2
  return (code && flagUrls[`${FLAG_DIR}${code.toLowerCase()}.svg`]) || null
}
