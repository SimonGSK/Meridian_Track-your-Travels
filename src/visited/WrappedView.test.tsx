import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import WrappedView from './WrappedView'
import { reviewOf, type Travels } from './yearInReview'

const travels: Travels = {
  visited: new Set(['Japan', 'France']),
  datesOf: (name) => ({ Japan: ['2024-04'], France: ['2024-07', '2019'] })[name] ?? [],
  routes: [],
}

describe('WrappedView', () => {
  it('shows the year wrapped, said in words for screen readers, to save or close', async () => {
    const onClose = vi.fn()
    render(<WrappedView review={reviewOf(2024, travels)} onClose={onClose} />)
    expect(screen.getByRole('dialog', { name: 'Your 2024, wrapped' })).toBeInTheDocument()
    expect(screen.getByRole('img')).toHaveAccessibleName('In 2024: 2 countries, 1 new place, on 2 continents.')
    // Saved once it's drawn (there's no canvas to draw on here)
    expect(screen.getByRole('button', { name: 'Save image' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
