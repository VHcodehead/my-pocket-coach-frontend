// Theme context for dark/light mode switching
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTheme, type Theme } from '../theme';

export type ThemeMode = 'light' | 'dark' | 'auto';
export type ActiveTheme = 'light' | 'dark';

interface ThemeContextType {
  themeMode: ThemeMode;
  activeTheme: ActiveTheme;
  setThemeMode: (mode: ThemeMode) => void;
  isDark: boolean;
  theme: Theme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('auto');
  const [activeTheme, setActiveTheme] = useState<ActiveTheme>('light');

  useEffect(() => {
    loadThemePreference();
  }, []);

  useEffect(() => {
    // Update active theme based on mode and system preference
    if (themeMode === 'auto') {
      setActiveTheme(systemColorScheme === 'dark' ? 'dark' : 'light');
    } else {
      setActiveTheme(themeMode);
    }
  }, [themeMode, systemColorScheme]);

  const loadThemePreference = async () => {
    try {
      const stored = await AsyncStorage.getItem('theme_mode');
      if (stored) {
        setThemeModeState(stored as ThemeMode);
      }
    } catch (error) {
      console.error('[THEME] Error loading preference:', error);
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      setThemeModeState(mode);
      await AsyncStorage.setItem('theme_mode', mode);
    } catch (error) {
      console.error('[THEME] Error saving preference:', error);
    }
  };

  const isDark = activeTheme === 'dark';
  const currentTheme = getTheme(isDark);

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        activeTheme,
        setThemeMode,
        isDark,
        theme: currentTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
