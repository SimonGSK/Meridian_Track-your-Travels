import { describe, expect, it } from 'vitest'
import {
  DAILY_KINDS,
  dayKey,
  isDailyResults,
  newDailyGame,
  seededRandom,
  shareText,
  shiftDay,
  squaresOf,
  streaksOf,
} from './daily'
import { answer, currentRound, dontKnow, gamePool, kindOf, maxScore, next, type RoundGameState } from './games'
import { capitalOf } from '../data/capitals'
import { flagUrl } from '../flags'

/** Plays every round: `play(i)` gives a round's answer, as the country picked, or null for "I don't know" */
function play(game: RoundGameState, pick: (game: RoundGameState, i: number) => RoundGameState) {
  for (let i = 0; i < game.rounds.length; i++) game = next(pick(game, i))
  return game
}
const right = (game: RoundGameState) => answer(game, currentRound(game).target)
const wrong = (game: RoundGameState) => answer(game, currentRound(game).options.find((o) => o !== currentRound(game).target) ?? gamePool('find', 'easy').find((c) => c !== currentRound(game).target)!)

describe('the daily challenge', () => {
  it('is the same for everyone on a day, and different the next', () => {
    const today = newDailyGame('2026-10-05')
    expect(newDailyGame('2026-10-05').rounds).toEqual(today.rounds)
    expect(newDailyGame('2026-10-06').rounds.map((r) => r.target)).not.toEqual(today.rounds.map((r) => r.target))
    expect(seededRandom('2026-10-05')()).toBe(seededRandom('2026-10-05')())
  })

  it('has one round of each quiz, about five different countries', () => {
    const game = newDailyGame('2026-10-05')
    expect(game.rounds.map((r) => r.kind)).toEqual(DAILY_KINDS)
    expect(new Set(game.rounds.map((r) => r.target)).size).toBe(5)
    expect(flagUrl(game.rounds[1].target)).toBeTruthy()
    expect(capitalOf(game.rounds[2].target)).toBeTruthy()
  })

  it('finds the first on the globe, and picks the others from four answers including the right one', () => {
    const game = newDailyGame('2026-10-05')
    expect(game.rounds[0].options).toEqual([])
    for (const round of game.rounds.slice(1)) {
      expect(round.options).toHaveLength(4)
      expect(round.options).toContain(round.target)
    }
  })

  it('scores out of 7: up to 3 for finding the country, 1 for each of the others', () => {
    const game = newDailyGame('2026-10-05')
    expect(maxScore(game)).toBe(7)
    expect(kindOf(game)).toBe('find')
    const perfect = play(game, right)
    expect(perfect).toMatchObject({ finished: true, score: 7, scores: [3, 1, 1, 1, 1] })
  })

  it('gives a square for each round: green, yellow or orange for a later try, red', () => {
    const game = newDailyGame('2026-10-07')
    const played = play(game, (g, i) => {
      if (i === 0) return right(wrong(g)) // found on the second try
      if (i === 3) return dontKnow(g)
      return i === 4 ? wrong(g) : right(g)
    })
    expect(played.scores).toEqual([2, 1, 1, 0, 0])
    expect(squaresOf(played)).toBe('🟨🟩🟩🟥🟥')
    expect(shareText('2026-10-07', { score: 4, max: 7, squares: squaresOf(played) })).toBe('Meridian daily · 7 Oct 2026 · 4/7\n🟨🟩🟩🟥🟥')
  })

  it('counts days by the local date', () => {
    expect(dayKey(new Date(2026, 9, 5, 23, 59))).toBe('2026-10-05')
    expect(shiftDay('2026-10-31', 1)).toBe('2026-11-01')
    expect(shiftDay('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('counts the days in a row, up to today or yesterday, and the longest run', () => {
    const result = { score: 5, max: 7, squares: '' }
    const results = Object.fromEntries(['2026-09-20', '2026-09-21', '2026-09-22', '2026-10-03', '2026-10-04'].map((d) => [d, result]))
    expect(streaksOf(results, '2026-10-05')).toEqual({ current: 2, best: 3, played: 5 }) // today's not played yet
    expect(streaksOf({ ...results, '2026-10-05': result }, '2026-10-05').current).toBe(3)
    expect(streaksOf(results, '2026-10-07').current).toBe(0) // a day missed
    expect(streaksOf({}, '2026-10-05')).toEqual({ current: 0, best: 0, played: 0 })
  })

  it('checks what was saved', () => {
    expect(isDailyResults({ '2026-10-05': { score: 5, max: 7, squares: '🟩' } })).toBe(true)
    expect(isDailyResults({ yesterday: { score: 5, max: 7, squares: '' } })).toBe(false)
    expect(isDailyResults({ '2026-10-05': { score: '5' } })).toBe(false)
  })
})
