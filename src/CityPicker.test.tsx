import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CityPicker from './CityPicker'
import { countries } from './countries'
import { citiesOf, loadCities } from './data/cities'

const all = await loadCities()
const citiesIn = (name: string) => citiesOf(all, countries.find((c) => c.properties.name === name)!)
const denmark = citiesIn('Denmark')
const idOf = (name: string) => all.find((c) => c.name === name)!.id

function setup(visited: string[] = [], cities = denmark) {
  const onToggle = vi.fn()
  render(<CityPicker cities={cities} visited={new Set(visited.map(idOf))} onToggle={onToggle} />)
  return onToggle
}

const box = () => screen.getByRole('searchbox', { name: 'Add a city' })
const suggestions = () =>
  within(screen.getByRole('list', { name: 'Cities to add' }))
    .getAllByRole('button')
    .map((b) => b.textContent)

describe('CityPicker', () => {
  it('says it is loading until the cities are there', () => {
    render(<CityPicker cities={null} visited={new Set()} onToggle={() => {}} />)
    expect(screen.getByRole('region', { name: 'Visited cities' })).toHaveTextContent('Loading…')
  })

  it('lists the visited cities, counting them', () => {
    setup(['Odense', 'Copenhagen'])
    const card = screen.getByRole('region', { name: 'Visited cities' })
    expect(card).toHaveTextContent(/^Visited cities02/)
    // In the country's order: capital first, then the biggest
    expect(within(screen.getByRole('list', { name: 'Visited cities' })).getAllByRole('listitem').map((li) => li.textContent))
      .toEqual(['Copenhagencapital', 'Odense'])
  })

  it('says when none are visited', () => {
    setup()
    expect(screen.getByText(/None yet/)).toBeInTheDocument()
  })

  it('removes a city', async () => {
    const onToggle = setup(['Aarhus'])
    await userEvent.click(screen.getByRole('button', { name: 'Remove Aarhus' }))
    expect(onToggle).toHaveBeenCalledWith(expect.objectContaining({ name: 'Aarhus' }))
  })

  it('suggests the biggest cities not visited yet', async () => {
    setup(['Copenhagen'])
    await userEvent.click(box())
    expect(suggestions().slice(0, 3)).toEqual(['Aarhus', 'Odense', 'Aalborg'])
  })

  it('adds a city found by name, ignoring accents', async () => {
    const onToggle = setup([], citiesIn('Germany'))
    await userEvent.type(box(), 'dusseldorf')
    expect(suggestions()).toEqual(['Düsseldorf'])
    await userEvent.click(screen.getByRole('button', { name: 'Düsseldorf' }))
    expect(onToggle).toHaveBeenCalledWith(expect.objectContaining({ name: 'Düsseldorf' }))
    expect(box()).toHaveValue('')
  })

  it('adds the first match with Enter', async () => {
    const onToggle = setup()
    await userEvent.type(box(), 'aal{Enter}')
    expect(onToggle).toHaveBeenCalledWith(expect.objectContaining({ name: 'Aalborg' }))
  })

  it('says when no city matches', async () => {
    setup()
    await userEvent.type(box(), 'paris')
    expect(screen.getByText(/No city called “paris” here/)).toBeInTheDocument()
  })
})
