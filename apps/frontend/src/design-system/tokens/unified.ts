/**
 * TenantFlow Design System - Unified Token System
 * Single source of truth for all design tokens, combining JSON tokens with CSS custom properties
 * Apple-inspired design with OKLCH color space and Roboto Flex typography
 */

// ============================================================================
// TYPOGRAPHY TOKENS
// ============================================================================

export const typography = {
  // Font Family
  fontFamily: {
    default: "'Roboto Flex', 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif",
    monospace: "ui-monospace, SFMono-Regular, 'SF Mono', Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"
  },

  // Apple-inspired typography scale
  fontSize: {
    'large-title': '26px',
    'title-1': '22px',
    'title-2': '17px',
    'title-3': '15px',
    'headline': '13px',
    'body': '13px',
    'callout': '12px',
    'subheadline': '11px',
    'footnote': '10px',
    'caption-1': '10px',
    'caption-2': '9px'
  },

  // Line heights optimized for readability
  lineHeight: {
    'large-title': 1.231,
    'title-1': 1.182,
    'title-2': 1.294,
    'title-3': 1.333,
    'headline': 1.231,
    'body': 1.231,
    'callout': 1.25,
    'subheadline': 1.273,
    'footnote': 1.3,
    'caption': 1.3
  },

  // Letter spacing for optical precision
  letterSpacing: {
    'large-title': '0px',
    'title': '0px',
    'headline': '0px',
    'body': '0px',
    'subheadline': '0px',
    'footnote': '0px',
    'caption': '0px'
  },

  // Font weights
  fontWeight: {
    thin: 100,
    extralight: 200,
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900
  }
} as const

// ============================================================================
// COLOR TOKENS (OKLCH Color Space)
// ============================================================================

export const colors = {
  // Primary brand colors
  primary: {
    main: 'oklch(0.623 0.214 259.815)',
    10: 'oklch(0.623 0.214 259.815 / 10%)',
    15: 'oklch(0.623 0.214 259.815 / 15%)',
    25: 'oklch(0.623 0.214 259.815 / 25%)',
    40: 'oklch(0.623 0.214 259.815 / 40%)',
    50: 'oklch(0.623 0.214 259.815 / 50%)',
    85: 'oklch(0.623 0.214 259.815 / 85%)'
  },

  // System colors
  system: {
    red: 'oklch(0.534 0.183 27.353)',
    'red-10': 'oklch(0.534 0.183 27.353 / 10%)',
    'red-15': 'oklch(0.534 0.183 27.353 / 15%)',
    'red-25': 'oklch(0.534 0.183 27.353 / 25%)',
    'red-50': 'oklch(0.534 0.183 27.353 / 50%)',
    'red-85': 'oklch(0.534 0.183 27.353 / 85%)',

    green: 'oklch(0.648 0.159 145.382)',
    'green-10': 'oklch(0.648 0.159 145.382 / 10%)',
    'green-15': 'oklch(0.648 0.159 145.382 / 15%)',
    'green-25': 'oklch(0.648 0.159 145.382 / 25%)',
    'green-50': 'oklch(0.648 0.159 145.382 / 50%)',
    'green-85': 'oklch(0.648 0.159 145.382 / 85%)',

    blue: 'oklch(0.607 0.213 258.623)',
    'blue-10': 'oklch(0.607 0.213 258.623 / 10%)',
    'blue-15': 'oklch(0.607 0.213 258.623 / 15%)',
    'blue-25': 'oklch(0.607 0.213 258.623 / 25%)',
    'blue-50': 'oklch(0.607 0.213 258.623 / 50%)',
    'blue-85': 'oklch(0.607 0.213 258.623 / 85%)',

    orange: 'oklch(0.646 0.222 41.116)',
    yellow: 'oklch(0.826 0.211 85.342)',
    mint: 'oklch(0.699 0.136 180.472)'
  },

  // Label colors (text hierarchy)
  label: {
    primary: 'oklch(0 0 0 / 85%)',
    secondary: 'oklch(0 0 0 / 50%)',
    tertiary: 'oklch(0 0 0 / 25%)',
    quaternary: 'oklch(0 0 0 / 10%)',
    quinary: 'oklch(0 0 0 / 5%)',
    seximal: 'oklch(0 0 0 / 3%)'
  },

  // Fill colors (background hierarchy)
  fill: {
    primary: 'oklch(0 0 0 / 10%)',
    secondary: 'oklch(0 0 0 / 8%)',
    tertiary: 'oklch(0 0 0 / 5%)',
    quaternary: 'oklch(0 0 0 / 3%)',
    quinary: 'oklch(0 0 0 / 2%)'
  },

  // Gray system
  gray: {
    primary: 'oklch(0 0 0)',
    secondary: 'oklch(0.62 0 0)',
    tertiary: 'oklch(1 0 0)'
  },

  // Separator
  separator: 'oklch(0.31 0 0 / 29%)',

  // Dark mode overrides
  dark: {
    label: {
      primary: 'oklch(1 0 0)',
      secondary: 'oklch(1 0 0 / 55%)',
      tertiary: 'oklch(1 0 0 / 25%)',
      quaternary: 'oklch(1 0 0 / 10%)',
      quinary: 'oklch(1 0 0 / 5%)',
      seximal: 'oklch(1 0 0 / 3%)'
    },
    fill: {
      primary: 'oklch(1 0 0 / 10%)',
      secondary: 'oklch(1 0 0 / 8%)',
      tertiary: 'oklch(1 0 0 / 5%)',
      quaternary: 'oklch(1 0 0 / 3%)',
      quinary: 'oklch(1 0 0 / 2%)'
    }
  }
} as const

// ============================================================================
// SPACING & LAYOUT TOKENS
// ============================================================================

export const spacing = {
  0: '0',
  px: '1px',
  0.5: '0.125rem',
  1: '0.25rem',
  1.5: '0.375rem',
  2: '0.5rem',
  2.5: '0.625rem',
  3: '0.75rem',
  3.5: '0.875rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  7: '1.75rem',
  8: '2rem',
  9: '2.25rem',
  10: '2.5rem',
  11: '2.75rem',
  12: '3rem',
  14: '3.5rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
  28: '7rem',
  32: '8rem',
  36: '9rem',
  40: '10rem',
  44: '11rem',
  48: '12rem',
  52: '13rem',
  56: '14rem',
  60: '15rem',
  64: '16rem',
  72: '18rem',
  80: '20rem',
  96: '24rem'
} as const

// ============================================================================
// BORDER RADIUS TOKENS
// ============================================================================

export const radius = {
  small: '8px',
  medium: '12px',
  large: '16px',
  xlarge: '20px',
  xxlarge: '28px',
  full: '9999px'
} as const

// ============================================================================
// SHADOW TOKENS (Premium Apple-inspired)
// ============================================================================

export const shadows = {
  small: '0px 0px 8px 1px rgba(0, 0, 0, 0.2), -1px -1px 2px rgba(26, 26, 26, 1), 1px 1px 2px rgba(26, 26, 26, 1), 2px 2px 0.25px -1.5px rgba(255, 255, 255, 0.7), 0px 0px 2px rgba(0, 0, 0, 0.1)',
  medium: '0px 0px 25px rgba(0, 0, 0, 0.16), 0px 0px 8px 1px rgba(0, 0, 0, 0.2), -1px -1px 2px rgba(26, 26, 26, 1), 1px 1px 2px rgba(26, 26, 26, 1), 2px 2px 0.25px -1.5px rgba(255, 255, 255, 0.7), 0px 0px 2px rgba(0, 0, 0, 0.1)',
  large: '0px 8px 32px rgba(0, 0, 0, 0.24), 0px 2px 8px rgba(0, 0, 0, 0.16), 0px 0px 2px rgba(0, 0, 0, 0.1)',

  // Premium shadow variants
  premium: {
    sm: '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.08)',
    md: '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)',
    lg: '0 24px 64px rgba(0, 0, 0, 0.15), 0 8px 24px rgba(0, 0, 0, 0.1)',
    xl: '0 40px 80px rgba(0, 0, 0, 0.2), 0 16px 32px rgba(0, 0, 0, 0.15)'
  }
} as const

// ============================================================================
// ANIMATION TOKENS
// ============================================================================

export const animation = {
  duration: {
    quick: '200ms',
    standard: '300ms',
    slow: '500ms',
    75: '75ms',
    100: '100ms',
    150: '150ms',
    200: '200ms',
    300: '300ms',
    500: '500ms',
    700: '700ms',
    1000: '1000ms'
  },

  easing: {
    smooth: 'cubic-bezier(0.42, 0, 0.58, 1)',
    outSmooth: 'cubic-bezier(0, 0, 0.58, 1)',
    inSmooth: 'cubic-bezier(0.42, 0, 1, 1)',
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)'
  }
} as const

// ============================================================================
// GLASS MORPHISM TOKENS
// ============================================================================

export const glass = {
  material: 'linear-gradient(135deg, oklch(1 0 0 / 70%) 0%, oklch(0.985 0 0) 100%)',
  border: '0.5px solid rgba(0, 0, 0, 0.1)',
  shadow: '0px 0px 25px rgba(0, 0, 0, 0.16), 0px 0px 8px 1px rgba(0, 0, 0, 0.2), -1px -1px 2px oklch(0.2 0 0), 1px 1px 2px oklch(0.2 0 0), 2px 2px 0.25px -1.5px rgba(255, 255, 255, 0.7), 0px 0px 2px rgba(0, 0, 0, 0.1)',
  blur: '12px',

  // Glass variants
  bg: 'rgba(255, 255, 255, 0.1)',
  borderColor: 'rgba(255, 255, 255, 0.2)',
  strong: {
    bg: 'rgba(255, 255, 255, 0.15)',
    blur: '20px',
    border: 'rgba(255, 255, 255, 0.3)'
  }
} as const

// ============================================================================
// BUTTON STATE TOKENS
// ============================================================================

export const buttons = {
  primary: {
    idle: 'linear-gradient(135deg, oklch(0.623 0.214 259.815 / 50%) 0%, oklch(0.623 0.214 259.815 / 50%) 50%, oklch(0.623 0.214 259.815) 100%)',
    hover: 'linear-gradient(135deg, oklch(0.623 0.214 259.815 / 85%) 0%, oklch(0.623 0.214 259.815 / 85%) 50%, oklch(0.623 0.214 259.815) 100%)'
  },
  secondary: {
    idle: 'rgba(0, 0, 0, 0.05)',
    hover: 'rgba(0, 0, 0, 0.1)'
  }
} as const

// ============================================================================
// FOCUS RING TOKENS
// ============================================================================

export const focusRing = {
  color: 'oklch(0.623 0.214 259.815)',
  width: '4px',
  offset: '2px'
} as const

// ============================================================================
// GRADIENT TOKENS
// ============================================================================

export const gradients = {
  primary: 'linear-gradient(135deg, oklch(0.623 0.214 259.815) 0%, oklch(0.623 0.214 259.815 / 80%) 100%)',
  secondary: 'linear-gradient(135deg, oklch(0.2 0.01 210) 0%, oklch(0.2 0.01 258) 100%)',
  rainbow: 'linear-gradient(135deg, oklch(0.619 0.196 286.032) 0%, oklch(0.519 0.181 327.802) 100%)',
  sunset: 'linear-gradient(135deg, oklch(0.763 0.153 322.734) 0%, oklch(0.615 0.19 14.194) 100%)',
  ocean: 'linear-gradient(135deg, oklch(0.741 0.153 217.508) 0%, oklch(0.827 0.214 194.769) 100%)'
} as const

// ============================================================================
// Z-INDEX TOKENS
// ============================================================================

export const zIndex = {
  0: 0,
  10: 10,
  20: 20,
  30: 30,
  40: 40,
  50: 50,
  auto: 'auto',
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  toast: 1080,
  maximum: 2147483647
} as const

// ============================================================================
// UNIFIED TOKENS EXPORT
// ============================================================================

export const tokens = {
  typography,
  colors,
  spacing,
  radius,
  shadows,
  animation,
  glass,
  buttons,
  focusRing,
  gradients,
  zIndex
} as const

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type TypographyTokens = typeof typography
export type ColorTokens = typeof colors
export type SpacingTokens = typeof spacing
export type RadiusTokens = typeof radius
export type ShadowTokens = typeof shadows
export type AnimationTokens = typeof animation
export type GlassTokens = typeof glass
export type ButtonTokens = typeof buttons
export type FocusRingTokens = typeof focusRing
export type GradientTokens = typeof gradients
export type ZIndexTokens = typeof zIndex
export type DesignTokens = typeof tokens

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate CSS custom properties from design tokens
 */
export function generateCSSCustomProperties(tokens: Record<string, any>, prefix = '--'): Record<string, string> {
  const cssProperties: Record<string, string> = {}

  function flatten(obj: Record<string, any>, parentKey = ''): void {
    for (const [key, value] of Object.entries(obj)) {
      const cssKey = parentKey ? `${parentKey}-${key}` : key

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        flatten(value, cssKey)
      } else {
        cssProperties[`${prefix}${cssKey}`] = String(value)
      }
    }
  }

  flatten(tokens)
  return cssProperties
}

/**
 * Get a nested token value safely
 */
export function getToken<T>(path: string, defaultValue?: T): T | undefined {
  const keys = path.split('.')
  let current: any = tokens

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key]
    } else {
      return defaultValue
    }
  }

  return current
}

/**
 * Create CSS variable reference
 */
export function cssVar(path: string): string {
  return `var(--${path.replace(/\./g, '-')})`
}

export default tokens