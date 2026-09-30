import { countryByAlpha2, type CountryFeature } from '../countries'
import { regionsOf, type RegionFeature } from '../data/regions'

type FillOptions = {
  regions: readonly RegionFeature[]
  visitedRegions: ReadonlySet<string>
  /** Countries whose visited regions are shown */
  isShownCountry: (country: CountryFeature) => boolean
  /** The country whose regions are being picked, shown whatever the settings */
  editing: CountryFeature | null
  hovered: RegionFeature | null
  color: string
  hoverColor: string
}

/** Regions to color on the globe: visited ones, and the one pointed at while picking. */
export function regionFills({ regions, visitedRegions, isShownCountry, editing, hovered, color, hoverColor }: FillOptions) {
  const fills = new Map<RegionFeature, string>()
  for (const region of regions) {
    if (!visitedRegions.has(region.properties.id)) continue
    const country = countryByAlpha2(region.properties.country)
    if (country && (country === editing || isShownCountry(country))) fills.set(region, color)
  }
  if (hovered) fills.set(hovered, hoverColor)
  return fills
}

/** Outlines: the colored regions, and every region of the country being picked from. */
export function regionOutlines(
  regions: readonly RegionFeature[],
  fills: ReadonlyMap<RegionFeature, string>,
  editing: CountryFeature | null,
) {
  return [...new Set([...fills.keys(), ...(editing ? regionsOf(regions, editing) : [])])]
}

/** How many of a country's regions have been visited */
export function regionProgress(
  regions: readonly RegionFeature[],
  visitedRegions: ReadonlySet<string>,
  country: CountryFeature,
) {
  const own = regionsOf(regions, country)
  return { visited: own.filter((r) => visitedRegions.has(r.properties.id)).length, total: own.length }
}
