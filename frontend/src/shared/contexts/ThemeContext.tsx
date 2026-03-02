import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { bgLayer } from '../../main';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as Theme) || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);

    const src = theme === 'light'
      ? new URL('../assets/bgWhite.png', import.meta.url).href
      : new URL('../assets/bgBlack.png', import.meta.url).href;

    bgLayer.classList.remove('bg-layer--loaded');
    bgLayer.style.backgroundImage = `url(${src})`;
    const img = new Image();
    img.onload = () => bgLayer.classList.add('bg-layer--loaded');
    img.src = src;
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
