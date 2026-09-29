import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CountryPanel from './CountryPanel'
import { countries } from './countries'

const byName = (name: string) => countries.find((c) => c.properties.name === name)!

describe('CountryPanel', () => {
  it('shows the country name and ISO code', () => {
    render(<CountryPanel country={byName('Denmark')} onClose={() => {}} />)
    expect(screen.getByRole('heading', { name: 'Denmark' })).toBeInTheDocument()
    expect(screen.getByText('ISO numeric code: 208')).toBeInTheDocument()
  })

  it('hides the ISO code when the country has none', () => {
    render(<CountryPanel country={byName('Kosovo')} onClose={() => {}} />)
    expect(screen.getByRole('heading', { name: 'Kosovo' })).toBeInTheDocument()
    expect(screen.queryByText(/ISO numeric code/)).not.toBeInTheDocument()
  })

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn()
    render(<CountryPanel country={byName('Denmark')} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
