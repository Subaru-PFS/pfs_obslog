import { applyThemeToDom, getInitialTheme } from './components/Theme/themePreference'

try {
  applyThemeToDom(getInitialTheme())
} catch {
  // ignore
}
