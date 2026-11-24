import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ThemeMode } from '../theme/colors';

const THEME_KEY = '@gfm_theme_mode';

export async function getStoredThemeMode(): Promise<ThemeMode> {
  try {
    const value = await AsyncStorage.getItem(THEME_KEY);
    if (value === 'dark' || value === 'light') {
      return value;
    }
  } catch {
    // keep default
  }
  return 'light';
}

export async function saveThemeMode(mode: ThemeMode): Promise<void> {
  try {
    await AsyncStorage.setItem(THEME_KEY, mode);
  } catch {
    // ignore persistence errors
  }
}
