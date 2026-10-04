import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BackupCard from './BackupCard'
import { LAST_BACKUP_KEY } from './backup'

const backupOf = (data: Record<string, unknown>, savedAt = '2026-09-30T08:00:00Z') =>
  new File([JSON.stringify({ app: 'meridian', version: 1, savedAt, data })], 'meridian-backup.json', {
    type: 'application/json',
  })

function pick(file: File) {
  fireEvent.change(screen.getByLabelText('Backup file'), { target: { files: [file] } })
}

describe('BackupCard', () => {
  let downloads: { name: string; blob: Blob }[]
  beforeEach(() => {
    downloads = []
    const blobs = new Map<string, Blob>()
    URL.createObjectURL = vi.fn((blob: Blob) => {
      const url = `blob:${blobs.size}`
      blobs.set(url, blob)
      return url
    })
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloads.push({ name: this.download, blob: blobs.get(this.href)! })
    })
    localStorage.setItem('countries-app.visited', JSON.stringify(['Denmark', 'Japan', 'Peru']))
    localStorage.setItem('countries-app.flights', JSON.stringify([{ id: 'a', from: 'CPH', to: 'NRT' }]))
  })
  afterEach(() => vi.restoreAllMocks())

  it("says what's in this browser, and that there's no backup yet", () => {
    render(<BackupCard />)
    expect(screen.getByText('In this browser: 3 places and 1 flight.')).toBeInTheDocument()
    expect(screen.getByText('No backup downloaded yet.')).toBeInTheDocument()
  })

  it('downloads a backup file with everything, and remembers when', async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 9, 4, 12) })
    render(<BackupCard />)
    await userEvent.click(screen.getByRole('button', { name: 'Download backup' }))
    vi.useRealTimers()
    expect(downloads).toHaveLength(1)
    expect(downloads[0].name).toBe('meridian-backup-2026-10-04.json')
    const backup = JSON.parse(await downloads[0].blob.text())
    expect(backup).toMatchObject({ app: 'meridian', data: { 'countries-app.visited': ['Denmark', 'Japan', 'Peru'] } })
    expect(screen.getByText('Last backup: 4 Oct 2026.')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(LAST_BACKUP_KEY)!)).toBe(backup.savedAt)
  })

  it('shows what a backup holds and restores it only when asked', async () => {
    const onRestored = vi.fn()
    render(<BackupCard onRestored={onRestored} />)
    pick(backupOf({ 'countries-app.visited': ['Kenya'], 'countries-app.visited-cities': [1, 2] }))
    const ask = await screen.findByRole('alertdialog', { name: 'Restore this backup?' })
    expect(ask).toHaveTextContent('Backup from 30 Sept 2026: 1 place and 2 cities.')
    expect(JSON.parse(localStorage.getItem('countries-app.visited')!)).toHaveLength(3) // nothing yet

    await userEvent.click(screen.getByRole('button', { name: 'Replace with this backup' }))
    expect(JSON.parse(localStorage.getItem('countries-app.visited')!)).toEqual(['Kenya'])
    expect(localStorage.getItem('countries-app.flights')).toBeNull() // the backup had none
    expect(onRestored).toHaveBeenCalled()
  })

  it('can be cancelled', async () => {
    render(<BackupCard onRestored={vi.fn()} />)
    pick(backupOf({ 'countries-app.visited': ['Kenya'] }))
    await screen.findByRole('alertdialog')
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('countries-app.visited')!)).toHaveLength(3)
  })

  it('says why a file is refused', async () => {
    render(<BackupCard onRestored={vi.fn()} />)
    pick(new File(['{"hello": 1}'], 'notes.json'))
    expect(await screen.findByRole('alert')).toHaveTextContent("This file isn't a Meridian backup.")
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    pick(backupOf({ 'countries-app.flights': 'everywhere' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Part of this backup is damaged'))
  })

  it('opens the file picker from the restore button', async () => {
    render(<BackupCard />)
    const input = screen.getByLabelText<HTMLInputElement>('Backup file')
    const click = vi.spyOn(input, 'click').mockImplementation(() => {})
    await userEvent.click(screen.getByRole('button', { name: 'Restore from a backup…' }))
    expect(click).toHaveBeenCalled()
  })
})
