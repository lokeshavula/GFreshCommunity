import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Appearance } from 'react-native';

import { getStoredThemeMode, saveThemeMode } from '../services/themeService';
import { getColors, type AppColors, type ThemeMode } from './colors';

type ThemeContextValue = {
  theme: ThemeMode;
  colors: AppColors;
  isDark: boolean;
  isReady: boolean;
  setTheme: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

type Props = {
  children: ReactNode;
};

export function ThemeProvider({ children }: Props) {
  const [theme, setThemeState] = useState<ThemeMode>('light');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const stored = await getStoredThemeMode();
      if (!mounted) {
        return;
      }
      setThemeState(stored);
      Appearance.setColorScheme?.(stored);
      setIsReady(true);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
    Appearance.setColorScheme?.(mode);
    void saveThemeMode(mode);
  }, []);

  const colors = useMemo(() => getColors(theme), [theme]);
  const isDark = theme === 'dark';

  const value = useMemo(
    () => ({
      theme,
      colors,
      isDark,
      isReady,
      setTheme,
    }),
    [theme, colors, isDark, isReady, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
