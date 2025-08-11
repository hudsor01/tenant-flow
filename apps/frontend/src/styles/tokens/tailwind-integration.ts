/**
 * Tailwind CSS v4 Integration
 * Maps design tokens to Tailwind CSS configuration
 */

import { primitiveColors, semanticColors } from './colors';
import { spacing, semanticSpacing } from './spacing';
import { fontFamilies, fontSizes, lineHeights, fontWeights, letterSpacing } from './typography';

// ============================================
// TAILWIND CSS V4 TOKEN MAPPING
// ============================================

export const tailwindTokens = {
  // Color system for Tailwind
  colors: {
    // Primitive color scales
    steel: primitiveColors.steel,
    teal: primitiveColors.teal,
    charcoal: primitiveColors.charcoal,
    success: primitiveColors.success,
    warning: primitiveColors.warning,
    error: primitiveColors.error,
    info: primitiveColors.info,
    
    // Semantic colors for Tailwind utilities
    background: {
      DEFAULT: semanticColors.background.primary,
      secondary: semanticColors.background.secondary,
      tertiary: semanticColors.background.tertiary,
      inverse: semanticColors.background.inverse,
    },
    foreground: {
      DEFAULT: semanticColors.foreground.primary,
      secondary: semanticColors.foreground.secondary,
      muted: semanticColors.foreground.muted,
      inverse: semanticColors.foreground.inverse,
    },
    border: {
      DEFAULT: semanticColors.border.default,
      strong: semanticColors.border.strong,
      subtle: semanticColors.border.subtle,
    },
    primary: {
      DEFAULT: semanticColors.interactive.primary.default,
      hover: semanticColors.interactive.primary.hover,
      active: semanticColors.interactive.primary.active,
      disabled: semanticColors.interactive.primary.disabled,
    },
    accent: {
      DEFAULT: semanticColors.interactive.accent.default,
      hover: semanticColors.interactive.accent.hover,
      active: semanticColors.interactive.accent.active,
      disabled: semanticColors.interactive.accent.disabled,
    },
  },
  
  // Spacing system
  spacing: spacing,
  
  // Typography
  fontFamily: {
    heading: fontFamilies.heading,
    body: fontFamilies.body,
    mono: fontFamilies.mono,
  },
  fontSize: fontSizes,
  lineHeight: lineHeights,
  fontWeight: fontWeights,
  letterSpacing: letterSpacing,
  
  // Border radius tokens
  borderRadius: {
    none: '0',
    sm: '0.125rem',    // 2px
    DEFAULT: '0.25rem', // 4px
    md: '0.375rem',     // 6px
    lg: '0.5rem',       // 8px
    xl: '0.75rem',      // 12px
    '2xl': '1rem',      // 16px
    '3xl': '1.5rem',    // 24px
    full: '9999px',
  },
  
  // Box shadow tokens
  boxShadow: {
    none: 'none',
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  },
  
  // Z-index scale
  zIndex: {
    auto: 'auto',
    0: '0',
    10: '10',
    20: '20',
    30: '30',
    40: '40',
    50: '50',
    dropdown: '1000',
    sticky: '1100',
    modal: '1200',
    popover: '1300',
    tooltip: '1400',
    notification: '1500',
  },
  
  // Animation tokens
  transitionDuration: {
    0: '0ms',
    75: '75ms',
    100: '100ms',
    150: '150ms',
    200: '200ms',
    300: '300ms',
    500: '500ms',
    700: '700ms',
    1000: '1000ms',
  },
  
  transitionTimingFunction: {
    DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

// ============================================
// TAILWIND CSS V4 UTILITIES
// ============================================

export const tailwindUtilities = {
  // Custom text styles as Tailwind utilities
  '.text-display-xl': {
    fontSize: fontSizes['7xl'],
    lineHeight: lineHeights.heading,
    fontWeight: fontWeights.bold,
    letterSpacing: letterSpacing.heading,
    fontFamily: fontFamilies.heading,
  },
  '.text-display-lg': {
    fontSize: fontSizes['6xl'],
    lineHeight: lineHeights.heading,
    fontWeight: fontWeights.bold,
    letterSpacing: letterSpacing.heading,
    fontFamily: fontFamilies.heading,
  },
  '.text-display-md': {
    fontSize: fontSizes['5xl'],
    lineHeight: lineHeights.heading,
    fontWeight: fontWeights.semibold,
    letterSpacing: letterSpacing.heading,
    fontFamily: fontFamilies.heading,
  },
  '.text-display-sm': {
    fontSize: fontSizes['4xl'],
    lineHeight: lineHeights.heading,
    fontWeight: fontWeights.semibold,
    letterSpacing: letterSpacing.heading,
    fontFamily: fontFamilies.heading,
  },
  
  // Heading utilities
  '.text-h1': {
    fontSize: fontSizes['4xl'],
    lineHeight: lineHeights.heading,
    fontWeight: fontWeights.bold,
    letterSpacing: letterSpacing.heading,
    fontFamily: fontFamilies.heading,
  },
  '.text-h2': {
    fontSize: fontSizes['3xl'],
    lineHeight: lineHeights.heading,
    fontWeight: fontWeights.semibold,
    letterSpacing: letterSpacing.heading,
    fontFamily: fontFamilies.heading,
  },
  '.text-h3': {
    fontSize: fontSizes['2xl'],
    lineHeight: lineHeights.snug,
    fontWeight: fontWeights.semibold,
    letterSpacing: letterSpacing.heading,
    fontFamily: fontFamilies.heading,
  },
  '.text-h4': {
    fontSize: fontSizes.xl,
    lineHeight: lineHeights.snug,
    fontWeight: fontWeights.medium,
    letterSpacing: letterSpacing.normal,
    fontFamily: fontFamilies.heading,
  },
  '.text-h5': {
    fontSize: fontSizes.lg,
    lineHeight: lineHeights.normal,
    fontWeight: fontWeights.medium,
    letterSpacing: letterSpacing.normal,
    fontFamily: fontFamilies.heading,
  },
  '.text-h6': {
    fontSize: fontSizes.base,
    lineHeight: lineHeights.normal,
    fontWeight: fontWeights.semibold,
    letterSpacing: letterSpacing.wide,
    fontFamily: fontFamilies.heading,
  },
  
  // Body text utilities
  '.text-body-lg': {
    fontSize: fontSizes.lg,
    lineHeight: lineHeights.relaxed,
    fontWeight: fontWeights.normal,
    fontFamily: fontFamilies.body,
  },
  '.text-body': {
    fontSize: fontSizes.base,
    lineHeight: lineHeights.body,
    fontWeight: fontWeights.normal,
    fontFamily: fontFamilies.body,
  },
  '.text-body-sm': {
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.normal,
    fontWeight: fontWeights.normal,
    fontFamily: fontFamilies.body,
  },
  
  // Label utilities
  '.text-label-lg': {
    fontSize: fontSizes.base,
    lineHeight: lineHeights.tight,
    fontWeight: fontWeights.medium,
    fontFamily: fontFamilies.body,
  },
  '.text-label': {
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.tight,
    fontWeight: fontWeights.medium,
    fontFamily: fontFamilies.body,
  },
  '.text-label-sm': {
    fontSize: fontSizes.xs,
    lineHeight: lineHeights.tight,
    fontWeight: fontWeights.medium,
    letterSpacing: letterSpacing.wide,
    fontFamily: fontFamilies.body,
  },
  
  // Caption utilities
  '.text-caption': {
    fontSize: fontSizes.xs,
    lineHeight: lineHeights.normal,
    fontWeight: fontWeights.normal,
    fontFamily: fontFamilies.body,
  },
  '.text-caption-sm': {
    fontSize: fontSizes['2xs'],
    lineHeight: lineHeights.normal,
    fontWeight: fontWeights.normal,
    letterSpacing: letterSpacing.wide,
    fontFamily: fontFamilies.body,
  },
  
  // Overline utility
  '.text-overline': {
    fontSize: fontSizes.xs,
    lineHeight: lineHeights.tight,
    fontWeight: fontWeights.semibold,
    letterSpacing: letterSpacing.caps,
    fontFamily: fontFamilies.body,
    textTransform: 'uppercase',
  },
  
  // Layout utilities
  '.container-padding': {
    paddingLeft: semanticSpacing.page.mobile,
    paddingRight: semanticSpacing.page.mobile,
    '@media (min-width: 640px)': {
      paddingLeft: semanticSpacing.page.tablet,
      paddingRight: semanticSpacing.page.tablet,
    },
    '@media (min-width: 1024px)': {
      paddingLeft: semanticSpacing.page.desktop,
      paddingRight: semanticSpacing.page.desktop,
    },
  },
  
  // Component spacing utilities
  '.card-padding': {
    padding: semanticSpacing.component.base,
  },
  '.card-padding-sm': {
    padding: semanticSpacing.component.sm,
  },
  '.card-padding-lg': {
    padding: semanticSpacing.component.lg,
  },
  
  // Form utilities
  '.form-field-spacing': {
    marginBottom: semanticSpacing.form.field,
  },
  '.form-group-spacing': {
    marginBottom: semanticSpacing.form.group,
  },
  '.form-section-spacing': {
    marginBottom: semanticSpacing.form.section,
  },
} as const;

// ============================================
// CSS CUSTOM PROPERTIES GENERATION
// ============================================

export function generateCSSVariables() {
  const cssVars: Record<string, string> = {};
  
  // Color variables
  Object.entries(primitiveColors).forEach(([colorName, shades]) => {
    Object.entries(shades).forEach(([shade, value]) => {
      cssVars[`--color-${colorName}-${shade}`] = value;
    });
  });
  
  // Spacing variables
  Object.entries(spacing).forEach(([key, value]) => {
    cssVars[`--spacing-${key}`] = value;
  });
  
  // Typography variables
  Object.entries(fontSizes).forEach(([key, value]) => {
    cssVars[`--font-size-${key}`] = value;
  });
  
  Object.entries(lineHeights).forEach(([key, value]) => {
    cssVars[`--line-height-${key}`] = value;
  });
  
  Object.entries(fontWeights).forEach(([key, value]) => {
    cssVars[`--font-weight-${key}`] = value;
  });
  
  Object.entries(letterSpacing).forEach(([key, value]) => {
    cssVars[`--letter-spacing-${key}`] = value;
  });
  
  return cssVars;
}

// Type exports
export type TailwindTokens = typeof tailwindTokens;
export type TailwindUtilities = typeof tailwindUtilities;