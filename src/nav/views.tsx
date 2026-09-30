import type { ReactNode } from 'react'
import { GamepadIcon, GlobeIcon, PaletteIcon, PinIcon } from '../icons'

export type ViewId = 'explore' | 'visited' | 'games' | 'design'

/** The items in the main menu, in order */
export const VIEWS: { id: ViewId; label: string; icon: ReactNode }[] = [
  { id: 'explore', label: 'Explore', icon: <GlobeIcon /> },
  { id: 'visited', label: 'Visited', icon: <PinIcon /> },
  { id: 'games', label: 'Games', icon: <GamepadIcon /> },
  { id: 'design', label: 'Design', icon: <PaletteIcon /> },
]
