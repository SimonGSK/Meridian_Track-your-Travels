import { useRef, useState, type ReactNode } from 'react'
import { readStored } from '../storage'
import Card from '../ui/Card'
import {
  BackupError,
  LAST_BACKUP_KEY,
  backupFileName,
  createBackup,
  describeBackup,
  readBackup,
  restoreBackup,
  summarize,
  type Backup,
} from './backup'

type Props = {
  /** After restoring: start over with the restored atlas */
  onRestored?: () => void
  /** A way back, above the rest */
  back?: ReactNode
}

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const isDateString = (value: unknown): value is string => typeof value === 'string' && !Number.isNaN(Date.parse(value))

/** Saving everything to a file, and restoring it here or in another browser */
export default function BackupCard({ onRestored = () => window.location.reload(), back }: Props) {
  const [lastBackup, setLastBackup] = useState(() => readStored(LAST_BACKUP_KEY, null, isDateString))
  const [pending, setPending] = useState<Backup | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const download = () => {
    const now = new Date()
    const backup = createBackup(localStorage, now)
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = backupFileName(now)
    link.click()
    URL.revokeObjectURL(url)
    try {
      localStorage.setItem(LAST_BACKUP_KEY, JSON.stringify(backup.savedAt))
    } catch {
      // Storage blocked: the file is saved all the same
    }
    setLastBackup(backup.savedAt)
  }

  const choose = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    setPending(null)
    try {
      setPending(readBackup(await file.text()))
    } catch (e) {
      setError(e instanceof BackupError ? e.message : "This file couldn't be read.")
    }
  }

  const restore = () => {
    if (!pending) return
    restoreBackup(pending)
    onRestored()
  }

  return (
    <Card label="Backup" className="backup">
      {back}
      <p className="muted">
        Your places, flights and records are saved in this browser only. Download a backup to keep them safe, or to
        move them to another browser.
      </p>
      <p className="backup-current">In this browser: {describeBackup(summarize(createBackup()))}.</p>
      <div className="card-actions">
        <button type="button" className="primary-button" onClick={download}>
          Download backup
        </button>
        <button type="button" className="link-button" onClick={() => fileInput.current?.click()}>
          Restore from a backup…
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          aria-label="Backup file"
          onChange={(e) => {
            void choose(e.target.files?.[0])
            e.target.value = '' // the same file can be picked again
          }}
        />
      </div>
      <p className="muted small">
        {lastBackup ? `Last backup: ${dateFormat.format(new Date(lastBackup))}.` : 'No backup downloaded yet.'}
      </p>

      {error && (
        <p className="input-hint" role="alert">
          {error}
        </p>
      )}
      {pending && (
        <div className="backup-restore" role="alertdialog" aria-label="Restore this backup?">
          <p>
            Backup from {dateFormat.format(new Date(pending.savedAt))}: {describeBackup(summarize(pending))}.
          </p>
          <p className="muted small">Restoring replaces everything in this browser now with what's in the backup.</p>
          <div className="card-actions">
            <button type="button" className="primary-button" onClick={restore}>
              Replace with this backup
            </button>
            <button type="button" className="link-button" onClick={() => setPending(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </Card>
  )
}
