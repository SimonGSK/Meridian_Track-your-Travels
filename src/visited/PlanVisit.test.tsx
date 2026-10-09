import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PlanVisit from './PlanVisit'

describe('PlanVisit', () => {
  beforeEach(() => vi.useFakeTimers({ now: new Date(2026, 9, 9, 12), toFake: ['Date'] }))
  afterEach(() => vi.useRealTimers())

  it('plans a visit for a day from tomorrow', async () => {
    const onChange = vi.fn()
    render(<PlanVisit day={null} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Plan a visit' }))
    const day = screen.getByLabelText("The day you're going")
    expect(day).toHaveAttribute('min', '2026-10-10')
    fireEvent.change(day, { target: { value: '2026-10-09' } }) // today: been, not going
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.change(day, { target: { value: '2026-11-01' } })
    expect(onChange).toHaveBeenCalledWith('2026-11-01')
    await userEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.queryByLabelText("The day you're going")).not.toBeInTheDocument()
  })

  it('counts down to the day planned, to change or give up', async () => {
    const onChange = vi.fn()
    render(<PlanVisit day="2026-11-01" onChange={onChange} />)
    expect(screen.getByText(/^Going/)).toHaveTextContent('Going 1 Nov 2026 · in 23 days')
    await userEvent.click(screen.getByRole('button', { name: 'Not going after all' }))
    expect(onChange).toHaveBeenCalledWith(null)
    await userEvent.click(screen.getByRole('button', { name: "Change the day you're going" }))
    expect(screen.getByLabelText("The day you're going")).toHaveValue('2026-11-01')
  })
})
