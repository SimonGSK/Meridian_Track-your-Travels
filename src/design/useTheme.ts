import { useMemo } from 'react'
import { usePersistentState } from '../storage'
import { DEFAULT_THEME, THEMES, themeById } from '../globe/themes'

export const THEME_STORAGE_KEY = 'countries-app.theme'

const isThemeId = (value: unknown): value is string => THEMES.some((t) => t.id === value)

/** The chosen globe design, saved in this browser. */
export function useTheme() {
  const [id, setId] = usePersistentState(THEME_STORAGE_KEY, DEFAULT_THEME.id, isThemeId)
  const theme = useMemo(() => themeById(id), [id])
  return [theme, setId] as const
}
