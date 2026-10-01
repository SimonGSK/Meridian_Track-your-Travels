import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CountryInput from './CountryInput'

function setup() {
  const onAnswer = vi.fn()
  render(<CountryInput onAnswer={onAnswer} />)
  const input = screen.getByRole('textbox', { name: 'Your answer' })
  const answered = () => onAnswer.mock.calls.map(([country, alias]) => [country.properties.name, alias])
  return { input, answered }
}

describe('CountryInput', () => {
  it('is ready to type in', () => {
    const { input } = setup()
    expect(input).toHaveFocus()
  })

  it('suggests nothing while typing, so it gives nothing away', async () => {
    const { input } = setup()
    await userEvent.type(input, 'nor')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('option')).not.toBeInTheDocument()
    expect(screen.queryByText('Norway')).not.toBeInTheDocument()
  })

  it('answers with the name typed, on Enter, and clears the box', async () => {
    const { input, answered } = setup()
    await userEvent.type(input, 'Norway{Enter}')
    expect(answered()).toEqual([['Norway', null]])
    expect(input).toHaveValue('')
  })

  it('needs the whole name', async () => {
    const { input, answered } = setup()
    await userEvent.type(input, 'denm{Enter}')
    expect(answered()).toEqual([])
    expect(screen.getByRole('alert')).toHaveTextContent('No country called “denm”')
  })

  it('tells Niger from Nigeria', async () => {
    const { input, answered } = setup()
    await userEvent.type(input, 'niger{Enter}')
    expect(answered()).toEqual([['Niger', null]])
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

  it('does not count case or accents as another spelling', async () => {
    const { input, answered } = setup()
    await userEvent.type(input, "cote d'ivoire{Enter}")
    expect(answered()).toEqual([["Côte d'Ivoire", null]])
  })

  it('ignores an empty answer', async () => {
    const { input, answered } = setup()
    await userEvent.type(input, '   {Enter}')
    expect(answered()).toEqual([])
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('says when no country has that name, without answering, until you type again', async () => {
    const { input, answered } = setup()
    await userEvent.type(input, 'Atlantis{Enter}')
    expect(screen.getByRole('alert')).toHaveTextContent('No country called “Atlantis”')
    expect(answered()).toEqual([])
    await userEvent.type(input, 'x')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
