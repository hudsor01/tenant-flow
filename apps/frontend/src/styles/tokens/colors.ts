/**
 * Design Token System - Color Tokens
 * Using OKLCH for perceptual uniformity and accessibility
 * 
 * Structure:
 * 1. Primitive tokens (raw values)
 * 2. Semantic tokens (purpose-based)
 * 3. Component tokens (component-specific)
 */

// ============================================
// PRIMITIVE COLOR TOKENS
// ============================================

export const primitiveColors = {
  // Steel Blue Spectrum (Primary)
  steel: {
    50: 'oklch(0.96 0.02 235)',  // Very light steel
    100: 'oklch(0.92 0.04 235)',
    200: 'oklch(0.84 0.08 235)',
    300: 'oklch(0.74 0.12 235)',
    400: 'oklch(0.62 0.16 235)',
    500: 'oklch(0.52 0.18 235)',  // Main primary
    600: 'oklch(0.44 0.16 235)',
    700: 'oklch(0.38 0.14 235)',
    800: 'oklch(0.32 0.10 235)',
    900: 'oklch(0.26 0.06 235)',
    950: 'oklch(0.20 0.04 235)',  // Very dark steel
  },
  
  // Teal Spectrum (Accent)
  teal: {
    50: 'oklch(0.96 0.02 185)',
    100: 'oklch(0.91 0.04 185)',
    200: 'oklch(0.82 0.08 185)',
    300: 'oklch(0.72 0.12 185)',
    400: 'oklch(0.62 0.14 185)',
    500: 'oklch(0.55 0.15 185)',  // Main accent
    600: 'oklch(0.48 0.14 185)',
    700: 'oklch(0.41 0.12 185)',
    800: 'oklch(0.34 0.09 185)',
    900: 'oklch(0.28 0.06 185)',
    950: 'oklch(0.22 0.04 185)',
  },
  
  // Charcoal Spectrum (Neutral)
  charcoal: {
    50: 'oklch(0.98 0.005 240)',
    100: 'oklch(0.96 0.005 240)',
    200: 'oklch(0.91 0.005 240)',
    300: 'oklch(0.83 0.005 240)',
    400: 'oklch(0.64 0.005 240)',
    500: 'oklch(0.50 0.005 240)',
    600: 'oklch(0.40 0.005 240)',
    700: 'oklch(0.32 0.005 240)',
    800: 'oklch(0.25 0.005 240)',  // Main charcoal
    900: 'oklch(0.18 0.005 240)',
    950: 'oklch(0.12 0.005 240)',
  },
  
  // Success (Green)
  success: {
    50: 'oklch(0.97 0.02 145)',
    100: 'oklch(0.93 0.04 145)',
    200: 'oklch(0.86 0.09 145)',
    300: 'oklch(0.76 0.15 145)',
    400: 'oklch(0.65 0.18 145)',
    500: 'oklch(0.55 0.19 145)',  // Main success
    600: 'oklch(0.46 0.17 145)',
    700: 'oklch(0.39 0.14 145)',
    800: 'oklch(0.33 0.11 145)',
    900: 'oklch(0.28 0.08 145)',
  },
  
  // Warning (Amber)
  warning: {
    50: 'oklch(0.97 0.02 90)',
    100: 'oklch(0.94 0.05 90)',
    200: 'oklch(0.88 0.12 90)',
    300: 'oklch(0.80 0.18 90)',
    400: 'oklch(0.72 0.20 90)',
    500: 'oklch(0.65 0.19 90)',  // Main warning
    600: 'oklch(0.57 0.17 90)',
    700: 'oklch(0.48 0.14 90)',
    800: 'oklch(0.40 0.11 90)',
    900: 'oklch(0.34 0.08 90)',
  },
  
  // Error (Red)
  error: {
    50: 'oklch(0.97 0.02 25)',
    100: 'oklch(0.93 0.04 25)',
    200: 'oklch(0.86 0.09 25)',
    300: 'oklch(0.76 0.15 25)',
    400: 'oklch(0.65 0.20 25)',
    500: 'oklch(0.54 0.22 25)',  // Main error
    600: 'oklch(0.46 0.20 25)',
    700: 'oklch(0.39 0.17 25)',
    800: 'oklch(0.33 0.14 25)',
    900: 'oklch(0.29 0.10 25)',
  },
  
  // Info (Blue)
  info: {
    50: 'oklch(0.97 0.02 235)',
    100: 'oklch(0.94 0.04 235)',
    200: 'oklch(0.87 0.08 235)',
    300: 'oklch(0.78 0.13 235)',
    400: 'oklch(0.67 0.17 235)',
    500: 'oklch(0.58 0.18 235)',  // Main info
    600: 'oklch(0.49 0.17 235)',
    700: 'oklch(0.42 0.15 235)',
    800: 'oklch(0.35 0.12 235)',
    900: 'oklch(0.30 0.09 235)',
  },
} as const;

// ============================================
// SEMANTIC COLOR TOKENS
// ============================================

export const semanticColors = {
  // Background colors
  background: {
    primary: primitiveColors.charcoal[50],     // Main background
    secondary: primitiveColors.charcoal[100],  // Card backgrounds
    tertiary: primitiveColors.charcoal[200],   // Hover states
    inverse: primitiveColors.charcoal[900],    // Dark backgrounds
  },
  
  // Foreground colors
  foreground: {
    primary: primitiveColors.charcoal[900],    // Main text
    secondary: primitiveColors.charcoal[700],  // Secondary text
    muted: primitiveColors.charcoal[500],      // Muted text
    inverse: primitiveColors.charcoal[50],     // Light text on dark
  },
  
  // Border colors
  border: {
    default: primitiveColors.charcoal[200],
    strong: primitiveColors.charcoal[300],
    subtle: primitiveColors.charcoal[100],
  },
  
  // Interactive states
  interactive: {
    primary: {
      default: primitiveColors.steel[500],
      hover: primitiveColors.steel[600],
      active: primitiveColors.steel[700],
      disabled: primitiveColors.steel[300],
    },
    accent: {
      default: primitiveColors.teal[500],
      hover: primitiveColors.teal[600],
      active: primitiveColors.teal[700],
      disabled: primitiveColors.teal[300],
    },
  },
  
  // Feedback colors
  feedback: {
    success: {
      background: primitiveColors.success[50],
      border: primitiveColors.success[200],
      text: primitiveColors.success[700],
      icon: primitiveColors.success[500],
    },
    warning: {
      background: primitiveColors.warning[50],
      border: primitiveColors.warning[200],
      text: primitiveColors.warning[700],
      icon: primitiveColors.warning[500],
    },
    error: {
      background: primitiveColors.error[50],
      border: primitiveColors.error[200],
      text: primitiveColors.error[700],
      icon: primitiveColors.error[500],
    },
    info: {
      background: primitiveColors.info[50],
      border: primitiveColors.info[200],
      text: primitiveColors.info[700],
      icon: primitiveColors.info[500],
    },
  },
} as const;

// ============================================
// COMPONENT COLOR TOKENS
// ============================================

export const componentColors = {
  button: {
    primary: {
      background: semanticColors.interactive.primary.default,
      text: semanticColors.foreground.inverse,
      border: 'transparent',
      hover: {
        background: semanticColors.interactive.primary.hover,
        text: semanticColors.foreground.inverse,
        border: 'transparent',
      },
    },
    secondary: {
      background: semanticColors.background.secondary,
      text: semanticColors.foreground.primary,
      border: semanticColors.border.default,
      hover: {
        background: semanticColors.background.tertiary,
        text: semanticColors.foreground.primary,
        border: semanticColors.border.strong,
      },
    },
    ghost: {
      background: 'transparent',
      text: semanticColors.foreground.primary,
      border: 'transparent',
      hover: {
        background: semanticColors.background.secondary,
        text: semanticColors.foreground.primary,
        border: 'transparent',
      },
    },
    danger: {
      background: primitiveColors.error[500],
      text: semanticColors.foreground.inverse,
      border: 'transparent',
      hover: {
        background: primitiveColors.error[600],
        text: semanticColors.foreground.inverse,
        border: 'transparent',
      },
    },
  },
  
  input: {
    background: semanticColors.background.primary,
    text: semanticColors.foreground.primary,
    placeholder: semanticColors.foreground.muted,
    border: semanticColors.border.default,
    focus: {
      border: semanticColors.interactive.primary.default,
      ring: `${primitiveColors.steel[500]}33`, // 20% opacity
    },
    error: {
      border: primitiveColors.error[500],
      ring: `${primitiveColors.error[500]}33`,
    },
  },
  
  card: {
    background: semanticColors.background.secondary,
    border: semanticColors.border.default,
    hover: {
      background: semanticColors.background.tertiary,
      border: semanticColors.border.strong,
    },
  },
  
  badge: {
    default: {
      background: semanticColors.background.tertiary,
      text: semanticColors.foreground.secondary,
    },
    primary: {
      background: `${primitiveColors.steel[500]}20`,
      text: primitiveColors.steel[700],
    },
    success: {
      background: semanticColors.feedback.success.background,
      text: semanticColors.feedback.success.text,
    },
    warning: {
      background: semanticColors.feedback.warning.background,
      text: semanticColors.feedback.warning.text,
    },
    error: {
      background: semanticColors.feedback.error.background,
      text: semanticColors.feedback.error.text,
    },
  },
  
  alert: {
    default: {
      background: semanticColors.background.secondary,
      border: semanticColors.border.default,
      icon: semanticColors.foreground.secondary,
      text: semanticColors.foreground.primary,
    },
    success: semanticColors.feedback.success,
    warning: semanticColors.feedback.warning,
    error: semanticColors.feedback.error,
    info: semanticColors.feedback.info,
  },
  
  navigation: {
    background: semanticColors.background.secondary,
    item: {
      text: semanticColors.foreground.secondary,
      hover: {
        background: semanticColors.background.tertiary,
        text: semanticColors.foreground.primary,
      },
      active: {
        background: `${primitiveColors.steel[500]}15`,
        text: primitiveColors.steel[600],
        border: primitiveColors.steel[500],
      },
    },
  },
  
  table: {
    header: {
      background: semanticColors.background.tertiary,
      text: semanticColors.foreground.secondary,
      border: semanticColors.border.default,
    },
    row: {
      background: semanticColors.background.primary,
      text: semanticColors.foreground.primary,
      border: semanticColors.border.subtle,
      hover: {
        background: semanticColors.background.secondary,
      },
      striped: {
        background: semanticColors.background.secondary,
      },
    },
  },
} as const;

// Type exports for TypeScript support
export type PrimitiveColors = typeof primitiveColors;
export type SemanticColors = typeof semanticColors;
export type ComponentColors = typeof componentColors;