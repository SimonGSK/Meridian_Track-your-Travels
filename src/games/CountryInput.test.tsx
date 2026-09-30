import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CountryInput from './CountryInput'

function setup() {
  const onAnswer = vi.fn()
  render(<CountryInput onAnswer={onAnswer} />)
  const input = screen.getByRole('combobox', { name: 'Your answer' })
  const answered = () => onAnswer.mock.calls.map(([country, alias]) => [country.properties.name, alias])
  return { input, answered }
}

describe('CountryInput', () => {
  it('is ready to type in', () => {
    const { input } = setup()
    expect(input).toHaveFocus()
  })

  it('suggests countries as you type', async () => {
    const { input } = setup()
    await userEvent.type(input, 'nor')
    const options = screen.getAllByRole('option').map((o) => o.textContent)
    expect(options).toContain('Norway')
    expect(options).toContain('North Korea')
    expect(input).toHaveAttribute('aria-expanded', 'true')
  })

  it('does not suggest territories', async () => {
    const { input } = setup()
    await userEvent.type(input, 'greenl')
    expect(screen.queryAllByRole('option')).toHaveLength(0)
  })

  it('answers with a suggestion clicked', async () => {
    const { input, answered } = setup()
    await userEvent.type(input, 'norw')
    await userEvent.click(screen.getByRole('option', { name: 'Norway' }))
    expect(answered()).toEqual([['Norway', null]])
    expect(input).toHaveValue('')
  })

  it('answers with a suggestion chosen with the arrow keys', async () => {
    const { input, answered } = setup()
    await userEvent.type(input, 'nor{ArrowDown}{ArrowDown}')
    const second = screen.getAllByRole('option')[1]
    expect(second).toHaveAttribute('aria-selected', 'true')
    expect(input).toHaveAttribute('aria-activedescendant', second.id)
    await userEvent.keyboard('{Enter}')
    expect(answered()[0][0]).toBe(second.textContent)
  })

  it('takes an exact name on Enter, even when another suggestion comes first', async () => {
    const { input, answered } = setup()
    await userEvent.type(input, 'niger{Enter}')
    expect(answered()).toEqual([['Niger', null]])
  })

  it('takes the top suggestion for a partial name on Enter', async () => {
    const { input, answered } = setup()
    await userEvent.type(input, 'denm{Enter}')
    expect(answered()).toEqual([['Denmark', null]])
  })

  it.each([
    ['Swaziland', 'Eswatini'],
    ['East Timor', 'Timor-Leste'],
    ['Burma', 'Myanmar'],
  ])('accepts %s for %s, remembering the name used', async (typed, country) => {
    const { input, answered } = setup()
    await userEvent.type(input, `${typed}{Enter}`)
    expect(answered()).toEqual([[country, typed]])
  })

  it('shows which old name a suggestion matched', async () => {
    const { input } = setup()
    await userEvent.type(input, 'swazi')
    expect(screen.getByRole('option')).toHaveTextContent('Eswatini (Swaziland)')
  })

  it('does not count case or accents as another spelling', async () => {
    const { input, answered } = setup()
    await userEvent.type(input, "cote d'ivoire{Enter}")
    expect(answered()).toEqual([["Côte d'Ivoire", null]])
  })

  it('says when no country has that name, without answering', async () => {
    const { input, answered } = setup()
    await userEvent.type(input, 'Atlantis{Enter}')
    expect(screen.getByRole('alert')).toHaveTextContent('No country called “Atlantis”')
    expect(answered()).toEqual([])
    await userEvent.type(input, 'x')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
