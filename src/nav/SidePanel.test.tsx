import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SidePanel from './SidePanel'

describe('SidePanel', () => {
  it('is a region named by its title, holding its content', () => {
    render(
      <SidePanel title="Visited" onClose={() => {}}>
        <p>content</p>
      </SidePanel>,
    )
    const region = screen.getByRole('region', { name: 'Visited' })
    expect(region).toHaveTextContent('content')
    expect(region).toHaveAttribute('id', 'side-panel') // what the menu buttons control
  })

  it('closes', async () => {
    const onClose = vi.fn()
    render(<SidePanel title="Games" onClose={onClose}>x</SidePanel>)
    await userEvent.click(screen.getByRole('button', { name: 'Close panel' }))
    expect(onClose).toHaveBeenCalled()
  })
})
