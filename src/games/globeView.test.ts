import { describe, expect, it } from 'vitest'
import { countries } from '../countries'
import { CLASSIC } from '../globe/themes'
import { answer, dontKnow, newRoundGame, next, stopEarly, type RoundGameId } from './games'
import { LETTER_HUNT_RINGS, TINY_COUNTRIES, flightTarget, gameHighlights, gameRings, globeAnswers, isPlaying, overviewKey, showsGame } from './globeView'
import { giveUp, newLetterGame, pickCountry } from './letterGame'
import { giveUpAll, nameCountry, newAllGame } from './allGame'
import { guess, newHigherLower } from './higherLower'

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
    expect(gameRings(null, true)).toBeNull()
  })
})

describe('round games', () => {
  it('ring only countries, as territories are no part of the games', () => {
    const ringed = TINY_COUNTRIES.map((c) => c.properties.name)
    expect(ringed).toEqual(expect.arrayContaining(['Nauru', 'Monaco', 'Vatican City']))
    for (const name of ['Gibraltar', 'Bermuda', 'Saint Barthélemy']) expect(ringed).not.toContain(name)
    expect(gameRings(round('find'), true)).toBe(TINY_COUNTRIES)
    expect(gameRings(round('flags'), false)).toEqual([])
    // Back to the usual rings once the game is over
    expect(gameRings(stopEarly(round('flags')), true)).toBeNull()
  })

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

  it("shows the answer after \"I don't know\", and flies there", () => {
    const game = dontKnow(round('find'))
    const target = game.rounds[0].target
    expect(names(gameHighlights(game, CLASSIC))).toEqual({ [target.properties.name]: CLASSIC.correct })
    expect(flightTarget(game)).toBe(target)
  })

  it('shows every miss in "find the country" while you keep trying', () => {
    const game = round('find')
    const target = game.rounds[0].target
    const [first, second] = pool.filter((c) => c !== target)
    const missed = answer(answer(game, first), second)
    expect(names(gameHighlights(missed, CLASSIC))).toEqual({
      [first.properties.name]: CLASSIC.wrong,
      [second.properties.name]: CLASSIC.wrong,
    })
    expect(flightTarget(missed)).toBeNull() // keep searching where you are
    expect(globeAnswers(missed)).toBe(true)
    const found = answer(missed, target)
    expect(names(gameHighlights(found, CLASSIC))[target.properties.name]).toBe(CLASSIC.correct)
    expect(flightTarget(found)).toBe(target)
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
  const kGame = () => newLetterGame('K')

  it('is answered on the globe, starting zoomed out', () => {
    expect(globeAnswers(kGame())).toBe(true)
    expect(overviewKey(kGame())).toBe('letter-K')
  })

  it('shows countries found, and the last wrong click', () => {
    const game = pickCountry(pickCountry(kGame(), byName('Kenya')), byName('Denmark'))
    expect(names(gameHighlights(game, CLASSIC))).toEqual({ Kenya: CLASSIC.correct, Denmark: CLASSIC.wrong })
  })

  it('does not mark a territory clicked as wrong', () => {
    const game = pickCountry(pickCountry(kGame(), byName('Kenya')), byName('Greenland'))
    expect(names(gameHighlights(game, CLASSIC))).toEqual({ Kenya: CLASSIC.correct })
  })

  it('rings every small island country and tiny country, while playing and on the results', () => {
    const ringed = LETTER_HUNT_RINGS.map((c) => c.properties.name)
    expect(ringed).toEqual(expect.arrayContaining(['Nauru', 'Kiribati', 'Fiji', 'Vanuatu', 'Bahamas', 'Jamaica', 'Cabo Verde']))
    expect(ringed).toEqual(expect.arrayContaining(['Vatican City', 'Monaco', 'San Marino'])) // tiny, though not islands
    // Not territories, which don't count, nor islands big enough to see, nor countries with a land border
    for (const name of ['Gibraltar', 'Bermuda', 'Taiwan', 'Sri Lanka', 'Cuba', 'Haiti', 'Timor-Leste', 'Brazil']) {
      expect(ringed).not.toContain(name)
    }
    expect(gameRings(kGame(), false)).toBe(LETTER_HUNT_RINGS) // even with the rings switched off
    expect(gameRings(giveUp(kGame()), true)).toBe(LETTER_HUNT_RINGS)
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

describe('capital quiz', () => {
  it('lights up the country asked about and flies there, then shows the answer', () => {
    const game = round('capital')
    const { target } = game.rounds[0]
    expect(names(gameHighlights(game, CLASSIC))).toEqual({ [target.properties.name]: CLASSIC.selected })
    expect(flightTarget(game)).toBe(target)
    expect(globeAnswers(game)).toBe(false)
    expect(names(gameHighlights(answer(game, target), CLASSIC))).toEqual({ [target.properties.name]: CLASSIC.correct })
  })
})

describe('higher or lower', () => {
  const pair = () => ({ ...newHigherLower('people', () => 0.5), known: byName('Japan'), next: byName('Brazil') })

  it('lights up the country to beat and the one to guess about, flying to the latter', () => {
    const game = pair()
    expect(names(gameHighlights(game, CLASSIC))).toEqual({ Japan: CLASSIC.selected, Brazil: CLASSIC.flight })
    expect(flightTarget(game)).toBe(byName('Brazil'))
    expect(overviewKey(game)).toBeNull()
    expect(globeAnswers(game)).toBe(false)
  })

  it('colors the guess right or wrong, and keeps the pair it ended on for the results', () => {
    // Brazil has more people than Japan
    expect(names(gameHighlights(guess(pair(), 'more'), CLASSIC)).Brazil).toBe(CLASSIC.correct)
    const over = guess(pair(), 'fewer')
    expect(over.finished).toBe(true)
    expect(showsGame(over)).toBe(true)
    expect(names(gameHighlights(over, CLASSIC)).Brazil).toBe(CLASSIC.wrong)
    expect(flightTarget(over)).toBeNull()
  })
})

describe('name them all', () => {
  it('lights up countries as they are named, without moving the camera', () => {
    const game = nameCountry(newAllGame('world'), byName('Kenya'))
    expect(names(gameHighlights(game, CLASSIC))).toEqual({ Kenya: CLASSIC.correct })
    expect(flightTarget(game)).toBeNull()
    expect(globeAnswers(game)).toBe(false) // you type the answers
    expect(overviewKey(game)).toBe('all-world')
  })

  it('shows what was missed on the results', () => {
    const game = giveUpAll(nameCountry(newAllGame('Oceania'), byName('Fiji')))
    expect(showsGame(game)).toBe(true)
    const colors = names(gameHighlights(game, CLASSIC))
    expect(colors.Fiji).toBe(CLASSIC.correct)
    expect(colors.Australia).toBe(CLASSIC.selected)
    expect(Object.keys(colors)).toHaveLength(14)
  })
})
