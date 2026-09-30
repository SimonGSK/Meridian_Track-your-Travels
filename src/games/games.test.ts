import { describe, expect, it } from 'vitest'
import { countries } from '../countries'
import { flagUrl } from '../flags'
import {
  MAX_TRIES,
  OPTION_COUNT,
  ROUNDS,
  answer,
  answerMode,
  currentRound,
  difficultyDescription,
  gamePool,
  maxScore,
  newRoundGame,
  next,
  shuffle,
  type Difficulty,
} from './games'

const byName = (name: string) => countries.find((c) => c.properties.name === name)!
const names = (list: { properties: { name: string } }[]) => list.map((c) => c.properties.name)

/** Deterministic pseudo-random numbers */
function seeded(seed = 1) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
}

describe('gamePool', () => {
  it('only asks about countries, never territories', () => {
    for (const d of ['easy', 'medium', 'hard'] as Difficulty[]) {
      expect(gamePool('find', d).every((c) => c.properties.kind === 'country')).toBe(true)
    }
    expect(names(gamePool('find', 'hard'))).not.toContain('Greenland')
    expect(names(gamePool('find', 'hard'))).not.toContain('Antarctica')
  })

  it('grows with difficulty: big countries, then all but the tiniest, then all 197', () => {
    const [easy, medium, hard] = (['easy', 'medium', 'hard'] as const).map((d) => names(gamePool('find', d)))
    expect(easy.length).toBeLessThan(medium.length)
    expect(medium.length).toBeLessThan(hard.length)
    expect(hard).toHaveLength(197)
    expect(easy).toContain('Brazil')
    expect(easy).not.toContain('Denmark')
    expect(medium).toContain('Denmark')
    expect(medium).not.toContain('Grenada')
    expect(hard).toContain('Grenada')
    expect(hard).toContain('Tuvalu')
  })

  it('only asks about flags that exist', () => {
    expect(gamePool('flags', 'hard').every((c) => flagUrl(c))).toBe(true)
  })
})

describe('answerMode', () => {
  it('picks from four answers on easy, and types them on medium and hard', () => {
    expect(answerMode('flags', 'easy')).toBe('choices')
    expect(answerMode('shape', 'medium')).toBe('typing')
    expect(answerMode('name', 'hard')).toBe('typing')
  })

  it('always answers "find" and the letter hunt on the globe', () => {
    for (const d of ['easy', 'medium', 'hard'] as Difficulty[]) {
      expect(answerMode('find', d)).toBe('globe')
      expect(answerMode('letter', d)).toBe('globe')
    }
  })
})

describe('shuffle', () => {
  it('keeps every item exactly once, without changing the original', () => {
    const items = [1, 2, 3, 4, 5, 6]
    expect(shuffle(items, seeded()).sort()).toEqual(items)
    expect(items).toEqual([1, 2, 3, 4, 5, 6])
  })
})

describe('newRoundGame', () => {
  it(`has ${ROUNDS} rounds about different countries from the pool`, () => {
    const game = newRoundGame('find', 'medium', seeded())
    expect(game.rounds).toHaveLength(ROUNDS)
    expect(new Set(game.rounds.map((r) => r.target)).size).toBe(ROUNDS)
    const pool = gamePool('find', 'medium')
    for (const round of game.rounds) expect(pool).toContain(round.target)
    expect(game).toMatchObject({ kind: 'rounds', difficulty: 'medium', index: 0, score: 0, answer: null, misses: [], finished: false })
  })

  it('gives easy rounds four distinct choices including the answer', () => {
    for (const round of newRoundGame('shape', 'easy', seeded()).rounds) {
      expect(round.options).toHaveLength(OPTION_COUNT)
      expect(new Set(round.options).size).toBe(OPTION_COUNT)
      expect(round.options).toContain(round.target)
    }
  })

  it('has no choices when answers are typed or clicked', () => {
    expect(newRoundGame('flags', 'hard', seeded()).rounds.every((r) => r.options.length === 0)).toBe(true)
    expect(newRoundGame('find', 'easy', seeded()).rounds.every((r) => r.options.length === 0)).toBe(true)
  })

  it('differs between games', () => {
    const a = newRoundGame('find', 'hard', seeded(1)).rounds.map((r) => r.target)
    const b = newRoundGame('find', 'hard', seeded(2)).rounds.map((r) => r.target)
    expect(a).not.toEqual(b)
  })
})

describe('difficultyDescription', () => {
  it('says which countries, and how to answer', () => {
    expect(difficultyDescription('flags', 'easy')).toBe('Big countries. Pick from four answers.')
    expect(difficultyDescription('shape', 'hard')).toBe('All 197 countries, even the tiniest. Type your answers.')
    expect(difficultyDescription('find', 'medium')).toBe('All but the smallest countries.')
  })
})

describe('find the country: tries and points', () => {
  const pool = ['Denmark', 'France', 'Brazil', 'Japan', 'Kenya'].map(byName)
  const start = () => newRoundGame('find', 'medium', seeded(), pool)
  const wrongOnes = (game: ReturnType<typeof start>) => pool.filter((c) => c !== currentRound(game).target)

  it(`gives ${MAX_TRIES} points for the first try`, () => {
    const game = start()
    const after = answer(game, currentRound(game).target)
    expect(after.answer).toEqual({ picked: currentRound(game).target, correct: true, alias: null, points: 3 })
    expect(after.score).toBe(3)
  })

  it('lets you try again after a miss, for fewer points', () => {
    const game = start()
    const [first, second] = wrongOnes(game)
    const missedOnce = answer(game, first)
    expect(missedOnce.answer).toBeNull()
    expect(missedOnce.misses).toEqual([first])
    expect(answer(missedOnce, currentRound(game).target).answer?.points).toBe(2)
    const missedTwice = answer(missedOnce, second)
    expect(answer(missedTwice, currentRound(game).target).answer?.points).toBe(1)
  })

  it(`ends the round with no points after ${MAX_TRIES} misses`, () => {
    let game = start()
    for (const wrong of wrongOnes(game).slice(0, MAX_TRIES)) game = answer(game, wrong)
    expect(game.answer).toMatchObject({ correct: false, points: 0 })
    expect(game.misses).toHaveLength(MAX_TRIES)
    expect(game.score).toBe(0)
  })

  it('does not count the same wrong country twice', () => {
    const game = start()
    const [wrong] = wrongOnes(game)
    const once = answer(game, wrong)
    expect(answer(once, wrong)).toBe(once)
  })

  it('clears the misses for the next round', () => {
    const game = start()
    const [wrong] = wrongOnes(game)
    const next1 = next(answer(answer(game, wrong), currentRound(game).target))
    expect(next1.misses).toEqual([])
  })

  it(`is out of ${MAX_TRIES} points per round`, () => {
    expect(maxScore(start())).toBe(pool.length * MAX_TRIES)
  })
})

describe('playing rounds', () => {
  const pool = ['Denmark', 'France', 'Brazil', 'Japan', 'Kenya'].map(byName)
  const start = () => newRoundGame('shape', 'medium', seeded(), pool.slice(0, 2))

  it('scores a correct answer with 1 point, outside "find the country"', () => {
    const game = start()
    const after = answer(game, currentRound(game).target)
    expect(after.answer).toEqual({ picked: currentRound(game).target, correct: true, alias: null, points: 1 })
    expect(after.score).toBe(1)
    expect(maxScore(game)).toBe(2)
  })

  it('remembers an alternative name that was typed', () => {
    const game = newRoundGame('shape', 'hard', seeded(), [byName('Eswatini')])
    expect(answer(game, byName('Eswatini'), 'Swaziland').answer).toMatchObject({ correct: true, alias: 'Swaziland' })
  })

  it('ends the round on a wrong answer, with no second try', () => {
    const game = start()
    const wrong = pool.find((c) => c !== currentRound(game).target)!
    const after = answer(game, wrong)
    expect(after.answer).toMatchObject({ correct: false, points: 0 })
    expect(after.score).toBe(0)
  })

  it('ignores a second answer to the same round', () => {
    const game = answer(start(), byName('Kenya'))
    expect(answer(game, currentRound(game).target)).toBe(game)
  })

  it('only moves on once the round is answered', () => {
    const game = start()
    expect(next(game)).toBe(game)
    expect(next(answer(game, currentRound(game).target))).toMatchObject({ index: 1, answer: null, score: 1 })
  })

  it('finishes after the last round', () => {
    let game = start()
    for (let i = 0; i < game.rounds.length; i++) game = next(answer(game, currentRound(game).target))
    expect(game.finished).toBe(true)
    expect(game.score).toBe(2)
    expect(answer(game, pool[0])).toBe(game)
  })
})
