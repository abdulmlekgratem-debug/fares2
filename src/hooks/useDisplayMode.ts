import { useState, useEffect, useCallback } from 'react'

export type DisplayMode = 'compact' | 'comfortable'

interface DisplayModeConfig {
  mode: DisplayMode
  toggleMode: () => void
  setMode: (mode: DisplayMode) => void
  // Text sizes
  textXs: string
  textSm: string
  textBase: string
  textLg: string
  textXl: string
  text2xl: string
  // Spacing
  spacingXs: string
  spacingSm: string
  spacingMd: string
  spacingLg: string
  // Padding
  paddingXs: string
  paddingSm: string
  paddingMd: string
  paddingLg: string
  // Card sizes
  cardPadding: string
  cardGap: string
  // Icon sizes
  iconSm: string
  iconMd: string
  iconLg: string
}

const STORAGE_KEY = 'display-mode'

export function useDisplayMode(): DisplayModeConfig {
  const [mode, setModeState] = useState<DisplayMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved === 'compact' || saved === 'comfortable') {
        return saved
      }
      // Default to compact on mobile
      return window.innerWidth < 768 ? 'compact' : 'comfortable'
    }
    return 'comfortable'
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode)
    // Add class to document for global CSS targeting
    document.documentElement.classList.remove('display-compact', 'display-comfortable')
    document.documentElement.classList.add(`display-${mode}`)
  }, [mode])

  const toggleMode = useCallback(() => {
    setModeState(prev => prev === 'compact' ? 'comfortable' : 'compact')
  }, [])

  const setMode = useCallback((newMode: DisplayMode) => {
    setModeState(newMode)
  }, [])

  const isCompact = mode === 'compact'

  return {
    mode,
    toggleMode,
    setMode,
    // Text sizes - smaller in compact mode
    textXs: isCompact ? 'text-[10px]' : 'text-xs',
    textSm: isCompact ? 'text-xs' : 'text-sm',
    textBase: isCompact ? 'text-sm' : 'text-base',
    textLg: isCompact ? 'text-base' : 'text-lg',
    textXl: isCompact ? 'text-lg' : 'text-xl',
    text2xl: isCompact ? 'text-xl' : 'text-2xl',
    // Spacing
    spacingXs: isCompact ? 'space-y-0.5' : 'space-y-1',
    spacingSm: isCompact ? 'space-y-1' : 'space-y-2',
    spacingMd: isCompact ? 'space-y-2' : 'space-y-3',
    spacingLg: isCompact ? 'space-y-3' : 'space-y-4',
    // Padding
    paddingXs: isCompact ? 'p-1' : 'p-2',
    paddingSm: isCompact ? 'p-2' : 'p-3',
    paddingMd: isCompact ? 'p-3' : 'p-4',
    paddingLg: isCompact ? 'p-4' : 'p-6',
    // Card sizes
    cardPadding: isCompact ? 'p-3' : 'p-5',
    cardGap: isCompact ? 'gap-2' : 'gap-3',
    // Icon sizes
    iconSm: isCompact ? 'w-3 h-3' : 'w-4 h-4',
    iconMd: isCompact ? 'w-4 h-4' : 'w-5 h-5',
    iconLg: isCompact ? 'w-5 h-5' : 'w-6 h-6',
  }
}
