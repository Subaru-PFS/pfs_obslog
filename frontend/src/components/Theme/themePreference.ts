export type Theme = 'light' | 'dark'

export const STORAGE_KEY = 'pfs-obslog-theme'

function isTheme(value: string | null): value is Theme {
  return value === 'light' || value === 'dark'
}

export function getStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return isTheme(stored) ? stored : null
  } catch {
    return null
  }
}

export function getSystemTheme(): Theme {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function getInitialTheme(): Theme {
  return getStoredTheme() ?? getSystemTheme()
}

export function applyThemeToDom(theme: Theme): void {
  document.documentElement.dataset.theme = theme
}

export function persistThemePreference(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // ignore
  }
}
