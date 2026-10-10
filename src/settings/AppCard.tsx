import type { ReactNode } from 'react'
import { isIos, useInstall } from '../pwa/install'
import { CheckIcon } from '../icons'
import Card from '../ui/Card'

/** Installing Meridian as an app, and using it offline. `back` is a way back, above the rest. */
export default function AppCard({ back }: { back?: ReactNode }) {
  const { canInstall, installed, install } = useInstall()
  return (
    <Card label="App" meta="OFFLINE">
      {back}
      <p className="muted">
        Install Meridian as an app: it opens in its own window, from your home screen or dock. Once opened, it works
        without internet too: the globe, your places and the games.
      </p>
      {installed ? (
        <p className="app-installed">
          <CheckIcon size={16} /> You're using the app.
        </p>
      ) : canInstall ? (
        <div className="card-actions">
          <button type="button" className="primary-button" onClick={() => void install()}>
            Install Meridian
          </button>
        </div>
      ) : isIos() ? (
        <p>On iPhone or iPad: in Safari, tap Share, then Add to Home Screen.</p>
      ) : (
        <p>
          In Chrome or Edge, click the install icon at the end of the address bar, or Install Meridian in the browser's
          menu. In Safari on a Mac: File › Add to Dock.
        </p>
      )}
    </Card>
  )
}
