import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NavRail from './NavRail'

describe('NavRail', () => {
  it('has Visited, Games and Design', () => {
    render(<NavRail view={null} onChange={() => {}} />)
    const nav = screen.getByRole('navigation', { name: 'Main' })
    expect(nav).toHaveTextContent(/Visited.*Games.*Design/)
  })

  it('opens a view', async () => {
    const onChange = vi.fn()
    render(<NavRail view={null} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Games' }))
    expect(onChange).toHaveBeenCalledWith('games')
  })

  it('marks the open view and closes it when clicked again', async () => {
    const onChange = vi.fn()
    render(<NavRail view="design" onChange={onChange} />)
    expect(screen.getByRole('button', { name: 'Design' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: 'Games' })).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(screen.getByRole('button', { name: 'Design' }))
    expect(onChange).toHaveBeenCalledWith(null)
  })
})
