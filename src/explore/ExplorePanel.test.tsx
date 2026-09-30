import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ExplorePanel from './ExplorePanel'

describe('ExplorePanel', () => {
  it('explains how to use the globe', () => {
    render(<ExplorePanel settings={{ showVisited: true, showMarkers: true }} onChange={() => {}} />)
    expect(screen.getByText(/Drag to spin/)).toBeInTheDocument()
  })

  it('has a switch for each setting, showing its state', () => {
    render(<ExplorePanel settings={{ showVisited: true, showMarkers: false }} onChange={() => {}} />)
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: /Visited countries/ })).toBeChecked()
    expect(screen.getByRole('switch', { name: /Island markers/ })).not.toBeChecked()
  })

  it('turns settings on and off', async () => {
    const onChange = vi.fn()
    render(<ExplorePanel settings={{ showVisited: true, showMarkers: false }} onChange={onChange} />)
    await userEvent.click(screen.getByRole('switch', { name: /Visited countries/ }))
    expect(onChange).toHaveBeenCalledWith({ showVisited: false })
    await userEvent.click(screen.getByText('Island markers')) // the whole row is clickable
    expect(onChange).toHaveBeenCalledWith({ showMarkers: true })
  })
})
