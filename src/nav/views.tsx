import type { ReactNode } from 'react'
import { CompassIcon, GamepadIcon, PaletteIcon, PinIcon } from '../icons'

export type ViewId = 'explore' | 'visited' | 'games' | 'design'

/** The items in the main menu, in order */
export const VIEWS: { id: ViewId; label: string; icon: ReactNode }[] = [
  { id: 'explore', label: 'Explore', icon: <CompassIcon size={20} /> },
  { id: 'visited', label: 'Visited', icon: <PinIcon size={20} /> },
  { id: 'games', label: 'Games', icon: <GamepadIcon size={20} /> },
  { id: 'design', label: 'Design', icon: <PaletteIcon size={20} /> },
]
