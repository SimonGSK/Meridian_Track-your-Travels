import { useState } from 'react'
import { searchCountries, type CountryFeature } from '../countries'
import { countryOfCity, type City } from '../data/cities'
import { normalizeName } from '../data/names'
import { THEMES, type Theme } from '../globe/themes'
import { GAMES, type GameId } from '../games/games'
import type { BestScores } from '../games/useGame'
import { EyeIcon, EyeOffIcon, SearchIcon } from '../icons'
import Card from '../ui/Card'
import { gameSummary } from './gameSummary'
import type { Settings } from './useSettings'

type Props = {
  settings: Settings
  onChange: (changes: Partial<Settings>) => void
  theme: Theme
  onThemeChange: (id: string) => void
  best: BestScores
  /** Opens a game's setup in the Games tab */
  onOpenGame: (id: GameId) => void
  /** Shows a country found by searching */
  onFind: (country: CountryFeature) => void
  cities: readonly City[] | null
}

/** The Explore tab: games at a glance, the design and layers, and a search of the atlas. */
export default function ExplorePanel(props: Props) {
  return (
    <>
      <GamesCard best={props.best} onOpenGame={props.onOpenGame} />
      <LayersCard {...props} />
      <AtlasSearch cities={props.cities} onFind={props.onFind} />
    </>
  )
}

function GamesCard({ best, onOpenGame }: Pick<Props, 'best' | 'onOpenGame'>) {
  return (
    <Card letter="B" label="Games" meta={String(GAMES.length).padStart(2, '0')}>
      <ul className="row-list">
        {GAMES.map((game) => (
          <li key={game.id}>
            <button type="button" className="row-button" onClick={() => onOpenGame(game.id)}>
              <span>{game.title}</span>
              <span className="row-meta">{gameSummary(game.id, best)}</span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  )
}

const LAYERS: { key: keyof Settings; label: string; description: string; dot: 'accent' | 'blue' }[] = [
  { key: 'showVisited', label: 'Visited countries', description: "Color the countries you've visited", dot: 'accent' },
  { key: 'showRegions', label: 'Visited states', description: "Color the states you've visited, a shade darker", dot: 'accent' },
  { key: 'showCities', label: 'City pins', description: "A pin on each city you've visited", dot: 'accent' },
  { key: 'showMarkers', label: 'Small islands', description: 'Rings around small islands and territories', dot: 'blue' },
]

function LayersCard({ settings, onChange, theme, onThemeChange }: Props) {
  return (
    <Card letter="C" label="Design & layers" meta={theme.name.toUpperCase()}>
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
      <ul className="row-list layers">
        {LAYERS.map(({ key, label, description, dot }) => (
          <li key={key}>
            <button
              type="button"
              role="switch"
              aria-checked={settings[key]}
              className="row-button layer"
              title={description}
              onClick={() => onChange({ [key]: !settings[key] })}
            >
              <span className={`dot ${dot}`} aria-hidden="true" />
              <span>{label}</span>
              <span className="eye" aria-hidden="true">
                {settings[key] ? <EyeIcon /> : <EyeOffIcon />}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Card>
  )
}

type Result = { key: string; name: string; note: string; country: CountryFeature }

/** Countries by any of their names, and cities, each showing its country */
function AtlasSearch({ cities, onFind }: Pick<Props, 'cities' | 'onFind'>) {
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
        ...(cities ?? [])
          // From the start of any word: "nelspruit" finds "Mbombela (Nelspruit)"
          .filter((city) => normalizeName(city.name).split(/[\s(]+/).some((word) => word.startsWith(wanted)))
          .sort((a, b) => b.population - a.population)
          .slice(0, 4)
          .flatMap((city) => {
            const country = countryOfCity(city)
            return country ? [{ key: `city-${city.id}`, name: city.name, note: country.properties.name, country }] : []
          }),
      ]
    : []

  const find = (result: Result) => {
    onFind(result.country)
    setQuery('')
  }

  return (
    <div className="atlas-search" role="search">
      <SearchIcon />
      <input
        type="search"
        aria-label="Search the atlas"
        placeholder="Search the atlas"
        autoComplete="off"
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
