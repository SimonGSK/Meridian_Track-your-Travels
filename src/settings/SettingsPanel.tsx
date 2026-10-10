import { useId, type ReactNode } from 'react'
import ScreensaverCard from '../design/ScreensaverCard'
import { ChevronIcon, DownloadIcon, MonitorIcon, PhoneIcon } from '../icons'
import { useInstall } from '../pwa/install'
import AppCard from './AppCard'
import BackupCard from './BackupCard'

export type SettingId = 'backup' | 'app' | 'screensaver'

type Props = {
  /** The setting opened, or null for the list of them */
  open: SettingId | null
  onOpen: (id: SettingId | null) => void
  /** Shows the screensaver in the app, to have a look */
  onPreview: () => void
}

/** The settings as small cards, each opening to all of it, with a way back to the others */
export default function SettingsPanel({ open, onOpen, onPreview }: Props) {
  const { installed } = useInstall()

  const back = (
    <button type="button" className="text-button settings-back" onClick={() => onOpen(null)}>
      ← All settings
    </button>
  )
  if (open === 'backup') return <BackupCard back={back} />
  if (open === 'app') return <AppCard back={back} />
  if (open === 'screensaver') return <ScreensaverCard onPreview={onPreview} back={back} />

  return (
    <ul className="settings-list" aria-label="Settings">
      <Setting icon={<DownloadIcon size={18} />} title="Backup" onOpen={() => onOpen('backup')}>
        Keep your places safe in a file
      </Setting>
      <Setting icon={<PhoneIcon size={18} />} title="App" onOpen={() => onOpen('app')}>
        {installed ? 'Installed, and works offline' : 'Install Meridian, and use it offline'}
      </Setting>
      <Setting icon={<MonitorIcon size={18} />} title="Screensaver" onOpen={() => onOpen('screensaver')}>
        The globe as a Mac screensaver
      </Setting>
    </ul>
  )
}

/** One setting's card: its name, a line on what's in it, and an arrow in */
function Setting({ icon, title, onOpen, children }: {
  icon: ReactNode
  title: string
  onOpen: () => void
  children: ReactNode
}) {
  const name = useId()
  const about = useId()
  return (
    <li>
      <button type="button" className="settings-option" aria-labelledby={name} aria-describedby={about} onClick={onOpen}>
        <span className="settings-icon">{icon}</span>
        <span className="settings-text">
          <strong id={name}>{title}</strong>
          <span id={about} className="muted">
            {children}
          </span>
        </span>
        <ChevronIcon size={16} />
      </button>
    </li>
  )
}
