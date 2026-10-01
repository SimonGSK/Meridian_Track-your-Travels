import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Tabs from './Tabs'

describe('Tabs', () => {
  it('has Explore, Visited, Games and Design', () => {
    render(<Tabs view={null} onChange={() => {}} />)
    const nav = screen.getByRole('navigation', { name: 'Main' })
    expect(nav).toHaveTextContent(/Explore.*Visited.*Games.*Design/)
  })

  it('opens a view', async () => {
    const onChange = vi.fn()
    render(<Tabs view={null} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Games' }))
    expect(onChange).toHaveBeenCalledWith('games')
  })

  it('marks the open view, which stays open when clicked again', async () => {
    const onChange = vi.fn()
    render(<Tabs view="design" onChange={onChange} />)
    expect(screen.getByRole('button', { name: 'Design' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: 'Games' })).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(screen.getByRole('button', { name: 'Design' }))
    expect(onChange).toHaveBeenCalledWith('design')
  })
})
