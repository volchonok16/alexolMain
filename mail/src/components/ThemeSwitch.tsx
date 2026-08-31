import { Sun, Moon } from 'lucide-react'
import { useThemeStore } from '../store/themeStore'

export function ThemeSwitch() {
  const theme = useThemeStore((state) => state.theme)
  const toggleTheme = useThemeStore((state) => state.toggleTheme)
  const isLight = theme === 'light'

  return (
    <button
      type="button"
      className="theme-switch"
      onClick={toggleTheme}
      aria-label={isLight ? 'Включить тёмную тему' : 'Включить светлую тему'}
      title={isLight ? 'Тёмная тема' : 'Светлая тема'}
    >
      {isLight ? <Moon size={20} /> : <Sun size={20} />}
    </button>
  )
}
