import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MonthYearSelect, { FUTURE_YEARS } from './MonthYearSelect'

const years = () => screen.getAllByRole('option').filter((o) => /^\d{4}$/.test(o.textContent!)).map((o) => Number(o.textContent))
const month = (name: string) => screen.getByRole('option', { name }) as HTMLOptionElement

describe('MonthYearSelect', () => {
  beforeEach(() => vi.useFakeTimers({ now: new Date(2026, 9, 9), toFake: ['Date'] }))
  afterEach(() => vi.useRealTimers())

  it('goes up to this month', async () => {
    const onChange = vi.fn()
    render(<MonthYearSelect label="When you went" value="2026" onChange={onChange} />)
    expect(Math.max(...years())).toBe(2026)
    expect(month('October').disabled).toBe(false)
    expect(month('November').disabled).toBe(true)
  })

  it('goes some years ahead too, for a flight booked', async () => {
    const onChange = vi.fn()
    render(<MonthYearSelect label="When you flew" value={null} onChange={onChange} optional future />)
    expect(Math.max(...years())).toBe(2026 + FUTURE_YEARS)
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Year' }), '2026')
    expect(month('December').disabled).toBe(false)
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Month' }), 'December')
    expect(onChange).toHaveBeenLastCalledWith('2026-12')
  })
})
