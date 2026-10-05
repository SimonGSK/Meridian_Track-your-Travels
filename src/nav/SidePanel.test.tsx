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

  it('has its name and close button in a header, apart from the content that scrolls', () => {
    render(
      <SidePanel title="Visited" onClose={() => {}}>
        <p>content</p>
      </SidePanel>,
    )
    const header = screen.getByRole('heading', { name: 'Visited' }).closest('header')!
    expect(header).toContainElement(screen.getByRole('button', { name: 'Close panel' }))
    expect(header).not.toContainElement(screen.getByText('content'))
  })

  it('closes', async () => {
    const onClose = vi.fn()
    render(<SidePanel title="Games" onClose={onClose}>x</SidePanel>)
    await userEvent.click(screen.getByRole('button', { name: 'Close panel' }))
    expect(onClose).toHaveBeenCalled()
  })
})
