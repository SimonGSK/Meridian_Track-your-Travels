import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CitySearch from './CitySearch'
import { findCities, loadCities } from '../data/cities'

const cities = await loadCities()
const city = (name: string, place: string) => cities.find((c) => c.name === name && c.place === place)!

describe('findCities', () => {
  it('puts names starting with the text first, biggest first, then names with a word starting with it', () => {
    expect(findCities(cities, 'london').map((c) => `${c.name} ${c.place}`)).toEqual([
      'London GB',
      'London CA',
      'East London ZA',
    ])
    expect(findCities(cities, 'nelspruit').map((c) => c.name)).toEqual(['Mbombela (Nelspruit)'])
    expect(findCities(cities, '')).toEqual([])
  })
})

describe('CitySearch', () => {
  it('lists matching cities with their country, and picks one', async () => {
    const onChange = vi.fn()
    render(<CitySearch label="From" cities={cities} value={null} onChange={onChange} />)
    await userEvent.type(screen.getByRole('searchbox', { name: 'From' }), 'london')
    const found = within(screen.getByRole('list', { name: 'From cities' })).getAllByRole('button')
    expect(found.map((b) => b.textContent)).toEqual(['LondonUnited Kingdom', 'LondonCanada', 'East LondonSouth Africa'])
    await userEvent.click(found[0])
    expect(onChange).toHaveBeenCalledWith(city('London', 'GB'))
  })

  it('picks the first match with Enter', async () => {
    const onChange = vi.fn()
    render(<CitySearch label="To" cities={cities} value={null} onChange={onChange} />)
    await userEvent.type(screen.getByRole('searchbox', { name: 'To' }), 'bangk{Enter}')
    expect(onChange).toHaveBeenCalledWith(city('Bangkok', 'TH'))
  })

  it('shows the city picked, which can be changed', async () => {
    const onChange = vi.fn()
    render(<CitySearch label="To" cities={cities} value={city('Bangkok', 'TH')} onChange={onChange} />)
    expect(screen.getByText('Bangkok')).toBeInTheDocument()
    expect(screen.getByText('Thailand')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Change To' }))
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('says when no city matches', async () => {
    render(<CitySearch label="To" cities={cities} value={null} onChange={() => {}} />)
    await userEvent.type(screen.getByRole('searchbox', { name: 'To' }), 'xyzzy')
    expect(screen.getByText(/No city called “xyzzy”/)).toBeInTheDocument()
  })
})
