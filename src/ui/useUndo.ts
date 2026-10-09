import { useCallback, useState } from 'react'

/** Something just removed, and how to put it back */
export type Removal = { message: string; undo: () => void }

/** The last thing removed, to offer to undo (see UndoToast): a new one replaces it */
export function useUndo() {
  const [removal, setRemoval] = useState<Removal | null>(null)
  const offerUndo = useCallback((message: string, undo: () => void) => setRemoval({ message, undo }), [])
  const clearRemoval = useCallback(() => setRemoval(null), [])
  return { removal, offerUndo, clearRemoval }
}
