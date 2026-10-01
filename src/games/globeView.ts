import type { CountryFeature } from '../countries'
import type { Theme } from '../globe/themes'
import { currentRound } from './games'
import { missing } from './letterGame'
import { missingAll } from './allGame'
import type { GameState } from './useGame'

const NONE: ReadonlyMap<CountryFeature, string> = new Map()

/** A game is running (not yet on its results screen) */
export const isPlaying = (game: GameState | null): game is GameState & { finished: false } => !!game && !game.finished

/** The globe shows the game: while playing, and for the letter hunt and "name them all" also on the results (what was missed) */
export const showsGame = (game: GameState | null) => isPlaying(game) || game?.kind === 'letter' || game?.kind === 'all'

/** You answer by clicking the globe: finding a country, or hunting for a letter */
export function globeAnswers(game: GameState | null) {
  if (!isPlaying(game)) return false
  return game.kind === 'letter' || (game.id === 'find' && !game.answer)
}

/** Countries colored by the game: answers, the country asked about, letter-hunt finds and misses */
export function gameHighlights(game: GameState | null, theme: Theme): ReadonlyMap<CountryFeature, string> {
  if (!game || !showsGame(game)) return NONE
  const colors = new Map<CountryFeature, string>()
  if (game.kind === 'all') {
    for (const country of game.found) colors.set(country, theme.correct)
    if (game.finished) for (const country of missingAll(game)) colors.set(country, theme.selected)
    return colors
  }
  if (game.kind === 'letter') {
    for (const country of game.found) colors.set(country, theme.correct)
    if (game.finished) for (const country of missing(game)) colors.set(country, theme.selected)
    else if (game.last?.result === 'wrong-letter') colors.set(game.last.country, theme.wrong)
    return colors
  }
  const { target } = currentRound(game)
  for (const miss of game.misses) colors.set(miss, theme.wrong)
  if (game.answer) {
    if (!game.answer.correct && game.answer.picked) colors.set(game.answer.picked, theme.wrong)
    colors.set(target, theme.correct)
  } else if (game.id === 'name') {
    colors.set(target, theme.selected)
  }
  return colors
}

/** Where the camera should go: the country asked about ("name that country"), or the answer once given */
export function flightTarget(game: GameState | null): CountryFeature | null {
  if (!isPlaying(game) || game.kind !== 'rounds') return null
  return game.answer || game.id === 'name' ? currentRound(game).target : null
}

/** Changes whenever the view should zoom out to show the whole globe: each "find" round and each letter hunt */
export function overviewKey(game: GameState | null): string | null {
  if (!isPlaying(game)) return null
  if (game.kind === 'letter') return `letter-${game.letter}`
  if (game.kind === 'all') return `all-${game.scope}`
  return game.id === 'find' && !game.answer ? `find-${game.index}` : null
}
