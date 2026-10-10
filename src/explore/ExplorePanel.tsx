import { useEffect, useState, type MouseEvent } from 'react'
import { searchCountries, type CountryFeature } from '../countries'
import { countryOfCity, findCities, type City } from '../data/cities'
import { normalizeName } from '../data/names'
import { SearchIcon } from '../icons'
import { noAutofill } from '../ui/noAutofill'

type Props = {
  /** Shows a country found by searching */
  onFind: (country: CountryFeature) => void
  cities: readonly City[] | null
  /** Just a button, opening the search. Phones show it open, in their sheet. */
  compact?: boolean
}

/**
 * The Explore tab: a search of the atlas. On big screens it's a round
 * button, a magnifying glass, that opens it, so the globe has the room.
 */
export default function ExplorePanel({ compact = true, ...props }: Props) {
  const [open, setOpen] = useState(false)
  // Keeps the focus in the search, so it doesn't put itself away just before its button toggles it
  const keepFocus = (e: MouseEvent) => e.preventDefault()

  // Escape closes the search before anything else
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [open])

  if (!compact) return <AtlasSearch cities={props.cities} onFind={props.onFind} />

  return (
    <div className="explore-tools">
      <div className="tool-row">
        {open && <AtlasSearch cities={props.cities} onFind={props.onFind} onClose={() => setOpen(false)} autoFocus />}
        <button
          type="button"
          className="tool-button"
          aria-label="Search the atlas"
          aria-expanded={open}
          title="Search the atlas"
          onMouseDown={keepFocus}
          onClick={() => setOpen((was) => !was)}
        >
          <SearchIcon size={20} />
        </button>
      </div>
    </div>
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
        {...noAutofill('atlas')}
        type="search"
        aria-label="Search the atlas"
        placeholder="Search the atlas"
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
