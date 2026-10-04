import { describe, expect, it } from 'vitest'
import { guess, higherLowerPool, isMore, newHigherLower, nextPair, valueOf } from './higherLower'
import { countries } from '../countries'

const byName = (name: string) => countries.find((c) => c.properties.name === name)!
const steady = () => 0.5

describe('higher or lower', () => {
  it('starts with a country to beat and another to guess about', () => {
    const game = newHigherLower('people', steady, 1000)
    expect(game).toMatchObject({ kind: 'higher', measure: 'people', streak: 0, answer: null, finished: false, startedAt: 1000 })
    expect(game.next).not.toBe(game.known)
    expect(game.seen).toEqual([game.known, game.next])
  })

  it('compares people, or area', () => {
    expect(valueOf(byName('India'), 'people')).toBeGreaterThan(1e9)
    expect(valueOf(byName('Russia'), 'area')).toBeGreaterThan(1.7e7)
    expect(higherLowerPool('people')).toHaveLength(197)
    expect(higherLowerPool('area')).toHaveLength(197)
  })

  it('counts a right guess, and the one guessed becomes the one to beat', () => {
    const start = { ...newHigherLower('area', steady), known: byName('Denmark'), next: byName('Brazil') }
    expect(isMore(start)).toBe(true)
    const right = guess(start, 'more')
    expect(right).toMatchObject({ streak: 1, answer: { guess: 'more', correct: true }, finished: false })
    expect(guess(right, 'fewer')).toBe(right) // one guess a pair
    const after = nextPair(right, steady)
    expect(after.known).toBe(byName('Brazil'))
    expect(after.next).not.toBe(byName('Brazil'))
    expect(after.answer).toBeNull()
    expect(after.seen).toContain(after.next)
  })

  it('ends the run at the first wrong guess, keeping the streak', () => {
    const start = { ...newHigherLower('people', steady, 0), known: byName('China'), next: byName('Iceland'), streak: 4 }
    const wrong = guess(start, 'more', 9000)
    expect(wrong).toMatchObject({ streak: 4, answer: { correct: false }, finished: true, endedAt: 9000 })
    expect(nextPair(wrong)).toBe(wrong)
  })

  it('never shows a country twice, nor one with the same figure', () => {
    let game = newHigherLower('people', Math.random)
    for (let i = 0; i < 50; i++) {
      game = nextPair(guess(game, isMore(game) ? 'more' : 'fewer'))
      expect(valueOf(game.next, 'people')).not.toBe(valueOf(game.known, 'people'))
    }
    expect(new Set(game.seen).size).toBe(game.seen.length)
    expect(game.streak).toBe(50)
  })

  it('is a perfect run once every country has been shown', () => {
    let game = newHigherLower('area', Math.random)
    while (!game.finished) game = nextPair(guess(game, isMore(game) ? 'more' : 'fewer'), Math.random, 5000)
    expect(game.streak).toBe(196)
    expect(game.endedAt).toBe(5000)
  })
})
