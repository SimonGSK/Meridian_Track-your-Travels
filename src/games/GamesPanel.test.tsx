import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GamesPanel from './GamesPanel'
import { answer, newRoundGame, next, type Difficulty, type RoundGameId, type RoundGameState } from './games'
import { giveUp, newLetterGame, pickCountry, type LetterGameState } from './letterGame'
import { countries } from '../countries'

const byName = (name: string) => countries.find((c) => c.properties.name === name)!
const pool = ['Denmark', 'France', 'Brazil', 'Japan', 'Kenya'].map(byName)
const roundGame = (id: RoundGameId, difficulty: Difficulty = 'easy') => newRoundGame(id, difficulty, () => 0.5, pool)

function setup(overrides: Partial<Parameters<typeof GamesPanel>[0]> = {}) {
  const props = {
    game: null,
    best: {},
    previousBest: undefined,
    onStart: vi.fn(),
    onPick: vi.fn(),
    onNext: vi.fn(),
    onQuit: vi.fn(),
    ...overrides,
  }
  render(<GamesPanel {...props} />)
  return props
}

describe('GamesPanel: choosing a game', () => {
  it('lists every game, without asking for a difficulty yet', () => {
    setup()
    for (const title of ['Find the country', 'Letter hunt', 'Flag quiz', 'Name that country', 'Shape quiz']) {
      expect(screen.getByRole('button', { name: new RegExp(title) })).toBeInTheDocument()
    }
    expect(screen.queryByRole('button', { name: /^Easy/ })).not.toBeInTheDocument()
  })

  it('asks for the difficulty after choosing a game, then starts it', async () => {
    const { onStart } = setup()
    await userEvent.click(screen.getByRole('button', { name: /Shape quiz/ }))
    expect(screen.getByRole('heading', { name: 'Shape quiz' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Easy/ })).toHaveTextContent('Pick from four answers')
    expect(screen.getByRole('button', { name: /^Hard/ })).toHaveTextContent('Type your answers')
    await userEvent.click(screen.getByRole('button', { name: /^Medium/ }))
    expect(onStart).toHaveBeenCalledWith('shape', 'medium')
  })

  it('explains the tries in "find the country"', async () => {
    setup()
    await userEvent.click(screen.getByRole('button', { name: /Find the country/ }))
    expect(screen.getByText(/3 tries per country/)).toBeInTheDocument()
  })

  it('shows the best score for each difficulty', async () => {
    setup({ best: { 'flags:hard': 7, 'find-points:easy': 24, 'letter:medium': 85 } })
    await userEvent.click(screen.getByRole('button', { name: /Flag quiz/ }))
    expect(screen.getByRole('button', { name: /^Hard/ })).toHaveTextContent('Best: 7 / 10')
    expect(screen.getByRole('button', { name: /^Easy/ })).not.toHaveTextContent('Best')
    await userEvent.click(screen.getByRole('button', { name: '← All games' }))
    await userEvent.click(screen.getByRole('button', { name: /Find the country/ }))
    expect(screen.getByRole('button', { name: /^Easy/ })).toHaveTextContent('Best: 24 / 30 points')
    await userEvent.click(screen.getByRole('button', { name: '← All games' }))
    await userEvent.click(screen.getByRole('button', { name: /Letter hunt/ }))
    expect(screen.getByRole('button', { name: /^Medium/ })).toHaveTextContent('Best: 85%')
  })
})

describe('GamesPanel: rounds', () => {
  it('asks you to find a named country, with no answer buttons', () => {
    const g = roundGame('find')
    setup({ game: g })
    expect(screen.getByText('Find this country on the globe')).toBeInTheDocument()
    expect(screen.getByText(g.rounds[0].target.properties.name)).toBeInTheDocument()
    expect(screen.getByText('Round 1 of 5')).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('shows the flag to identify, with four choices on easy', async () => {
    const g = roundGame('flags')
    const { onPick } = setup({ game: g })
    expect(screen.getByRole('img', { name: 'The flag to identify' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: g.rounds[0].options[2].properties.name }))
    expect(onPick).toHaveBeenCalledWith(g.rounds[0].options[2])
  })

  it('shows only the outline in the shape quiz', () => {
    setup({ game: roundGame('shape') })
    expect(screen.getByRole('img', { name: 'The outline to identify' })).toBeInTheDocument()
  })

  it('does not reveal the country in "name that country"', () => {
    setup({ game: roundGame('name') })
    expect(screen.getByText('Which country is highlighted on the globe?')).toBeInTheDocument()
  })

  it('asks for typed answers on medium and hard', async () => {
    const { onPick } = setup({ game: roundGame('shape', 'medium') })
    expect(screen.queryAllByRole('button', { name: /^(Denmark|France|Brazil|Japan|Kenya)$/ })).toHaveLength(0)
    await userEvent.type(screen.getByRole('combobox'), 'Swaziland{Enter}')
    expect(onPick).toHaveBeenCalledWith(byName('Eswatini'), 'Swaziland')
  })

  it('shows the new name when an old one was typed', () => {
    const g = newRoundGame('shape', 'hard', () => 0.5, [byName('Eswatini')])
    setup({ game: answer(g, byName('Eswatini'), 'Swaziland') })
    expect(screen.getByRole('status')).toHaveTextContent('Correct: Eswatini (you wrote Swaziland)')
  })

  it('says what was picked and what was right after a wrong answer, and lets you continue', async () => {
    const g = roundGame('shape', 'medium')
    const { target } = g.rounds[0]
    const wrong = pool.find((c) => c !== target)!
    const { onNext } = setup({ game: answer(g, wrong) })
    expect(screen.getByRole('status')).toHaveTextContent(
      `That's ${wrong.properties.name}. The answer is ${target.properties.name}.`,
    )
    expect(screen.getByRole('button', { name: 'Next' })).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    expect(onNext).toHaveBeenCalled()
  })

  it('lets you try again after a miss in "find the country", for fewer points', () => {
    const g = roundGame('find')
    const [wrong] = pool.filter((c) => c !== g.rounds[0].target)
    setup({ game: answer(g, wrong) })
    expect(screen.getByRole('status')).toHaveTextContent(`That's ${wrong.properties.name}. Try again: 2 tries left.`)
    expect(screen.getByLabelText('Try 2 of 3')).toHaveTextContent('Worth 2 points')
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument()
  })

  it('shows the points won in "find the country"', () => {
    const g = roundGame('find')
    const [wrong] = pool.filter((c) => c !== g.rounds[0].target)
    setup({ game: answer(answer(g, wrong), g.rounds[0].target) })
    expect(screen.getByRole('status')).toHaveTextContent('Correct! +2 points')
    expect(screen.getByText('2 points')).toBeInTheDocument()
  })

  it('gives the answer after three misses', () => {
    let g = roundGame('find')
    for (const wrong of pool.filter((c) => c !== g.rounds[0].target).slice(0, 3)) g = answer(g, wrong)
    setup({ game: g })
    expect(screen.getByRole('status')).toHaveTextContent(`The answer is ${g.rounds[0].target.properties.name}.`)
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument()
  })

  it('marks the right and wrong choices', () => {
    const g = roundGame('flags')
    const { target, options } = g.rounds[0]
    const wrong = options.find((o) => o !== target)!
    setup({ game: answer(g, wrong) })
    expect(screen.getByRole('button', { name: target.properties.name })).toHaveClass('correct')
    expect(screen.getByRole('button', { name: wrong.properties.name })).toHaveClass('wrong')
    for (const option of options) expect(screen.getByRole('button', { name: option.properties.name })).toBeDisabled()
  })

  it('says "See results" on the last round', () => {
    let g: RoundGameState = roundGame('find')
    for (let i = 0; i < g.rounds.length - 1; i++) g = next(answer(g, g.rounds[g.index].target))
    setup({ game: answer(g, g.rounds[g.index].target) })
    expect(screen.getByRole('button', { name: 'See results' })).toBeInTheDocument()
  })

  it('shows the result and celebrates a new best score', async () => {
    let g: RoundGameState = roundGame('find')
    while (!g.finished) g = next(answer(g, g.rounds[g.index].target))
    const { onStart, onQuit } = setup({ game: g, previousBest: 3 })
    expect(screen.getByText('15 / 15')).toBeInTheDocument()
    expect(screen.getByText('points')).toBeInTheDocument()
    expect(screen.getByText('Perfect! A true geographer.')).toBeInTheDocument()
    expect(screen.getByText('New best score!')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Play again' }))
    expect(onStart).toHaveBeenCalledWith('find', 'easy')
    await userEvent.click(screen.getByRole('button', { name: 'All games' }))
    expect(onQuit).toHaveBeenCalled()
  })

  it('lets you quit mid-game', async () => {
    const { onQuit } = setup({ game: roundGame('name') })
    await userEvent.click(screen.getByRole('button', { name: 'Quit game' }))
    expect(onQuit).toHaveBeenCalled()
  })
})

describe('GamesPanel: letter hunt', () => {
  const kGame = (): LetterGameState => {
    for (let seed = 1; seed < 500; seed++) {
      let s = seed
      const g = newLetterGame('medium', () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646)
      if (g.letter === 'K') return g
    }
    throw new Error('no K')
  }

  it('shows the letter and how many are left', () => {
    const game = kGame()
    setup({ game })
    expect(screen.getByLabelText('the letter K')).toHaveTextContent('K')
    expect(screen.getByText(`Found 0 of ${game.targets.length}`)).toBeInTheDocument()
  })

  it('lists what was found and explains mistakes', () => {
    const game = pickCountry(pickCountry(kGame(), byName('Kenya')), byName('Denmark'))
    setup({ game })
    expect(screen.getByRole('list', { name: 'Found' })).toHaveTextContent('Kenya')
    expect(screen.getByRole('status')).toHaveTextContent("Denmark doesn't start with K.")
    expect(screen.getByText('1 mistake')).toBeInTheDocument()
  })

  it('says when a territory is clicked', () => {
    const g = newLetterGame('hard', () => 0)
    const territory = countries.find((c) => c.properties.kind === 'territory' && c.properties.name.startsWith(g.letter))
    if (!territory) return
    setup({ game: pickCountry(g, territory) })
    expect(screen.getByRole('status')).toHaveTextContent('is a territory, not a country')
  })

  it('can be given up', async () => {
    const { onNext } = setup({ game: kGame() })
    await userEvent.click(screen.getByRole('button', { name: 'Give up and show the rest' }))
    expect(onNext).toHaveBeenCalled()
  })

  it('shows what was missed on the results', () => {
    const game = giveUp(pickCountry(kGame(), byName('Kenya')))
    setup({ game })
    expect(screen.getByText(`1 / ${game.targets.length}`)).toBeInTheDocument()
    expect(screen.getByText(/Missed/)).toHaveTextContent('Kazakhstan')
  })
})
