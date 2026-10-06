import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CompareCard from './CompareCard'
import { comparisonOf, readShared, shareLink, type Friend } from './friend'

const YOURS = new Set(['Japan', 'France', 'Denmark'])
const ANNA: Friend = { name: 'Anna', places: ['Peru', 'Japan', 'Chile'] }

function setup(friend: Friend | null = null, shown = false) {
  const props = {
    visited: YOURS,
    friend,
    comparison: friend ? comparisonOf(YOURS, friend) : null,
    onFriend: vi.fn(),
    shown,
    onShownChange: vi.fn(),
    wishlist: new Set(['Chile']),
    onWish: vi.fn(),
    onShow: vi.fn(),
  }
  render(<CompareCard {...props} />)
  return props
}

describe('CompareCard', () => {
  afterEach(() => vi.restoreAllMocks())

  it('copies your link, with your name and places', async () => {
    const writeText = vi.fn((_text: string) => Promise.resolve())
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    setup()
    expect(screen.getByText('With your 3 places, as they are now.')).toBeInTheDocument()
    await userEvent.type(screen.getByRole('textbox', { name: 'Your name, for your friend' }), 'Simon')
    await userEvent.click(screen.getByRole('button', { name: 'Copy my link' }))
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument()
    expect(readShared(writeText.mock.calls[0][0])).toEqual({ name: 'Simon', places: ['Japan', 'France', 'Denmark'] })
  })

  it("compares with a friend's link pasted in, and shows them on the globe", async () => {
    const { onFriend, onShownChange } = setup()
    await userEvent.type(screen.getByRole('textbox', { name: "Your friend's link" }), shareLink('Anna', ANNA.places, 'https://m.test/'))
    await userEvent.click(screen.getByRole('button', { name: 'Compare' }))
    expect(onFriend).toHaveBeenCalledWith(ANNA)
    expect(onShownChange).toHaveBeenCalledWith(true)
  })

  it("says when what's pasted isn't a link", async () => {
    const { onFriend } = setup()
    await userEvent.type(screen.getByRole('textbox', { name: "Your friend's link" }), 'hello{Enter}')
    expect(screen.getByText(/That isn't a Meridian link/)).toBeInTheDocument()
    expect(onFriend).not.toHaveBeenCalled()
  })

  it('shows how you compare, and where only one of you has been', () => {
    setup(ANNA, true)
    expect(screen.getByRole('region', { name: 'Compare with a friend' })).toHaveTextContent('ANNA')
    expect(screen.getByLabelText('You and Anna')).toHaveTextContent(/You\s*3\s*Both\s*1\s*Anna\s*3/)
    const names = (label: string) => within(screen.getByRole('list', { name: label })).getAllByRole('listitem').map((li) => li.textContent)
    expect(names('Only Anna')).toEqual(['Chile', 'Peru'])
    expect(names('Both of you')).toEqual(['Japan'])
    expect(names('Only you')).toEqual(['Denmark', 'France'])
    expect(screen.getByRole('switch', { name: 'Show Anna on the globe' })).toBeChecked()
  })

  it("puts a place only your friend has been on your wishlist, opens one, hides your friend, or removes them", async () => {
    const { onWish, onShow, onShownChange, onFriend } = setup(ANNA, true)
    expect(screen.getByRole('button', { name: 'Chile is on your wishlist' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Add Peru to your wishlist' }))
    expect(onWish).toHaveBeenCalledWith('Peru')
    await userEvent.click(screen.getByRole('button', { name: 'Japan' }))
    expect(onShow).toHaveBeenCalledWith(expect.objectContaining({ properties: expect.objectContaining({ name: 'Japan' }) }))
    await userEvent.click(screen.getByRole('switch', { name: 'Show Anna on the globe' }))
    expect(onShownChange).toHaveBeenCalledWith(false)
    await userEvent.click(screen.getByRole('button', { name: 'Remove Anna' }))
    expect(onFriend).toHaveBeenCalledWith(null)
  })
})
