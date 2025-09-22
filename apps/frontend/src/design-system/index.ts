/**
 * TenantFlow Design System
 * Centralized exports for tokens, utilities, and components
 */

export * from '../lib/design-system'
export * from './colors'

// Export unified tokens with explicit naming to avoid conflicts
export {
  tokens,
  typography,
  colors as unifiedColors,
  spacing,
  radius,
  shadows,
  animation,
  glass,
  buttons,
  focusRing,
  gradients,
  zIndex,
  generateCSSCustomProperties,
  getToken,
  cssVar as tokenCssVar,
  type DesignTokens,
  type ColorTokens,
  type TypographyTokens,
  type SpacingTokens,
  type RadiusTokens,
  type ShadowTokens,
  type AnimationTokens,
  type GlassTokens,
  type ButtonTokens,
  type FocusRingTokens,
  type GradientTokens,
  type ZIndexTokens
} from './tokens/unified'
