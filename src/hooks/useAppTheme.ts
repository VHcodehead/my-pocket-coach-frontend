// Hook to get the current theme based on dark mode setting
import { useTheme as useThemeContext } from '../contexts/ThemeContext';
import { lightTheme, darkTheme, Theme } from '../theme';

export function useAppTheme(): Theme {
  const { activeTheme } = useThemeContext();
  return activeTheme === 'dark' ? darkTheme : lightTheme;
}
