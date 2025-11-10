// Light theme - Clean and bright
export const lightTheme = {
  colors: {
    // Light backgrounds
    background: '#F8FAFC',       // Soft white/gray
    surface: '#FFFFFF',          // Pure white cards
    surfaceLight: '#F1F5F9',     // Subtle elevation

    // Electric blue accent
    primary: '#0EA5E9',          // Electric blue
    primaryDark: '#0284C7',
    primaryLight: '#38BDF8',

    // Status colors
    secondary: '#10B981',        // Emerald green (success)
    accent: '#0EA5E9',           // Electric blue (same as primary)
    success: '#10B981',          // Emerald green
    warning: '#F59E0B',          // Amber
    error: '#EF4444',            // Red

    // Text colors - dark on light
    text: '#0F172A',             // Dark slate
    textSecondary: '#475569',    // Medium gray
    textTertiary: '#64748B',     // Light gray
    textMuted: '#94A3B8',        // Lighter gray

    // UI elements
    border: '#E2E8F0',           // Light gray border
    borderLight: '#F1F5F9',      // Subtle border
    disabled: '#CBD5E1',
    shadow: '#000000',

    // Macro colors - vibrant for data visualization
    protein: '#EC4899',          // Pink/magenta
    carbs: '#0EA5E9',            // Electric blue
    fat: '#F59E0B',              // Amber
    calories: '#8B5CF6',         // Purple

    // Coach-specific colors
    coachMessage: '#FFFFFF',     // White surface
    coachAccent: '#0EA5E9',      // Electric blue
    encouragement: '#10B981',    // Emerald green
    motivation: '#0EA5E9',       // Electric blue
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  borderRadius: {
    sm: 12,
    md: 16,
    lg: 16,
    xl: 16,
    full: 9999,
  },

  fontSize: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 19,
    xxl: 22,
    xxxl: 28,
    display: 36,
  },

  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },

  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.5,
      shadowRadius: 16,
      elevation: 8,
    },
    coach: {
      shadowColor: '#0EA5E9',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 3,
    },
    neon: {
      shadowColor: '#0EA5E9',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 5,
    },
  },
};

export const darkTheme = {
  colors: {
    // Deep charcoal backgrounds
    background: '#0F1419',       // Deep charcoal
    surface: '#1A1F29',          // Elevated charcoal
    surfaceLight: '#252A35',     // Subtle elevation

    // Electric blue accent
    primary: '#0EA5E9',          // Electric blue
    primaryDark: '#0284C7',
    primaryLight: '#38BDF8',

    // Status colors
    secondary: '#10B981',        // Emerald green (success)
    accent: '#0EA5E9',           // Electric blue (same as primary)
    success: '#10B981',          // Emerald green
    warning: '#F59E0B',          // Amber
    error: '#EF4444',            // Red

    // Text colors - soft and readable
    text: '#F8FAFC',             // Soft white
    textSecondary: '#94A3B8',    // Gray
    textTertiary: '#64748B',     // Medium gray
    textMuted: '#475569',        // Dark gray

    // UI elements
    border: '#1E293B',           // Subtle gray border
    borderLight: '#1E293B',      // Subtle border
    disabled: '#334155',
    shadow: '#000000',

    // Macro colors - vibrant for data visualization
    protein: '#EC4899',          // Pink/magenta
    carbs: '#0EA5E9',            // Electric blue
    fat: '#F59E0B',              // Amber
    calories: '#8B5CF6',         // Purple

    // Coach-specific colors
    coachMessage: '#1A1F29',     // Same as surface
    coachAccent: '#0EA5E9',      // Electric blue
    encouragement: '#10B981',    // Emerald green
    motivation: '#0EA5E9',       // Electric blue
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  borderRadius: {
    sm: 12,
    md: 16,
    lg: 16,
    xl: 16,
    full: 9999,
  },

  fontSize: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 19,
    xxl: 22,
    xxxl: 28,
    display: 36,
  },

  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },

  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 2,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    coach: {
      shadowColor: '#00D9FF',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.5,
      shadowRadius: 8,
      elevation: 3,
    },
    neon: {
      shadowColor: '#00D9FF',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 16,
      elevation: 8,
    },
  },
};

// Default to dark theme for backward compatibility
export const theme = darkTheme;

export type Theme = typeof lightTheme;

// Helper function to get theme based on active theme mode
export const getTheme = (isDark: boolean): Theme => {
  return isDark ? darkTheme : lightTheme;
};
