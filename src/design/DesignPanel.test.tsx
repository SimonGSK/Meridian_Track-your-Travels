import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DesignPanel from './DesignPanel'
import { CLASSIC, THEMES } from '../globe/themes'

describe('DesignPanel', () => {
  it('offers every design as a tiny globe, all in a row', () => {
    render(<DesignPanel theme={CLASSIC} onChange={() => {}} />)
    const row = screen.getByRole('group', { name: 'Design' })
    expect(within(row).getAllByRole('button')).toHaveLength(THEMES.length)
    for (const theme of THEMES) expect(within(row).getByRole('button', { name: theme.name })).toBeInTheDocument()
  })

  it('names the design chosen under them', () => {
    render(<DesignPanel theme={CLASSIC} onChange={() => {}} />)
    expect(screen.getByText(CLASSIC.name, { selector: 'p' })).toBeInTheDocument()
  })

  it('marks the current design', () => {
    render(<DesignPanel theme={CLASSIC} onChange={() => {}} />)
    expect(screen.getByRole('button', { name: /Classic/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Night/ })).toHaveAttribute('aria-pressed', 'false')
  })

  it('switches design', async () => {
    const onChange = vi.fn()
    render(<DesignPanel theme={CLASSIC} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /Night/ }))
    expect(onChange).toHaveBeenCalledWith('night')
  })
})
