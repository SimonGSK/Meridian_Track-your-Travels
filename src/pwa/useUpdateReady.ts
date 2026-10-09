import { useCallback, useEffect, useState } from 'react'
import { UPDATE_READY, waitingUpdate } from './update'

/** A new version waiting to take over, once there is one (see update.ts), and how to put the note about it away */
export function useUpdateReady() {
  const [worker, setWorker] = useState<ServiceWorker | null>(waitingUpdate)
  useEffect(() => {
    const onReady = (event: Event) => setWorker((event as CustomEvent<ServiceWorker>).detail)
    window.addEventListener(UPDATE_READY, onReady)
    return () => window.removeEventListener(UPDATE_READY, onReady)
  }, [])
  const dismiss = useCallback(() => setWorker(null), [])
  return [worker, dismiss] as const
}
