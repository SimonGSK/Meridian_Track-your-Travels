import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
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

const checkboxNames = () => screen.getAllByRole('checkbox').map((c) => c.closest('label')!.textContent)

describe('CityPicker', () => {
  it('says it is loading until the cities are there', () => {
    render(<CityPicker cities={null} visited={new Set()} onToggle={() => {}} />)
    expect(screen.getByRole('region', { name: 'Cities' })).toHaveTextContent('Loading…')
  })

  it('lists the cities, capital first and marked, and counts the visited ones', () => {
    setup(['Aarhus', 'Odense'])
    expect(checkboxNames().slice(0, 3)).toEqual(['Copenhagencapital', 'Aarhus', 'Odense'])
    expect(screen.getByText(`of ${denmark.length} visited`)).toHaveTextContent(`2 of ${denmark.length} visited`)
    expect(screen.getByRole('checkbox', { name: 'Aarhus' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /^Copenhagen/ })).not.toBeChecked()
  })

  it('toggles a city', async () => {
    const onToggle = setup()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Aarhus' }))
    expect(onToggle).toHaveBeenCalledWith(expect.objectContaining({ name: 'Aarhus', place: 'DK' }))
  })

  it('filters long lists, ignoring accents', async () => {
    setup([], citiesIn('Germany'))
    await userEvent.type(screen.getByRole('searchbox', { name: 'Filter cities' }), 'dusseldorf')
    expect(checkboxNames()).toEqual(['Düsseldorf'])
  })

  it('has no filter for short lists', () => {
    setup()
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
  })
})
