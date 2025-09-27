/**
 * TenantFlow Design System
 * Centralized exports for tokens, utilities, and components
 */

// eslint-disable-next-line type-centralization/no-barrel-exports
export * from '../lib/design-system'
// Color utilities - commented out until implemented
// export { validateColor, generateColorVariations } from './colors'

// Export unified tokens with explicit naming to avoid conflicts
/* eslint-disable type-centralization/no-barrel-exports */
export {
	animation,
	buttons,
	focusRing,
	generateCSSCustomProperties,
	getToken,
	glass,
	gradients,
	radius,
	shadows,
	spacing,
	cssVar as tokenCssVar,
	tokens,
	typography,
	colors as unifiedColors,
	zIndex,
	type AnimationTokens,
	type ButtonTokens,
	type ColorTokens,
	type DesignTokens,
	type FocusRingTokens,
	type GlassTokens,
	type GradientTokens,
	type RadiusTokens,
	type ShadowTokens,
	type SpacingTokens,
	type TypographyTokens,
	type ZIndexTokens
} from './tokens/unified'
