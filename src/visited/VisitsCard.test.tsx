import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import VisitsCard from './VisitsCard'

function setup(dates: string[] = [], notes: Record<string, string> = {}) {
  const props = { dates, onAdd: vi.fn(), onRemove: vi.fn(), noteOf: (date: string) => notes[date], onNote: vi.fn() }
  render(<VisitsCard {...props} />)
  return props
}
const when = () => within(screen.getByRole('group', { name: 'When you went' }))

describe('VisitsCard', () => {
  afterEach(() => vi.useRealTimers())

  it('asks when you went, until there are visits', () => {
    setup()
    expect(screen.getByRole('region', { name: 'Visits' })).toHaveTextContent(/^Visits00When did you go\?/)
  })

  it('lists the visits, and removes one', async () => {
    const { onRemove } = setup(['2023-05', '2019'])
    expect(within(screen.getByRole('list', { name: 'Visits' })).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'May 2023',
      '2019',
    ])
    await userEvent.click(screen.getByRole('button', { name: 'Remove the visit in May 2023' }))
    expect(onRemove).toHaveBeenCalledWith('2023-05')
  })

  it('shows the note on a visit under its date', () => {
    setup(['2023-05', '2019'], { '2023-05': 'Honeymoon in Kyoto' })
    const [may] = within(screen.getByRole('list', { name: 'Visits' })).getAllByRole('listitem')
    expect(may).toHaveTextContent('May 2023Honeymoon in Kyoto')
    expect(screen.getByRole('button', { name: 'Change the note on the visit in May 2023' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add a note to the visit in 2019' })).toBeInTheDocument()
  })

  it('writes a note on a visit, as it is typed, until Done', async () => {
    const { onNote } = setup(['2019'])
    await userEvent.click(screen.getByRole('button', { name: 'Add a note to the visit in 2019' }))
    const note = screen.getByRole('textbox', { name: 'Note on the visit in 2019' })
    expect(note).toHaveFocus()
    expect(note).toHaveAttribute('maxlength', '200')
    await userEvent.type(note, 'Rain')
    expect(onNote).toHaveBeenLastCalledWith('2019', 'n') // each key, as the field is the saved note
    await userEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('closes the note with Enter', async () => {
    setup(['2019'], { '2019': 'Rain' })
    await userEvent.click(screen.getByRole('button', { name: 'Change the note on the visit in 2019' }))
    expect(screen.getByRole('textbox', { name: 'Note on the visit in 2019' })).toHaveValue('Rain')
    await userEvent.keyboard('{Enter}')
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('adds a visit in a month of a year, or just a year', async () => {
    const { onAdd } = setup()
    await userEvent.selectOptions(when().getByRole('combobox', { name: 'Year' }), '2018')
    await userEvent.click(screen.getByRole('button', { name: 'Add visit' }))
    expect(onAdd).toHaveBeenLastCalledWith('2018')
    await userEvent.selectOptions(when().getByRole('combobox', { name: 'Month' }), 'March')
    await userEvent.click(screen.getByRole('button', { name: 'Add visit' }))
    expect(onAdd).toHaveBeenLastCalledWith('2018-03')
  })

  it('does not add the same visit twice', async () => {
    setup(['2018'])
    await userEvent.selectOptions(when().getByRole('combobox', { name: 'Year' }), '2018')
    expect(screen.getByRole('button', { name: 'Add visit' })).toBeDisabled()
  })

  it('offers no month still to come, and no year without one', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 3, 15) }) // April 2026
    setup()
    const month = (name: string) => when().getByRole<HTMLOptionElement>('option', { name })
    expect(when().getByRole('combobox', { name: 'Year' })).toHaveValue('2026')
    expect(month('April').disabled).toBe(false)
    expect(month('May').disabled).toBe(true)
    expect(when().queryByRole('option', { name: 'Year' })).not.toBeInTheDocument() // a visit needs one
    await userEvent.selectOptions(when().getByRole('combobox', { name: 'Year' }), '2025')
    expect(month('May').disabled).toBe(false)
    await userEvent.selectOptions(when().getByRole('combobox', { name: 'Month' }), 'December')
    // Back to this year: December hasn't come yet
    await userEvent.selectOptions(when().getByRole('combobox', { name: 'Year' }), '2026')
    expect(when().getByRole('combobox', { name: 'Month' })).toHaveValue('')
  })
})
