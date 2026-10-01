import { countriesIn } from '../games/allGame'
import { DIFFICULTIES, maxScoreFor, type GameId } from '../games/games'
import { countriesStartingWith, lettersOf } from '../games/letterGame'
import { bestKey, letterKey, scopeKey, type BestScores } from '../games/useGame'

const TAGLINES: Record<GameId, string> = {
  find: 'Point it out',
  letter: 'A to Z',
  all: 'From memory',
  flags: 'Spot the flag',
  name: 'Read the globe',
  shape: 'Outline only',
}

const LETTERS = (['easy', 'medium', 'hard'] as const).flatMap(lettersOf)

/** What's next to a game: your best ("Best 82%", "12 / 197"), or what it's about */
export function gameSummary(id: GameId, best: BestScores) {
  if (id === 'all') {
    const named = best[scopeKey('world')]
    return named === undefined ? TAGLINES.all : `${named} / ${countriesIn('world').length}`
  }
  if (id === 'letter') {
    const done = LETTERS.filter((l) => best[letterKey(l)] === countriesStartingWith(l).length).length
    return LETTERS.some((l) => best[letterKey(l)] !== undefined) ? `${done} / ${LETTERS.length} letters` : TAGLINES.letter
  }
  const shares = DIFFICULTIES.flatMap((d) => {
    const score = best[bestKey(id, d.id)]
    return score === undefined ? [] : [score / maxScoreFor(id, d.id)]
  })
  return shares.length ? `Best ${Math.round(Math.max(...shares) * 100)}%` : TAGLINES[id]
}
