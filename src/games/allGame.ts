import { countries, type CountryFeature } from '../countries'
import { CONTINENTS, type Continent } from '../data/continents'

/** Name the countries of the whole world, or of one continent */
export type Scope = 'world' | Continent

export type AllGameState = {
  kind: 'all'
  id: 'all'
  scope: Scope
  targets: CountryFeature[]
  /** In the order named */
  found: CountryFeature[]
  /** Feedback on the last name typed */
  last: {
    country: CountryFeature
    result: 'found' | 'again' | 'elsewhere' | 'territory'
    /** The name typed, when it isn't the usual one */
    alias: string | null
  } | null
  startedAt: number
  endedAt: number | null
  finished: boolean
  gaveUp: boolean
}

const allCountries = countries.filter((c) => c.properties.kind === 'country')

export const countriesIn = (scope: Scope) =>
  scope === 'world' ? allCountries : allCountries.filter((c) => c.properties.continent === scope)

/** The world, then each continent with countries */
export const SCOPES: Scope[] = ['world', ...CONTINENTS.filter((c) => countriesIn(c).length > 0)]

export const scopeLabel = (scope: Scope) => (scope === 'world' ? 'The whole world' : scope)

export function newAllGame(scope: Scope, now = Date.now()): AllGameState {
  return {
    kind: 'all',
    id: 'all',
    scope,
    targets: countriesIn(scope),
    found: [],
    last: null,
    startedAt: now,
    endedAt: null,
    finished: false,
    gaveUp: false,
  }
}

/** A country named. Repeats, territories and countries outside the scope don't count, but aren't held against you. */
export function nameCountry(
  game: AllGameState,
  country: CountryFeature,
  alias: string | null = null,
  now = Date.now(),
): AllGameState {
  if (game.finished) return game
  const feedback = (result: NonNullable<AllGameState['last']>['result']) => ({ country, result, alias })
  if (game.found.includes(country)) return { ...game, last: feedback('again') }
  if (country.properties.kind !== 'country') return { ...game, last: feedback('territory') }
  if (!game.targets.includes(country)) return { ...game, last: feedback('elsewhere') }
  const found = [...game.found, country]
  const finished = found.length === game.targets.length
  return { ...game, found, last: feedback('found'), finished, endedAt: finished ? now : null }
}

export function giveUpAll(game: AllGameState, now = Date.now()): AllGameState {
  return game.finished ? game : { ...game, finished: true, gaveUp: true, endedAt: now }
}

export const missingAll = (game: AllGameState) =>
  game.targets
    .filter((c) => !game.found.includes(c))
    .sort((a, b) => a.properties.name.localeCompare(b.properties.name))

/** "4:07" */
export function formatDuration(ms: number) {
  const seconds = Math.floor(ms / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}
