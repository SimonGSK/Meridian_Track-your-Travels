import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UndoToast, { UNDO_MS } from './UndoToast'

const removal = () => ({ message: 'Removed Japan', undo: vi.fn() })

describe('UndoToast', () => {
  afterEach(() => vi.useRealTimers())

  it('says what was removed, and puts it back on Undo', async () => {
    const r = removal()
    const onDone = vi.fn()
    render(<UndoToast removal={r} onDone={onDone} />)
    expect(screen.getByText('Removed Japan')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(r.undo).toHaveBeenCalledOnce()
    expect(onDone).toHaveBeenCalled()
  })

  it('goes after a few seconds, or when dismissed, without undoing', async () => {
    vi.useFakeTimers()
    const r = removal()
    const onDone = vi.fn()
    render(<UndoToast removal={r} onDone={onDone} />)
    act(() => vi.advanceTimersByTime(UNDO_MS - 1))
    expect(onDone).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    expect(onDone).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(onDone).toHaveBeenCalledTimes(2)
    expect(r.undo).not.toHaveBeenCalled()
  })

  it('undoes on Cmd or Ctrl+Z, but not while typing, where it undoes the typing', () => {
    const r = removal()
    const onDone = vi.fn()
    render(
      <>
        <input aria-label="Search" />
        <UndoToast removal={r} onDone={onDone} />
      </>,
    )
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Search' }), { key: 'z', metaKey: true })
    fireEvent.keyDown(window, { key: 'z', metaKey: true, shiftKey: true }) // redo
    expect(r.undo).not.toHaveBeenCalled()
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })
    expect(r.undo).toHaveBeenCalledOnce()
    expect(onDone).toHaveBeenCalledOnce()
  })

  it('shows nothing with nothing removed', () => {
    const { container } = render(<UndoToast removal={null} onDone={vi.fn()} />)
    expect(container).toHaveTextContent('')
    fireEvent.keyDown(window, { key: 'z', metaKey: true })
  })
})
