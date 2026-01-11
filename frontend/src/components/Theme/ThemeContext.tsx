import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'

import {
  applyThemeToDom,
  getInitialTheme,
  persistThemePreference,
  type Theme as ThemeType,
} from './themePreference'
export type { Theme } from './themePreference'

interface ThemeContextValue {
  theme: ThemeType
  toggleTheme: () => void
  setTheme: (theme: ThemeType) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeType>(getInitialTheme)

  const setTheme = useCallback((newTheme: ThemeType) => {
    setThemeState(newTheme)
    persistThemePreference(newTheme)
    applyThemeToDom(newTheme)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }, [theme, setTheme])

  // Apply theme on mount and changes
  useEffect(() => {
    applyThemeToDom(theme)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

/**
 * Hook to access the current theme and theme-related functions.
 * Must be used within a ThemeProvider.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
