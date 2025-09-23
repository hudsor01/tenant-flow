/**
 * TenantFlow Design System
 * Centralized exports for tokens, utilities, and components
 */

export * from '../lib/design-system'
export * from './colors'

// Export unified tokens with explicit naming to avoid conflicts
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
