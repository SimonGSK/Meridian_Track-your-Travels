import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FlightsPanel from './FlightsPanel'
import { loadAirports } from '../data/airports'
import { routeOf, type Flight } from '../data/flights'

const airports = await loadAirports()
const byCode = new Map(airports.map((a) => [a.code, a]))
const route = (from: string, to: string, date?: string) =>
  routeOf({ id: `${from}-${to}`, from, to, ...(date ? { date } : {}) } satisfies Flight, byCode)!

function setup(routes = [route('CPH', 'BKK'), route('BKK', 'SYD')]) {
  const props = { routes, airports, onAdd: vi.fn(), onRemove: vi.fn(), onDate: vi.fn(), onShow: vi.fn(), onShowTrip: vi.fn() }
  render(<FlightsPanel {...props} />)
  return props
}
/** The list's own rows, flights and trips, not the flights inside trips */
const rows = () => [...screen.getByRole('list', { name: 'Flights' }).children] as HTMLElement[]
const stat = (label: string) => screen.getByText(label, { selector: 'dt' }).nextElementSibling
const pick = async (label: string, query: string) => {
  await userEvent.type(screen.getByRole('searchbox', { name: label }), query)
  await userEvent.click(within(screen.getByRole('list', { name: `${label} airports` })).getAllByRole('button')[0])
}

describe('FlightsPanel', () => {
  it('adds up the flights, the distance and the laps around the Earth', () => {
    setup()
    expect(stat('Flights')).toHaveTextContent('2')
    expect(stat('Distance')).toHaveTextContent(/^16\.\dK km$/)
    expect(stat('Earth laps')).toHaveTextContent('0.4×')
  })

  it('groups flights flown one after another into a trip, in the order flown, with their distance', () => {
    setup()
    expect(rows()).toHaveLength(1)
    expect(screen.getByRole('button', { name: /^Trip/ })).toHaveTextContent(
      /^Trip · 2 flights · 16\.\dK kmCopenhagen → Bangkok → Sydney$/,
    )
    const legs = screen.getByRole('list', { name: 'Flights of the trip Copenhagen → Bangkok → Sydney' })
    expect(within(legs).getAllByRole('listitem').map((row) => row.textContent)).toEqual([
      expect.stringMatching(/^Copenhagen → BangkokCPH → BKK · 8,\d{3} kmAdd date$/),
      expect.stringMatching(/^Bangkok → SydneyBKK → SYD · 7,\d{3} kmAdd date$/),
    ])
  })

  it('shows a whole trip on the globe', async () => {
    const { routes, onShowTrip } = setup()
    await userEvent.click(screen.getByRole('button', { name: /^Trip/ }))
    expect(onShowTrip).toHaveBeenCalledWith(routes)
  })

  it('lists trips and single flights together, newest first, by the date of the first leg', () => {
    setup([route('CPH', 'NRT', '2024-04'), route('LHR', 'JFK', '2025-01'), route('NRT', 'CPH', '2024-05'), route('CPH', 'BKK')])
    expect(rows().map((row) => row.querySelector('.row-name, .trip-meta')!.textContent)).toEqual([
      'London → New York',
      expect.stringMatching(/^Trip · Apr 2024 · 2 flights · /),
      'Copenhagen → Bangkok',
    ])
    expect(rows()[1].querySelector('.trip-route')).toHaveTextContent('Copenhagen → Narita → Copenhagen')
  })

  it('shows a flight on the globe, or removes it', async () => {
    const { routes, onShow, onRemove } = setup()
    await userEvent.click(screen.getByRole('button', { name: /^Copenhagen → Bangkok/ }))
    expect(onShow).toHaveBeenCalledWith(routes[0])
    await userEvent.click(screen.getByRole('button', { name: 'Remove flight from Bangkok to Sydney' }))
    expect(onRemove).toHaveBeenCalledWith('BKK-SYD')
  })

  it('adds a flight between two airports, then starts the next one where it landed', async () => {
    const { onAdd } = setup([])
    expect(screen.getByRole('button', { name: 'Add flight' })).toBeDisabled()
    await pick('From', 'copenhagen')
    await pick('To', 'cdg')
    await userEvent.click(screen.getByRole('button', { name: 'Add flight' }))
    expect(onAdd).toHaveBeenCalledWith('CPH', 'CDG', null)
    expect(screen.getByRole('button', { name: 'Change From' }).closest('.city-choice')).toHaveTextContent('Paris')
    expect(screen.getByRole('searchbox', { name: 'To' })).toHaveValue('')
  })

  it('adds a flight with when it was, keeping the date for the next leg', async () => {
    const { onAdd } = setup([])
    const when = within(screen.getByRole('group', { name: 'When you flew' }))
    await userEvent.selectOptions(when.getByRole('combobox', { name: 'Year' }), '2024')
    await userEvent.selectOptions(when.getByRole('combobox', { name: 'Month' }), 'May')
    await pick('From', 'copenhagen')
    await pick('To', 'cdg')
    await userEvent.click(screen.getByRole('button', { name: 'Add flight' }))
    expect(onAdd).toHaveBeenCalledWith('CPH', 'CDG', '2024-05')
    await pick('To', 'jfk')
    await userEvent.click(screen.getByRole('button', { name: 'Add flight' }))
    expect(onAdd).toHaveBeenLastCalledWith('CDG', 'JFK', '2024-05')
  })

  it('lists flights by date, newest first, those without one after', () => {
    setup([route('CPH', 'BKK', '2019'), route('BKK', 'SYD'), route('LHR', 'JFK', '2023-05'), route('JFK', 'LAX', '2023-11')])
    // Months apart, or one without a date: not trips
    expect(rows().map((row) => row.querySelector('.row-name')!.textContent)).toEqual([
      'New York → Los Angeles',
      'London → New York',
      'Copenhagen → Bangkok',
      'Bangkok → Sydney',
    ])
    expect(rows()[0]).toHaveTextContent('Nov 2023')
    expect(rows()[2]).toHaveTextContent(/2019$/)
  })

  it('gives a flight a date, or changes it', async () => {
    const { onDate } = setup([route('CPH', 'BKK')])
    await userEvent.click(screen.getByRole('button', { name: 'Add a date to the flight from Copenhagen to Bangkok' }))
    const when = within(screen.getByRole('group', { name: 'When you took the flight from Copenhagen to Bangkok' }))
    await userEvent.selectOptions(when.getByRole('combobox', { name: 'Year' }), '2022')
    expect(onDate).toHaveBeenLastCalledWith('CPH-BKK', '2022')
    await userEvent.selectOptions(when.getByRole('combobox', { name: 'Year' }), '')
    expect(onDate).toHaveBeenLastCalledWith('CPH-BKK', null) // no date after all
    await userEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.queryByRole('group', { name: /When you took/ })).not.toBeInTheDocument()
  })

  it('swaps From and To, for the flight back', async () => {
    setup([])
    await pick('From', 'copenhagen')
    await pick('To', 'cdg')
    await userEvent.click(screen.getByRole('button', { name: 'Swap From and To' }))
    expect(screen.getByRole('button', { name: 'Change From' }).closest('.city-choice')).toHaveTextContent('Paris')
    expect(screen.getByRole('button', { name: 'Change To' }).closest('.city-choice')).toHaveTextContent('Copenhagen')
  })

  it('does not add a flight to the same airport', async () => {
    setup([])
    await pick('From', 'cdg')
    await pick('To', 'cdg')
    expect(screen.getByRole('button', { name: 'Add flight' })).toBeDisabled()
    expect(screen.getByText('From and To are the same airport.')).toBeInTheDocument()
  })

  it('says when there are no flights yet', () => {
    setup([])
    expect(screen.getByText(/None yet/)).toBeInTheDocument()
    expect(stat('Distance')).toHaveTextContent('0 km')
  })
})
