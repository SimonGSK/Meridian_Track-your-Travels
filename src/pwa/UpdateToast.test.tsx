import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UpdateToast from './UpdateToast'

describe('UpdateToast', () => {
  it('says a new version is ready, to reload into, or not now', async () => {
    const onReload = vi.fn()
    const onDismiss = vi.fn()
    render(<UpdateToast onReload={onReload} onDismiss={onDismiss} />)
    expect(screen.getByRole('status')).toHaveTextContent('A new version is ready')
    await userEvent.click(screen.getByRole('button', { name: 'Reload' }))
    expect(onReload).toHaveBeenCalledOnce()
    await userEvent.click(screen.getByRole('button', { name: 'Not now' }))
    expect(onDismiss).toHaveBeenCalledOnce()
  })
})
