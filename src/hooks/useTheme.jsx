import { createContext, useContext, useEffect, useCallback, useMemo } from 'react';
import useBillStore from '../store/useBillStore';

const THEME_KEY = 'splitbill-theme';
const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const darkMode = useBillStore((s) => s.settings?.darkMode ?? true);
  const updateSettings = useBillStore((s) => s.updateSettings);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    try {
      localStorage.setItem(THEME_KEY, darkMode ? 'dark' : 'light');
    } catch { /* noop */ }
  }, [darkMode]);

  const toggleTheme = useCallback(() => {
    updateSettings?.({ darkMode: !darkMode });
  }, [darkMode, updateSettings]);

  const setTheme = useCallback((theme) => {
    updateSettings?.({ darkMode: theme === 'dark' });
  }, [updateSettings]);

  const value = useMemo(() => ({
    theme: darkMode ? 'dark' : 'light',
    toggleTheme,
    setTheme,
  }), [darkMode, toggleTheme, setTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
