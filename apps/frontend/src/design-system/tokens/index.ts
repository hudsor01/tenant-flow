/**
 * TenantFlow Design System Tokens
 * Apple-inspired design tokens for consistent UI
 */

// Import token files
import essential from './essential.json'
import typography from './typography.json'
import colors from './colors.json'
import components from './components.json'
import effects from './effects.json'
import complete from './complete.json'

// Export individual token sets
export { essential, typography, colors, components, effects, complete }

// Quick access to commonly used tokens
export const tokens = {
  // Colors - Reference CSS variables for runtime access
  primary: 'var(--color-accent-main)',
  success: 'var(--color-system-green)',
  error: 'var(--color-system-red)',
  warning: '#FFCC00',

  // Typography
  fontFamily: 'SF Pro',
  fontSize: {
    largeTitle: '26px',
    title1: '22px',
    title2: '17px',
    title3: '15px',
    headline: '13px',
    body: '13px',
    callout: '12px',
    subheadline: '11px',
    footnote: '10px',
    caption: '10px'
  },

  // Spacing (4px grid)
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    xxl: '24px'
  },

  // Shadows
  shadow: {
    sm: '0 0 1px rgba(0,0,0,0.1)',
    md: '0 0 6px rgba(0,0,0,0.08)',
    lg: '0 0 25px rgba(0,0,0,0.16)',
    glass: '0 0 44px rgba(0,0,0,0.1)'
  },

  // Border radius (Apple style)
  radius: {
    xs: '8px',      // Small buttons
    sm: '12px',     // Default small
    md: '16px',     // Default medium
    lg: '20px',     // Large buttons
    xl: '28px'      // Extra large buttons
  }
}

// Type exports for TypeScript
export type ColorToken = typeof colors
export type TypographyToken = typeof typography
export type ComponentToken = typeof components
export type EffectToken = typeof effects

export default tokens