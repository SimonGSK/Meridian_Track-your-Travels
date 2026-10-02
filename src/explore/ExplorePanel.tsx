import { useEffect, useState, type MouseEvent } from 'react'
import { searchCountries, type CountryFeature } from '../countries'
import { countryOfCity, findCities, type City } from '../data/cities'
import { normalizeName } from '../data/names'
import { THEMES, type Theme } from '../globe/themes'
import { GearIcon, SearchIcon } from '../icons'
import Card from '../ui/Card'
import LayerList from './LayerList'
import type { Settings } from './useSettings'

type Props = {
  settings: Settings
  onChange: (changes: Partial<Settings>) => void
  theme: Theme
  onThemeChange: (id: string) => void
  /** Shows a country found by searching */
  onFind: (country: CountryFeature) => void
  cities: readonly City[] | null
  /** Just two buttons, opening the search and the design and layers. Phones show both open, in their sheet. */
  compact?: boolean
}

type Tool = 'search' | 'settings'

/**
 * The Explore tab: a search of the atlas, and the design and layers. On big
 * screens they're two round buttons, a magnifying glass and a gear, that
 * open them, so the globe has the room.
 */
export default function ExplorePanel({ compact = true, ...props }: Props) {
  const [open, setOpen] = useState<Tool | null>(null)
  const toggle = (tool: Tool) => setOpen((current) => (current === tool ? null : tool))
  // Keeps the focus in the search, so it doesn't put itself away just before its button toggles it
  const keepFocus = (e: MouseEvent) => e.preventDefault()

  // Escape closes what's open before anything else
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      setOpen(null)
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [open])

  if (!compact) {
    return (
      <>
        <AtlasSearch cities={props.cities} onFind={props.onFind} />
        <LayersCard {...props} />
      </>
    )
  }

  return (
    <div className="explore-tools">
      <div className="tool-row">
        {open === 'search' && (
          <AtlasSearch cities={props.cities} onFind={props.onFind} onClose={() => setOpen(null)} autoFocus />
        )}
        <button
          type="button"
          className="tool-button"
          aria-label="Search the atlas"
          aria-expanded={open === 'search'}
          title="Search the atlas"
          onMouseDown={keepFocus}
          onClick={() => toggle('search')}
        >
          <SearchIcon size={20} />
        </button>
      </div>
      <button
        type="button"
        className="tool-button"
        aria-label="Design and layers"
        aria-expanded={open === 'settings'}
        title="Design and layers"
        onMouseDown={keepFocus}
        onClick={() => toggle('settings')}
      >
        <GearIcon size={20} />
      </button>
      {open === 'settings' && <LayersCard {...props} />}
    </div>
  )
}

function LayersCard({ settings, onChange, theme, onThemeChange }: Props) {
  return (
    <Card letter="B" label="Design & layers" meta={theme.name.toUpperCase()}>
      <div className="swatches" role="group" aria-label="Design">
        {THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            className="swatch"
            style={{ background: t.swatch }}
            aria-label={t.name}
            title={t.name}
            aria-pressed={t.id === theme.id}
            onClick={() => onThemeChange(t.id)}
          />
        ))}
      </div>
      <LayerList settings={settings} onChange={onChange} />
    </Card>
  )
}

type Result = { key: string; name: string; note: string; country: CountryFeature }

/** Countries by any of their names, and cities, each showing its country */
function AtlasSearch({
  cities,
  onFind,
  onClose,
  autoFocus = false,
}: Pick<Props, 'cities' | 'onFind'> & {
  /** After finding a place, or leaving the box empty */
  onClose?: () => void
  autoFocus?: boolean
}) {
  const [query, setQuery] = useState('')
  const wanted = normalizeName(query)
  const results: Result[] = wanted
    ? [
        ...searchCountries(query, undefined, 5).map(({ country, matchedAlias }) => ({
          key: country.properties.name,
          name: country.properties.name,
          note: matchedAlias ? `“${matchedAlias}”` : country.properties.continent,
          country,
        })),
        // From the start of any word: "nelspruit" finds "Mbombela (Nelspruit)"
        ...findCities(cities ?? [], query, 4).flatMap((city) => {
          const country = countryOfCity(city)
          return country ? [{ key: `city-${city.id}`, name: city.name, note: country.properties.name, country }] : []
        }),
      ]
    : []

  const find = (result: Result) => {
    onFind(result.country)
    setQuery('')
    onClose?.()
  }

  return (
    <div
      className="atlas-search"
      role="search"
      // Clicking away from an empty box puts it away
      onBlur={(e) => !query && !e.currentTarget.contains(e.relatedTarget) && onClose?.()}
    >
      {!onClose && <SearchIcon />}
      <input
        type="search"
        aria-label="Search the atlas"
        placeholder="Search the atlas"
        autoComplete="off"
        autoFocus={autoFocus}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && results[0] && find(results[0])}
      />
      {wanted && (
        <ul className="suggestions" aria-label="Places found">
          {results.map((result) => (
            <li key={result.key}>
              <button type="button" onClick={() => find(result)}>
                <span>{result.name}</span>
                <span className="row-meta">{result.note}</span>
              </button>
            </li>
          ))}
          {results.length === 0 && <li className="muted">Nothing called “{query.trim()}”.</li>}
        </ul>
      )}
    </div>
  )
}
