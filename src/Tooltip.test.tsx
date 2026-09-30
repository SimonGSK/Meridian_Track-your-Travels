import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import Tooltip from './Tooltip'

describe('Tooltip', () => {
  it('shows the text', () => {
    render(<Tooltip text="Denmark" />)
    expect(screen.getByRole('tooltip')).toHaveTextContent('Denmark')
  })

  it('is hidden without text', () => {
    render(<Tooltip text={null} />)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('follows the pointer, just below and to the right of it', () => {
    render(<Tooltip text="Denmark" />)
    fireEvent.pointerMove(window, { clientX: 100, clientY: 50 })
    expect(screen.getByRole('tooltip').style.transform).toBe('translate(114px, 64px)')
  })
})
