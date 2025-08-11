/**
 * Design Token System - Typography Tokens
 * Comprehensive typography system for consistent text rendering
 */

// ============================================
// FONT FAMILIES
// ============================================

export const fontFamilies = {
  heading: "'Outfit', 'DM Sans', system-ui, -apple-system, sans-serif",
  body: "'Inter', system-ui, -apple-system, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
} as const;

// ============================================
// FONT SIZES - Using modular scale (1.25 ratio)
// ============================================

export const fontSizes = {
  // Base sizes
  '2xs': '0.625rem',    // 10px
  xs: '0.75rem',        // 12px
  sm: '0.875rem',       // 14px
  base: '1rem',         // 16px (base)
  lg: '1.125rem',       // 18px
  xl: '1.25rem',        // 20px
  '2xl': '1.5rem',      // 24px
  '3xl': '1.875rem',    // 30px
  '4xl': '2.25rem',     // 36px
  '5xl': '3rem',        // 48px
  '6xl': '3.75rem',     // 60px
  '7xl': '4.5rem',      // 72px
  '8xl': '6rem',        // 96px
  '9xl': '8rem',        // 128px
} as const;

// ============================================
// LINE HEIGHTS
// ============================================

export const lineHeights = {
  none: '1',
  tight: '1.25',
  snug: '1.375',
  normal: '1.5',
  relaxed: '1.625',
  loose: '1.75',
  body: '1.6',         // Optimized for body text
  heading: '1.2',      // Tighter for headings
} as const;

// ============================================
// FONT WEIGHTS
// ============================================

export const fontWeights = {
  thin: '100',
  extralight: '200',
  light: '300',
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
  black: '900',
} as const;

// ============================================
// LETTER SPACING
// ============================================

export const letterSpacing = {
  tighter: '-0.05em',
  tight: '-0.025em',
  normal: '0',
  wide: '0.025em',
  wider: '0.05em',
  widest: '0.1em',
  // Specific use cases
  heading: '-0.02em',   // Slightly tighter for headings
  body: '0',            // Normal for body text
  caps: '0.1em',        // Wider for all caps
} as const;

// ============================================
// TEXT STYLES - Predefined combinations
// ============================================

export const textStyles = {
  // Display styles (marketing, hero sections)
  display: {
    xl: {
      fontSize: fontSizes['7xl'],
      lineHeight: lineHeights.heading,
      fontWeight: fontWeights.bold,
      letterSpacing: letterSpacing.heading,
      fontFamily: fontFamilies.heading,
    },
    lg: {
      fontSize: fontSizes['6xl'],
      lineHeight: lineHeights.heading,
      fontWeight: fontWeights.bold,
      letterSpacing: letterSpacing.heading,
      fontFamily: fontFamilies.heading,
    },
    md: {
      fontSize: fontSizes['5xl'],
      lineHeight: lineHeights.heading,
      fontWeight: fontWeights.semibold,
      letterSpacing: letterSpacing.heading,
      fontFamily: fontFamilies.heading,
    },
    sm: {
      fontSize: fontSizes['4xl'],
      lineHeight: lineHeights.heading,
      fontWeight: fontWeights.semibold,
      letterSpacing: letterSpacing.heading,
      fontFamily: fontFamilies.heading,
    },
  },
  
  // Heading styles (content hierarchy)
  heading: {
    h1: {
      fontSize: fontSizes['4xl'],
      lineHeight: lineHeights.heading,
      fontWeight: fontWeights.bold,
      letterSpacing: letterSpacing.heading,
      fontFamily: fontFamilies.heading,
    },
    h2: {
      fontSize: fontSizes['3xl'],
      lineHeight: lineHeights.heading,
      fontWeight: fontWeights.semibold,
      letterSpacing: letterSpacing.heading,
      fontFamily: fontFamilies.heading,
    },
    h3: {
      fontSize: fontSizes['2xl'],
      lineHeight: lineHeights.snug,
      fontWeight: fontWeights.semibold,
      letterSpacing: letterSpacing.heading,
      fontFamily: fontFamilies.heading,
    },
    h4: {
      fontSize: fontSizes.xl,
      lineHeight: lineHeights.snug,
      fontWeight: fontWeights.medium,
      letterSpacing: letterSpacing.normal,
      fontFamily: fontFamilies.heading,
    },
    h5: {
      fontSize: fontSizes.lg,
      lineHeight: lineHeights.normal,
      fontWeight: fontWeights.medium,
      letterSpacing: letterSpacing.normal,
      fontFamily: fontFamilies.heading,
    },
    h6: {
      fontSize: fontSizes.base,
      lineHeight: lineHeights.normal,
      fontWeight: fontWeights.semibold,
      letterSpacing: letterSpacing.wide,
      fontFamily: fontFamilies.heading,
    },
  },
  
  // Body text styles
  body: {
    lg: {
      fontSize: fontSizes.lg,
      lineHeight: lineHeights.relaxed,
      fontWeight: fontWeights.normal,
      letterSpacing: letterSpacing.body,
      fontFamily: fontFamilies.body,
    },
    base: {
      fontSize: fontSizes.base,
      lineHeight: lineHeights.body,
      fontWeight: fontWeights.normal,
      letterSpacing: letterSpacing.body,
      fontFamily: fontFamilies.body,
    },
    sm: {
      fontSize: fontSizes.sm,
      lineHeight: lineHeights.normal,
      fontWeight: fontWeights.normal,
      letterSpacing: letterSpacing.body,
      fontFamily: fontFamilies.body,
    },
    xs: {
      fontSize: fontSizes.xs,
      lineHeight: lineHeights.normal,
      fontWeight: fontWeights.normal,
      letterSpacing: letterSpacing.body,
      fontFamily: fontFamilies.body,
    },
  },
  
  // Label styles (forms, buttons)
  label: {
    lg: {
      fontSize: fontSizes.base,
      lineHeight: lineHeights.tight,
      fontWeight: fontWeights.medium,
      letterSpacing: letterSpacing.normal,
      fontFamily: fontFamilies.body,
    },
    base: {
      fontSize: fontSizes.sm,
      lineHeight: lineHeights.tight,
      fontWeight: fontWeights.medium,
      letterSpacing: letterSpacing.normal,
      fontFamily: fontFamilies.body,
    },
    sm: {
      fontSize: fontSizes.xs,
      lineHeight: lineHeights.tight,
      fontWeight: fontWeights.medium,
      letterSpacing: letterSpacing.wide,
      fontFamily: fontFamilies.body,
    },
  },
  
  // Caption styles (helper text, timestamps)
  caption: {
    base: {
      fontSize: fontSizes.xs,
      lineHeight: lineHeights.normal,
      fontWeight: fontWeights.normal,
      letterSpacing: letterSpacing.normal,
      fontFamily: fontFamilies.body,
    },
    sm: {
      fontSize: fontSizes['2xs'],
      lineHeight: lineHeights.normal,
      fontWeight: fontWeights.normal,
      letterSpacing: letterSpacing.wide,
      fontFamily: fontFamilies.body,
    },
  },
  
  // Code styles
  code: {
    lg: {
      fontSize: fontSizes.base,
      lineHeight: lineHeights.relaxed,
      fontWeight: fontWeights.normal,
      letterSpacing: letterSpacing.normal,
      fontFamily: fontFamilies.mono,
    },
    base: {
      fontSize: fontSizes.sm,
      lineHeight: lineHeights.normal,
      fontWeight: fontWeights.normal,
      letterSpacing: letterSpacing.normal,
      fontFamily: fontFamilies.mono,
    },
    sm: {
      fontSize: fontSizes.xs,
      lineHeight: lineHeights.normal,
      fontWeight: fontWeights.normal,
      letterSpacing: letterSpacing.normal,
      fontFamily: fontFamilies.mono,
    },
  },
  
  // Button text styles
  button: {
    lg: {
      fontSize: fontSizes.base,
      lineHeight: lineHeights.tight,
      fontWeight: fontWeights.semibold,
      letterSpacing: letterSpacing.wide,
      fontFamily: fontFamilies.body,
    },
    base: {
      fontSize: fontSizes.sm,
      lineHeight: lineHeights.tight,
      fontWeight: fontWeights.medium,
      letterSpacing: letterSpacing.normal,
      fontFamily: fontFamilies.body,
    },
    sm: {
      fontSize: fontSizes.xs,
      lineHeight: lineHeights.tight,
      fontWeight: fontWeights.medium,
      letterSpacing: letterSpacing.wide,
      fontFamily: fontFamilies.body,
    },
  },
  
  // Link styles
  link: {
    base: {
      fontSize: 'inherit',
      lineHeight: 'inherit',
      fontWeight: fontWeights.medium,
      letterSpacing: 'inherit',
      fontFamily: 'inherit',
      textDecoration: 'underline',
      textUnderlineOffset: '0.2em',
    },
    nav: {
      fontSize: fontSizes.sm,
      lineHeight: lineHeights.tight,
      fontWeight: fontWeights.medium,
      letterSpacing: letterSpacing.normal,
      fontFamily: fontFamilies.body,
      textDecoration: 'none',
    },
  },
  
  // Overline styles (labels above headings)
  overline: {
    base: {
      fontSize: fontSizes.xs,
      lineHeight: lineHeights.tight,
      fontWeight: fontWeights.semibold,
      letterSpacing: letterSpacing.caps,
      fontFamily: fontFamilies.body,
      textTransform: 'uppercase' as const,
    },
  },
} as const;

// ============================================
// TEXT DECORATION
// ============================================

export const textDecoration = {
  underline: {
    offset: {
      sm: '0.1em',
      base: '0.2em',
      lg: '0.3em',
    },
    thickness: {
      sm: '1px',
      base: '2px',
      lg: '3px',
    },
  },
} as const;

// ============================================
// TEXT TRANSFORMS
// ============================================

export const textTransform = {
  none: 'none',
  uppercase: 'uppercase',
  lowercase: 'lowercase',
  capitalize: 'capitalize',
} as const;

// Type exports
export type FontFamilies = typeof fontFamilies;
export type FontSizes = typeof fontSizes;
export type LineHeights = typeof lineHeights;
export type FontWeights = typeof fontWeights;
export type LetterSpacing = typeof letterSpacing;
export type TextStyles = typeof textStyles;