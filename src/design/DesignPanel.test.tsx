import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DesignPanel from './DesignPanel'
import { CLASSIC, THEMES } from '../globe/themes'

describe('DesignPanel', () => {
  it('offers every design', () => {
    render(<DesignPanel theme={CLASSIC} onChange={() => {}} />)
    for (const theme of THEMES) expect(screen.getByRole('button', { name: new RegExp(theme.name) })).toBeInTheDocument()
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
