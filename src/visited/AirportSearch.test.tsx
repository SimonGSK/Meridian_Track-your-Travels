import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AirportSearch from './AirportSearch'
import { loadAirports } from '../data/airports'

const airports = await loadAirports()
const airport = (code: string) => airports.find((a) => a.code === code)!

describe('AirportSearch', () => {
  it('lists matching airports with their code, city, name and country, and picks one', async () => {
    const onChange = vi.fn()
    render(<AirportSearch label="From" airports={airports} value={null} onChange={onChange} />)
    await userEvent.type(screen.getByRole('searchbox', { name: 'From' }), 'copenhagen')
    const found = within(screen.getByRole('list', { name: 'From airports' })).getAllByRole('button')
    expect(found[0]).toHaveTextContent('CPH Copenhagen')
    expect(found[0]).toHaveTextContent('Copenhagen Kastrup Airport · Denmark')
    await userEvent.click(found[0])
    expect(onChange).toHaveBeenCalledWith(airport('CPH'))
  })

  it('picks the first match with Enter, also by code', async () => {
    const onChange = vi.fn()
    render(<AirportSearch label="To" airports={airports} value={null} onChange={onChange} />)
    await userEvent.type(screen.getByRole('searchbox', { name: 'To' }), 'nan{Enter}')
    expect(onChange).toHaveBeenCalledWith(airport('NAN'))
  })

  it('shows the airport picked, which can be changed', async () => {
    const onChange = vi.fn()
    render(<AirportSearch label="To" airports={airports} value={airport('BKK')} onChange={onChange} />)
    expect(screen.getByText('BKK')).toBeInTheDocument()
    expect(screen.getByText('Thailand')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Change To' }))
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('says when nothing matches', async () => {
    render(<AirportSearch label="To" airports={airports} value={null} onChange={() => {}} />)
    await userEvent.type(screen.getByRole('searchbox', { name: 'To' }), 'xyzzy')
    expect(screen.getByText(/No airport for “xyzzy”/)).toBeInTheDocument()
  })
})
