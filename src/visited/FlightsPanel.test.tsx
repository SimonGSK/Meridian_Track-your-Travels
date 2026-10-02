import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FlightsPanel from './FlightsPanel'
import { loadCities } from '../data/cities'
import { routeOf, type Flight } from '../data/flights'

const cities = await loadCities()
const city = (name: string) => cities.find((c) => c.name === name && c.place !== 'CA')!
const byId = new Map(cities.map((c) => [c.id, c]))
const route = (from: string, to: string) =>
  routeOf({ id: `${from}-${to}`, from: city(from).id, to: city(to).id } satisfies Flight, byId)!

function setup(routes = [route('Copenhagen', 'Bangkok'), route('Bangkok', 'Sydney')]) {
  const props = { routes, cities, onAdd: vi.fn(), onRemove: vi.fn(), onShow: vi.fn() }
  render(<FlightsPanel {...props} />)
  return props
}
const stat = (label: string) => screen.getByText(label, { selector: 'dt' }).nextElementSibling
const pick = async (label: string, query: string) => {
  await userEvent.type(screen.getByRole('searchbox', { name: label }), query)
  await userEvent.click(within(screen.getByRole('list', { name: `${label} cities` })).getAllByRole('button')[0])
}

describe('FlightsPanel', () => {
  it('adds up the flights, the distance and the laps around the Earth', () => {
    setup()
    expect(stat('Flights')).toHaveTextContent('2')
    expect(stat('Distance')).toHaveTextContent('16.2K km')
    expect(stat('Earth laps')).toHaveTextContent('0.4×')
  })

  it('lists the flights, newest first, with their distance', () => {
    setup()
    const rows = within(screen.getByRole('list', { name: 'Flights' })).getAllByRole('listitem')
    expect(rows.map((row) => row.textContent)).toEqual(['Bangkok → Sydney7,536 km', 'Copenhagen → Bangkok8,620 km'])
  })

  it('shows a flight on the globe, or removes it', async () => {
    const { routes, onShow, onRemove } = setup()
    await userEvent.click(screen.getByRole('button', { name: /^Copenhagen → Bangkok/ }))
    expect(onShow).toHaveBeenCalledWith(routes[0])
    await userEvent.click(screen.getByRole('button', { name: 'Remove flight from Bangkok to Sydney' }))
    expect(onRemove).toHaveBeenCalledWith('Bangkok-Sydney')
  })

  it('adds a flight between two cities, then starts the next one where it landed', async () => {
    const { onAdd } = setup([])
    expect(screen.getByRole('button', { name: 'Add flight' })).toBeDisabled()
    await pick('From', 'copenhagen')
    await pick('To', 'paris')
    await userEvent.click(screen.getByRole('button', { name: 'Add flight' }))
    expect(onAdd).toHaveBeenCalledWith(city('Copenhagen').id, city('Paris').id)
    expect(screen.getByRole('button', { name: 'Change From' }).closest('.city-choice')).toHaveTextContent('Paris')
    expect(screen.getByRole('searchbox', { name: 'To' })).toHaveValue('')
  })

  it('swaps From and To, for the flight back', async () => {
    setup([])
    await pick('From', 'copenhagen')
    await pick('To', 'paris')
    await userEvent.click(screen.getByRole('button', { name: 'Swap From and To' }))
    expect(screen.getByRole('button', { name: 'Change From' }).closest('.city-choice')).toHaveTextContent('Paris')
    expect(screen.getByRole('button', { name: 'Change To' }).closest('.city-choice')).toHaveTextContent('Copenhagen')
  })

  it('does not add a flight to the same city', async () => {
    setup([])
    await pick('From', 'paris')
    await pick('To', 'paris')
    expect(screen.getByRole('button', { name: 'Add flight' })).toBeDisabled()
    expect(screen.getByText('From and To are the same city.')).toBeInTheDocument()
  })

  it('says when there are no flights yet', () => {
    setup([])
    expect(screen.getByText(/None yet/)).toBeInTheDocument()
    expect(stat('Distance')).toHaveTextContent('0 km')
  })
})
