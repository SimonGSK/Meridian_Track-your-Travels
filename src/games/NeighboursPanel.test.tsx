import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { countries } from '../countries'
import { NeighboursLevelChoice, NeighboursPlay, NeighboursResults } from './NeighboursPanel'
import { borderingCountries, nameNeighbour, newNeighboursGame, nextNeighbours, showRest, type NeighboursState } from './neighboursGame'

const byName = (name: string) => countries.find((c) => c.properties.name === name)!
function gameOf(...names: string[]): NeighboursState {
  const game = newNeighboursGame('easy', Math.random, 0)
  return { ...game, rounds: names.map((n) => ({ country: byName(n), neighbours: borderingCountries(byName(n)) })) }
}
function play(game: NeighboursState) {
  const props = { onPick: vi.fn(), onDontKnow: vi.fn(), onNext: vi.fn(), onQuit: vi.fn() }
  render(<NeighboursPlay game={game} {...props} />)
  return props
}
const feedback = () => screen.getByRole('status')

describe('NeighboursLevelChoice', () => {
  it('offers three levels, with the best share named', async () => {
    const onStart = vi.fn()
    render(<NeighboursLevelChoice best={{ 'neighbours:hard': 82 }} bestTimes={{}} onStart={onStart} onBack={vi.fn()} />)
    expect(screen.getByRole('button', { name: /^Easy/ })).toHaveTextContent('Big countries with up to four neighbours.')
    expect(screen.getByRole('button', { name: /^Hard/ })).toHaveTextContent('Best: 82% named')
    await userEvent.click(screen.getByRole('button', { name: /^Medium/ }))
    expect(onStart).toHaveBeenCalledWith('medium')
  })
})

describe('NeighboursPlay', () => {
  it('asks for the neighbours of a country, and takes names typed', async () => {
    const { onPick } = play(gameOf('Spain', 'Haiti'))
    expect(screen.getByText('Name every country bordering').nextElementSibling).toHaveTextContent('Spain')
    expect(screen.getByText('0 of 3 neighbours')).toBeInTheDocument()
    await userEvent.type(screen.getByRole('textbox', { name: 'A neighbour' }), 'Portugal{Enter}')
    expect(onPick).toHaveBeenCalledWith(byName('Portugal'), null)
  })

  it('says what became of a name, and lists the neighbours named', () => {
    let game = nameNeighbour(gameOf('Spain', 'Haiti'), byName('France'))
    game = nameNeighbour(game, byName('Italy'))
    play(game)
    expect(feedback()).toHaveTextContent("Italy doesn't border Spain.")
    expect(feedback()).toHaveClass('wrong')
    expect(screen.getByRole('list', { name: 'Named' })).toHaveTextContent('France')
    expect(screen.getByText('1 mistake')).toBeInTheDocument()
  })

  it('shows the rest when asked, and goes on to the next country', async () => {
    const { onDontKnow } = play(gameOf('Spain', 'Haiti'))
    await userEvent.click(screen.getByRole('button', { name: 'Show the rest' }))
    expect(onDontKnow).toHaveBeenCalled()
  })

  it('lists the neighbours missed once the round is over', () => {
    play(showRest(nameNeighbour(gameOf('Spain', 'Haiti'), byName('France'))))
    expect(feedback()).toHaveTextContent('2 neighbours missed, marked on the globe.')
    expect(screen.getByRole('list', { name: 'Missed' })).toHaveTextContent('AndorraPortugal')
    expect(screen.getByRole('button', { name: 'Next country' })).toHaveFocus()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('cheers every neighbour named, and ends with the results', () => {
    const game = nextNeighbours(nameNeighbour(gameOf('Haiti', 'Ireland'), byName('Dominican Republic')))
    play(nameNeighbour(game, byName('United Kingdom')))
    expect(feedback()).toHaveTextContent("All of Ireland's neighbours!")
    expect(screen.getByRole('button', { name: 'See results' })).toBeInTheDocument()
  })
})

describe('NeighboursResults', () => {
  it('shows the share named, each country, and a new best', () => {
    let game = nameNeighbour(gameOf('Haiti', 'Spain'), byName('Dominican Republic'))
    game = nextNeighbours(showRest(nameNeighbour(nextNeighbours(game), byName('France'))))
    render(<NeighboursResults game={game} previousBest={30} previousTime={undefined} onStart={vi.fn()} onAllGames={vi.fn()} />)
    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(screen.getByText('2 of 4 neighbours named, with 0 mistakes')).toBeInTheDocument()
    const rows = within(screen.getByRole('list', { name: 'Your countries' })).getAllByRole('listitem')
    expect(rows.map((r) => r.textContent)).toEqual(['Haiti1 / 1', 'Spain1 / 3'])
    expect(screen.getByText('New best score!')).toBeInTheDocument()
  })
})
