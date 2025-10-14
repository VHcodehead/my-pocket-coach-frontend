// Deep Blue Focus - Spotify-inspired dark theme with electric blue accent
export const lightTheme = {
  colors: {
    // Deep charcoal backgrounds (consistent, no gradients)
    background: '#0F1419',       // Deep charcoal (softer than pure black)
    surface: '#1A1F29',          // Elevated charcoal (ALL cards)
    surfaceLight: '#252A35',     // Subtle elevation

    // Electric blue accent (ONE signature color for all interactive elements)
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

    // UI elements - consistent throughout
    border: '#0EA5E9',           // Electric blue for emphasis
    borderLight: '#1E293B',      // Subtle gray border
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
    // Cyberpunk dark backgrounds
    background: '#0A1628',       // Deep navy (matches icon bg)
    surface: '#0F1F3D',          // Slightly lighter surface
    surfaceLight: '#1A2947',     // Elevated surfaces

    // Neon blue primary colors (cyberpunk aesthetic)
    primary: '#00D9FF',          // Bright neon cyan
    primaryDark: '#0099CC',
    primaryLight: '#33E5FF',

    // Accent colors - cyberpunk palette
    secondary: '#00FFB3',        // Neon green
    accent: '#FF00E5',           // Neon magenta
    success: '#00FFB3',
    warning: '#FFD600',          // Neon yellow
    error: '#FF0055',            // Neon red

    // Text colors - high contrast for readability
    text: '#FFFFFF',             // Pure white for max contrast
    textSecondary: '#A0D4FF',    // Light cyan tint
    textTertiary: '#6B8FB3',
    textMuted: '#4A6B8C',

    // UI elements with glow
    border: '#00D9FF40',         // Neon blue with transparency
    borderLight: '#00D9FF20',
    disabled: '#3E4A59',
    shadow: '#000000',

    // Macro colors - neon cyberpunk palette
    protein: '#FF00E5',          // Neon magenta
    carbs: '#00D9FF',            // Neon cyan
    fat: '#FFD600',              // Neon yellow
    calories: '#B84FFF',         // Neon purple

    // Coach-specific colors
    coachMessage: '#0F1F3D',     // Dark surface
    coachAccent: '#00D9FF',      // Neon cyan
    encouragement: '#00FFB3',    // Neon green
    motivation: '#FF00E5',       // Neon magenta
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

// Default to light theme (now cyberpunk neon blue)
export const theme = lightTheme;

export type Theme = typeof lightTheme;
