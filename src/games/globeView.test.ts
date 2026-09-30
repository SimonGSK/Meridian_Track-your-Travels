import { describe, expect, it } from 'vitest'
import { countries } from '../countries'
import { CLASSIC } from '../globe/themes'
import { answer, newRoundGame, next, type RoundGameId } from './games'
import { flightTarget, gameHighlights, globeAnswers, isPlaying, overviewKey, showsGame } from './globeView'
import { giveUp, newLetterGame, pickCountry } from './letterGame'

const byName = (name: string) => countries.find((c) => c.properties.name === name)!
const pool = ['Denmark', 'France', 'Brazil', 'Japan', 'Kenya'].map(byName)
const round = (id: RoundGameId) => newRoundGame(id, 'easy', () => 0.5, pool)
const names = (map: ReadonlyMap<{ properties: { name: string } }, string>) =>
  Object.fromEntries([...map].map(([c, color]) => [c.properties.name, color]))

describe('without a game', () => {
  it('shows nothing', () => {
    expect(isPlaying(null)).toBe(false)
    expect(showsGame(null)).toBe(false)
    expect(globeAnswers(null)).toBe(false)
    expect(gameHighlights(null, CLASSIC).size).toBe(0)
    expect(flightTarget(null)).toBeNull()
    expect(overviewKey(null)).toBeNull()
  })
})

describe('round games', () => {
  it('highlights the country asked about in "name that country"', () => {
    const game = round('name')
    const target = game.rounds[0].target
    expect(names(gameHighlights(game, CLASSIC))).toEqual({ [target.properties.name]: CLASSIC.selected })
    expect(flightTarget(game)).toBe(target)
  })

  it('gives nothing away before answering the other games', () => {
    for (const id of ['find', 'flags', 'shape'] as const) {
      expect(gameHighlights(round(id), CLASSIC).size).toBe(0)
      expect(flightTarget(round(id))).toBeNull()
    }
  })

  it('shows the right answer, and a wrong pick, once answered, and flies there', () => {
    const game = round('shape')
    const target = game.rounds[0].target
    const wrong = pool.find((c) => c !== target)!
    const answered = answer(game, wrong)
    expect(names(gameHighlights(answered, CLASSIC))).toEqual({
      [wrong.properties.name]: CLASSIC.wrong,
      [target.properties.name]: CLASSIC.correct,
    })
    expect(flightTarget(answered)).toBe(target)
  })

  it('answers "find" on the globe until answered, starting each round zoomed out', () => {
    const game = round('find')
    expect(globeAnswers(game)).toBe(true)
    expect(overviewKey(game)).toBe('find-0')
    const answered = answer(game, game.rounds[0].target)
    expect(globeAnswers(answered)).toBe(false)
    expect(overviewKey(next(answered))).toBe('find-1')
    expect(globeAnswers(round('flags'))).toBe(false)
  })

  it('clears the globe on the results screen', () => {
    let game = round('flags')
    while (!game.finished) game = next(answer(game, game.rounds[game.index].target))
    expect(showsGame(game)).toBe(false)
    expect(gameHighlights(game, CLASSIC).size).toBe(0)
  })
})

describe('letter hunt', () => {
  const kGame = () => {
    for (let seed = 1; seed < 500; seed++) {
      let s = seed
      const g = newLetterGame('medium', () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646)
      if (g.letter === 'K') return g
    }
    throw new Error('no K')
  }

  it('is answered on the globe, starting zoomed out', () => {
    expect(globeAnswers(kGame())).toBe(true)
    expect(overviewKey(kGame())).toBe('letter-K')
  })

  it('shows countries found, and the last wrong click', () => {
    const game = pickCountry(pickCountry(kGame(), byName('Kenya')), byName('Denmark'))
    expect(names(gameHighlights(game, CLASSIC))).toEqual({ Kenya: CLASSIC.correct, Denmark: CLASSIC.wrong })
  })

  it('shows the missed countries on the results', () => {
    const game = giveUp(pickCountry(kGame(), byName('Kenya')))
    expect(showsGame(game)).toBe(true)
    expect(isPlaying(game)).toBe(false)
    const colors = names(gameHighlights(game, CLASSIC))
    expect(colors.Kenya).toBe(CLASSIC.correct)
    expect(colors.Kazakhstan).toBe(CLASSIC.selected)
  })
})
