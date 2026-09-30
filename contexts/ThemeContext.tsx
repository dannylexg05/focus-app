// contexts/ThemeContext.tsx
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import { AppTheme, ThemeMode, getTheme } from '../constants/theme';
import { getSettings, saveSettings } from '../services/storage';
import { ThemePreference } from '../types/settings';

interface ThemeContextValue {
  theme: AppTheme;
  themePreference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    getSettings().then((settings) => setThemePreferenceState(settings.themePreference));
  }, []);

  const setThemePreference = (pref: ThemePreference) => {
    setThemePreferenceState(pref);
    getSettings().then((settings) => saveSettings({ ...settings, themePreference: pref }));
  };

  const mode: ThemeMode =
    themePreference === 'system'
      ? systemScheme === 'dark'
        ? 'dark'
        : 'light'
      : themePreference;

  const theme = useMemo(() => getTheme(mode), [mode]);

  return (
    <ThemeContext.Provider value={{ theme, themePreference, setThemePreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useAppTheme debe usarse dentro de <ThemeProvider>');
  }
  return ctx;
}
