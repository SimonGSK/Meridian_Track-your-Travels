import { describe, expect, it } from 'vitest'
import { countries } from '../countries'
import { flagUrl } from '../flags'
import { OPTION_COUNT, ROUNDS, answer, currentRound, gamePool, newGame, next, shuffle } from './games'

const byName = (name: string) => countries.find((c) => c.properties.name === name)!

/** Deterministic pseudo-random numbers */
function seeded(seed = 1) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
}

describe('gamePool', () => {
  it('leaves out countries too small to click and places without ISO codes', () => {
    const pool = gamePool('find').map((c) => c.properties.name)
    expect(pool).toContain('Denmark')
    expect(pool).toContain('Brazil')
    expect(pool).not.toContain('Luxembourg')
    expect(pool).not.toContain('Vatican')
    expect(pool).not.toContain('Somaliland')
    expect(pool.length).toBeGreaterThan(150)
  })

  it('only asks about flags that exist', () => {
    const pool = gamePool('flags')
    expect(pool.every((c) => flagUrl(c))).toBe(true)
    expect(pool.map((c) => c.properties.name)).toContain('Luxembourg')
  })
})

describe('shuffle', () => {
  it('keeps every item exactly once', () => {
    const items = [1, 2, 3, 4, 5, 6]
    expect(shuffle(items, seeded()).sort()).toEqual(items)
  })

  it('does not change the original', () => {
    const items = [1, 2, 3]
    shuffle(items, seeded())
    expect(items).toEqual([1, 2, 3])
  })
})

describe('newGame', () => {
  it(`has ${ROUNDS} rounds about different countries`, () => {
    const game = newGame('find', seeded())
    expect(game.rounds).toHaveLength(ROUNDS)
    expect(new Set(game.rounds.map((r) => r.target)).size).toBe(ROUNDS)
    expect(game).toMatchObject({ index: 0, score: 0, answer: null, finished: false })
  })

  it('has no answer choices when you answer on the globe', () => {
    expect(newGame('find', seeded()).rounds.every((r) => r.options.length === 0)).toBe(true)
  })

  it.each(['flags', 'name'] as const)('gives %s rounds distinct choices including the answer', (id) => {
    for (const round of newGame(id, seeded()).rounds) {
      expect(round.options).toHaveLength(OPTION_COUNT)
      expect(new Set(round.options).size).toBe(OPTION_COUNT)
      expect(round.options).toContain(round.target)
    }
  })

  it('puts the answer in different positions', () => {
    const positions = new Set(
      newGame('flags', seeded(7)).rounds.map((r) => r.options.indexOf(r.target)),
    )
    expect(positions.size).toBeGreaterThan(1)
  })

  it('differs between games', () => {
    const a = newGame('find', seeded(1)).rounds.map((r) => r.target)
    const b = newGame('find', seeded(2)).rounds.map((r) => r.target)
    expect(a).not.toEqual(b)
  })
})

describe('playing', () => {
  const pool = ['Denmark', 'France', 'Brazil', 'Japan', 'Kenya'].map(byName)
  const start = () => newGame('find', seeded(), pool.slice(0, 2))

  it('scores a correct answer', () => {
    const game = start()
    const after = answer(game, currentRound(game).target)
    expect(after.answer).toEqual({ picked: currentRound(game).target, correct: true })
    expect(after.score).toBe(1)
  })

  it('does not score a wrong answer', () => {
    const game = start()
    const wrong = pool.find((c) => c !== currentRound(game).target)!
    const after = answer(game, wrong)
    expect(after.answer?.correct).toBe(false)
    expect(after.score).toBe(0)
  })

  it('ignores a second answer to the same round', () => {
    const game = answer(start(), byName('Kenya'))
    expect(answer(game, currentRound(game).target)).toBe(game)
  })

  it('only moves on once the round is answered', () => {
    const game = start()
    expect(next(game)).toBe(game)
    const second = next(answer(game, currentRound(game).target))
    expect(second).toMatchObject({ index: 1, answer: null, score: 1 })
  })

  it('finishes after the last round', () => {
    let game = start()
    for (let i = 0; i < game.rounds.length; i++) game = next(answer(game, currentRound(game).target))
    expect(game.finished).toBe(true)
    expect(game.score).toBe(2)
    expect(answer(game, pool[0])).toBe(game)
  })
})
