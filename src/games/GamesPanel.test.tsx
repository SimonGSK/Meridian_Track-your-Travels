import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GamesPanel from './GamesPanel'
import { answer, newGame, next, type GameState } from './games'
import { countries } from '../countries'

const pool = ['Denmark', 'France', 'Brazil', 'Japan', 'Kenya'].map(
  (name) => countries.find((c) => c.properties.name === name)!,
)
const game = (id: GameState['id']) => newGame(id, () => 0.5, pool)

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

describe('GamesPanel', () => {
  it('lists the games with best scores', async () => {
    const { onStart } = setup({ best: { flags: 7 } })
    expect(screen.getByRole('button', { name: /Find the country/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Name that country/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Flag quiz/ })).toHaveTextContent('Best: 7 / 10')
    await userEvent.click(screen.getByRole('button', { name: /Flag quiz/ }))
    expect(onStart).toHaveBeenCalledWith('flags')
  })

  it('asks you to find a named country, with no answer buttons', () => {
    const g = game('find')
    setup({ game: g })
    expect(screen.getByText('Find this country on the globe')).toBeInTheDocument()
    expect(screen.getByText(g.rounds[0].target.properties.name)).toBeInTheDocument()
    expect(screen.getByText('Round 1 of 5')).toBeInTheDocument()
  })

  it('shows the flag to identify and four choices', async () => {
    const g = game('flags')
    const { onPick } = setup({ game: g })
    expect(screen.getByRole('img', { name: 'The flag to identify' })).toBeInTheDocument()
    const option = screen.getByRole('button', { name: g.rounds[0].options[2].properties.name })
    await userEvent.click(option)
    expect(onPick).toHaveBeenCalledWith(g.rounds[0].options[2])
  })

  it('does not reveal the country in "name that country"', () => {
    const g = game('name')
    setup({ game: g })
    expect(screen.getByText('Which country is highlighted on the globe?')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^(Denmark|France|Brazil|Japan|Kenya)$/ })).toHaveLength(4)
  })

  it('shows feedback after a wrong answer and lets you continue', async () => {
    const g = game('find')
    const { target } = g.rounds[0]
    const wrong = pool.find((c) => c !== target)!
    const { onNext } = setup({ game: answer(g, wrong) })
    expect(screen.getByRole('status')).toHaveTextContent(
      `That's ${wrong.properties.name}. The answer is ${target.properties.name}.`,
    )
    const nextButton = screen.getByRole('button', { name: 'Next' })
    expect(nextButton).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    expect(onNext).toHaveBeenCalled()
  })

  it('marks the right and wrong choices', () => {
    const g = game('flags')
    const { target, options } = g.rounds[0]
    const wrong = options.find((o) => o !== target)!
    setup({ game: answer(g, wrong) })
    expect(screen.getByRole('button', { name: target.properties.name })).toHaveClass('correct')
    expect(screen.getByRole('button', { name: wrong.properties.name })).toHaveClass('wrong')
    for (const option of options) expect(screen.getByRole('button', { name: option.properties.name })).toBeDisabled()
  })

  it('says "See results" on the last round', () => {
    let g = game('find')
    for (let i = 0; i < g.rounds.length - 1; i++) g = next(answer(g, g.rounds[g.index].target))
    setup({ game: answer(g, g.rounds[g.index].target) })
    expect(screen.getByRole('button', { name: 'See results' })).toBeInTheDocument()
  })

  it('shows the result and celebrates a new best score', async () => {
    let g = game('find')
    while (!g.finished) g = next(answer(g, g.rounds[g.index].target))
    const { onStart, onQuit } = setup({ game: g, previousBest: 3 })
    expect(screen.getByText('5 / 5')).toBeInTheDocument()
    expect(screen.getByText('Perfect! A true geographer.')).toBeInTheDocument()
    expect(screen.getByText('New best score!')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Play again' }))
    expect(onStart).toHaveBeenCalledWith('find')
    await userEvent.click(screen.getByRole('button', { name: 'All games' }))
    expect(onQuit).toHaveBeenCalled()
  })

  it('lets you quit mid-game', async () => {
    const { onQuit } = setup({ game: game('name') })
    await userEvent.click(screen.getByRole('button', { name: 'Quit game' }))
    expect(onQuit).toHaveBeenCalled()
  })
})
