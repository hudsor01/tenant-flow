/**
 * Design System Constants
 * Centralized design tokens for consistent UI/UX across TenantFlow
 *
 * These constants ensure visual consistency between:
 * - Landing pages
 * - Dashboard interface
 * - Authentication flows
 * - Form components
 * - Data visualization
 */

// =============================================================================
// TYPOGRAPHY SYSTEM
// =============================================================================

/**
 * Font families following Tailwind CSS defaults
 * Provides fallbacks for consistent typography rendering
 */
export const FONT_FAMILIES = {
	sans: [
		'ui-sans-serif',
		'system-ui',
		'sans-serif',
		'"Apple Color Emoji"',
		'"Segoe UI Emoji"',
		'"Segoe UI Symbol"',
		'"Noto Color Emoji"'
	],
	serif: [
		'ui-serif',
		'Georgia',
		'Cambria',
		'"Times New Roman"',
		'Times',
		'serif'
	],
	mono: [
		'ui-monospace',
		'SFMono-Regular',
		'"SF Mono"',
		'Consolas',
		'"Liberation Mono"',
		'Menlo',
		'monospace'
	]
} as const

/**
 * Typography Scale
 * Based on Roboto design tokens from tenantflow-ui-kit.tokens.json
 * Provides clean, minimal, and intuitive typography for premium experience
 */
export const TYPOGRAPHY_SCALE = {
	// Display sizes - Clean headers
	'display-2xl': {
		fontSize: '2.625rem', // 42px - Scaled up from SF 26px for hero
		lineHeight: '1.23', // Roboto line height
		letterSpacing: '0', // Clean, no tracking
		fontWeight: '700', // Bold for prominence
		fontFamily: 'var(--font-sans, ui-sans-serif, system-ui, sans-serif)'
	},
	'display-xl': {
		fontSize: '2.125rem', // 34px - Between SF sizes
		lineHeight: '1.23',
		letterSpacing: '0',
		fontWeight: '700',
		fontFamily: 'var(--font-sans, ui-sans-serif, system-ui, sans-serif)'
	},
	'display-lg': {
		fontSize: '1.625rem', // 26px - SF Display Large
		lineHeight: '1.23',
		letterSpacing: '0',
		fontWeight: '700', // SF Bold weight
		fontFamily: 'var(--font-sans, ui-sans-serif, system-ui, sans-serif)'
	},

	// Heading sizes - Roboto hierarchy
	'heading-xl': {
		fontSize: '1.375rem', // 22px - SF Display Medium
		lineHeight: '1.18', // Roboto 22px line height
		letterSpacing: '0',
		fontWeight: '700', // SF Bold
		fontFamily: 'var(--font-sans, ui-sans-serif, system-ui, sans-serif)'
	},
	'heading-lg': {
		fontSize: '1.25rem', // 20px - Between sizes
		lineHeight: '1.25',
		letterSpacing: '0',
		fontWeight: '600', // Semibold
		fontFamily: 'var(--font-sans, ui-sans-serif, system-ui, sans-serif)'
	},
	'heading-md': {
		fontSize: '1.0625rem', // 17px - SF Body
		lineHeight: '1.29', // Roboto 17px line height
		letterSpacing: '0',
		fontWeight: '700', // SF Bold
		fontFamily: 'var(--font-sans, ui-sans-serif, system-ui, sans-serif)'
	},
	'heading-sm': {
		fontSize: '0.9375rem', // 15px - SF Callout
		lineHeight: '1.33', // Roboto 15px line height
		letterSpacing: '0',
		fontWeight: '600', // SF Semibold
		fontFamily: 'var(--font-sans, ui-sans-serif, system-ui, sans-serif)'
	},

	// Body Text - Clean readable content
	'body-lg': {
		fontSize: '1.0625rem', // 17px - SF Body
		lineHeight: '1.29', // Roboto body line height
		fontWeight: '400', // Regular
		letterSpacing: '0',
		fontFamily: 'var(--font-sans, ui-sans-serif, system-ui, sans-serif)'
	},
	'body-md': {
		fontSize: '0.9375rem', // 15px - SF Callout
		lineHeight: '1.33',
		fontWeight: '400',
		letterSpacing: '0', // Clean standard
		fontFamily: 'var(--font-sans, ui-sans-serif, system-ui, sans-serif)'
	},
	'body-sm': {
		fontSize: '0.8125rem', // 13px - SF Label
		lineHeight: '1.23',
		fontWeight: '400', // Regular
		letterSpacing: '0',
		fontFamily: 'var(--font-sans, ui-sans-serif, system-ui, sans-serif)'
	},
	'body-xs': {
		fontSize: '0.75rem', // 12px - SF Caption
		lineHeight: '1.25',
		fontWeight: '400', // Regular
		letterSpacing: '0',
		fontFamily: 'var(--font-sans, ui-sans-serif, system-ui, sans-serif)'
	},

	// UI Variants - Interface elements
	'ui-title': {
		fontSize: '1.0625rem', // 17px - SF Body Bold
		lineHeight: '1.29',
		fontWeight: '700', // Bold for UI titles
		letterSpacing: '0',
		fontFamily: 'var(--font-sans, ui-sans-serif, system-ui, sans-serif)'
	},
	'ui-label': {
		fontSize: '0.8125rem', // 13px - SF Label
		lineHeight: '1.23',
		fontWeight: '600', // Semibold for labels
		letterSpacing: '0',
		fontFamily: 'var(--font-sans, ui-sans-serif, system-ui, sans-serif)'
	},
	'ui-caption': {
		fontSize: '0.75rem', // 12px - SF Caption
		lineHeight: '1.25',
		fontWeight: '400', // Regular for captions
		letterSpacing: '0',
		fontFamily: 'var(--font-sans, ui-sans-serif, system-ui, sans-serif)'
	},

	// Marketing Hierarchy - Clean conversion-focused
	'hero-primary': {
		fontSize: '2.625rem', // 42px - Scaled hero size
		lineHeight: '1.23',
		letterSpacing: '0',
		fontWeight: '700', // Bold for impact
		fontFamily: 'var(--font-sans, ui-sans-serif, system-ui, sans-serif)'
	},
	'hero-secondary': {
		fontSize: '1.0625rem', // 17px - SF Body
		lineHeight: '1.29',
		fontWeight: '400', // Regular for support text
		letterSpacing: '0',
		fontFamily: 'var(--font-sans, ui-sans-serif, system-ui, sans-serif)'
	},
	'feature-title': {
		fontSize: '1.375rem', // 22px - SF Display Medium
		lineHeight: '1.18',
		fontWeight: '700', // Bold for features
		letterSpacing: '0',
		fontFamily: 'var(--font-sans, ui-sans-serif, system-ui, sans-serif)'
	},
	'cta-text': {
		fontSize: '1.0625rem', // 17px - SF Body Bold
		lineHeight: '1.29',
		fontWeight: '700', // Bold for CTAs
		letterSpacing: '0',
		fontFamily: 'var(--font-sans, ui-sans-serif, system-ui, sans-serif)'
	}
} as const

// =============================================================================
// SPACING SYSTEM
// =============================================================================

/**
 * Consistent spacing scale following 8px grid system
 * Aligned with Tailwind CSS spacing utilities
 */
export const SPACING_SCALE = {
	0: '0px',
	px: '1px',
	0.5: '0.125rem', // 2px
	1: '0.25rem', // 4px
	1.5: '0.375rem', // 6px
	2: '0.5rem', // 8px
	2.5: '0.625rem', // 10px
	3: '0.75rem', // 12px
	3.5: '0.875rem', // 14px
	4: '1rem', // 16px
	5: '1.25rem', // 20px
	6: '1.5rem', // 24px
	7: '1.75rem', // 28px
	8: '2rem', // 32px
	9: '2.25rem', // 36px
	10: '2.5rem', // 40px
	11: '2.75rem', // 44px
	12: '3rem', // 48px
	14: '3.5rem', // 56px
	16: '4rem', // 64px
	20: '5rem', // 80px
	24: '6rem', // 96px
	28: '7rem', // 112px
	32: '8rem', // 128px
	36: '9rem', // 144px
	40: '10rem', // 160px
	44: '11rem', // 176px
	48: '12rem', // 192px
	52: '13rem', // 208px
	56: '14rem', // 224px
	60: '15rem', // 240px
	64: '16rem', // 256px
	72: '18rem', // 288px
	80: '20rem', // 320px
	96: '24rem' // 384px
} as const

// =============================================================================
// COLOR SYSTEM
// =============================================================================

/**
 * Semantic color definitions for consistent theming
 * Maps to CSS custom properties for theme switching
 */
export const SEMANTIC_COLORS = {
	// Base colors
	background: 'var(--background)',
	foreground: 'var(--foreground)',

	// Interactive colors
	primary: 'var(--primary)',
	'primary-foreground': 'var(--primary-foreground)',
	secondary: 'var(--secondary)',
	'secondary-foreground': 'var(--secondary-foreground)',

	// Utility colors
	muted: 'var(--muted)',
	'muted-foreground': 'var(--muted-foreground)',
	accent: 'var(--accent)',
	'accent-foreground': 'var(--accent-foreground)',

	// Status colors
	destructive: 'var(--destructive)',
	'destructive-foreground': 'var(--destructive-foreground)',
	success: 'var(--success)',
	'success-foreground': 'var(--success-foreground)',
	warning: 'var(--warning)',
	'warning-foreground': 'var(--warning-foreground)',

	// Surface colors
	card: 'var(--card)',
	'card-foreground': 'var(--card-foreground)',
	popover: 'var(--popover)',
	'popover-foreground': 'var(--popover-foreground)',

	// Border and input colors
	border: 'var(--border)',
	input: 'var(--input)',
	ring: 'var(--ring)',

	// Chart colors
	'chart-1': 'var(--chart-1)',
	'chart-2': 'var(--chart-2)',
	'chart-3': 'var(--chart-3)',
	'chart-4': 'var(--chart-4)',
	'chart-5': 'var(--chart-5)',

	// Sidebar colors
	sidebar: 'var(--sidebar)',
	'sidebar-foreground': 'var(--sidebar-foreground)',
	'sidebar-primary': 'var(--sidebar-primary)',
	'sidebar-primary-foreground': 'var(--sidebar-primary-foreground)',
	'sidebar-accent': 'var(--sidebar-accent)',
	'sidebar-accent-foreground': 'var(--sidebar-accent-foreground)',
	'sidebar-border': 'var(--sidebar-border)',
	'sidebar-ring': 'var(--sidebar-ring)'
} as const

// =============================================================================
// COMPONENT VARIANTS
// =============================================================================

/**
 * Standard component sizes for consistent scaling
 */
export const COMPONENT_SIZES = {
	xs: {
		height: '1.5rem', // 24px
		padding: '0.25rem 0.5rem',
		fontSize: '0.75rem',
		borderRadius: '0.25rem'
	},
	sm: {
		height: '2rem', // 32px
		padding: '0.375rem 0.75rem',
		fontSize: '0.875rem',
		borderRadius: '0.375rem'
	},
	default: {
		height: '2.5rem', // 40px
		padding: '0.5rem 1rem',
		fontSize: '0.875rem',
		borderRadius: '0.5rem'
	},
	lg: {
		height: '3rem', // 48px
		padding: '0.75rem 1.5rem',
		fontSize: '1rem',
		borderRadius: '0.5rem'
	},
	xl: {
		height: '3.5rem', // 56px
		padding: '0.875rem 1.75rem',
		fontSize: '1.125rem',
		borderRadius: '0.75rem'
	}
} as const

/**
 * Border radius scale for consistent rounded corners
 */
export const BORDER_RADIUS_SCALE = {
	none: '0px',
	xs: '0.125rem', // 2px
	sm: '0.25rem', // 4px
	default: '0.375rem', // 6px
	md: '0.5rem', // 8px
	lg: '0.75rem', // 12px
	xl: '1rem', // 16px
	'2xl': '1.5rem', // 24px
	'3xl': '2rem', // 32px
	full: '9999px'
} as const

/**
 * Box shadow scale for depth and elevation
 */
export const SHADOW_SCALE = {
	none: 'none',
	xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
	sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
	default: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
	md: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
	lg: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
	xl: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
	'2xl': '0 50px 100px -20px rgb(0 0 0 / 0.25)',
	inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)'
} as const

// =============================================================================
// ANIMATION CONSTANTS
// =============================================================================

/**
 * Standard animation durations for consistent motion
 */
export const ANIMATION_DURATIONS = {
	fast: '150ms',
	default: '200ms',
	medium: '300ms',
	slow: '500ms',
	slower: '800ms'
} as const

/**
 * Easing functions for natural motion
 */
export const ANIMATION_EASINGS = {
	linear: 'linear',
	easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
	easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
	easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
	bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
	sharp: 'cubic-bezier(0.4, 0, 0.6, 1)'
} as const

// =============================================================================
// BREAKPOINT SYSTEM
// =============================================================================

/**
 * Responsive breakpoints aligned with Tailwind CSS
 */
export const BREAKPOINTS = {
	xs: '475px',
	sm: '640px',
	md: '768px',
	lg: '1024px',
	xl: '1280px',
	'2xl': '1536px'
} as const

/**
 * Container max widths for each breakpoint
 */
export const CONTAINER_SIZES = {
	sm: '640px',
	md: '768px',
	lg: '1024px',
	xl: '1280px',
	'2xl': '1536px'
} as const

// =============================================================================
// Z-INDEX SCALE
// =============================================================================

/**
 * Z-index scale for consistent layering
 */
export const Z_INDEX_SCALE = {
	hide: -1,
	auto: 'auto',
	base: 0,
	docked: 10,
	dropdown: 1000,
	sticky: 1100,
	banner: 1200,
	overlay: 1300,
	modal: 1400,
	popover: 1500,
	skipLink: 1600,
	toast: 1700,
	tooltip: 1800
} as const

// =============================================================================
// COMPONENT PRESETS
// =============================================================================

/**
 * Pre-configured component variants for common patterns
 */
export const COMPONENT_PRESETS = {
	button: {
		primary: {
			background: SEMANTIC_COLORS.primary,
			color: SEMANTIC_COLORS['primary-foreground'],
			border: 'transparent',
			fontWeight: '500',
			transition: `all ${ANIMATION_DURATIONS.fast} ${ANIMATION_EASINGS.easeInOut}`
		},
		secondary: {
			background: SEMANTIC_COLORS.secondary,
			color: SEMANTIC_COLORS['secondary-foreground'],
			border: 'transparent',
			fontWeight: '500',
			transition: `all ${ANIMATION_DURATIONS.fast} ${ANIMATION_EASINGS.easeInOut}`
		},
		outline: {
			background: 'transparent',
			color: SEMANTIC_COLORS.foreground,
			border: SEMANTIC_COLORS.border,
			fontWeight: '500',
			transition: `all ${ANIMATION_DURATIONS.fast} ${ANIMATION_EASINGS.easeInOut}`
		},
		ghost: {
			background: 'transparent',
			color: SEMANTIC_COLORS.foreground,
			border: 'transparent',
			fontWeight: '500',
			transition: `all ${ANIMATION_DURATIONS.fast} ${ANIMATION_EASINGS.easeInOut}`
		}
	},

	input: {
		default: {
			background: SEMANTIC_COLORS.background,
			color: SEMANTIC_COLORS.foreground,
			border: SEMANTIC_COLORS.border,
			borderRadius: BORDER_RADIUS_SCALE.md,
			fontSize: TYPOGRAPHY_SCALE['body-sm'].fontSize,
			transition: `all ${ANIMATION_DURATIONS.fast} ${ANIMATION_EASINGS.easeInOut}`
		}
	},

	card: {
		default: {
			background: SEMANTIC_COLORS.card,
			color: SEMANTIC_COLORS['card-foreground'],
			border: SEMANTIC_COLORS.border,
			borderRadius: BORDER_RADIUS_SCALE.lg,
			boxShadow: SHADOW_SCALE.sm
		},
		elevated: {
			background: SEMANTIC_COLORS.card,
			color: SEMANTIC_COLORS['card-foreground'],
			border: SEMANTIC_COLORS.border,
			borderRadius: BORDER_RADIUS_SCALE.lg,
			boxShadow: SHADOW_SCALE.md
		}
	}
} as const

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type SpacingSize = keyof typeof SPACING_SCALE
export type TypographyVariant = keyof typeof TYPOGRAPHY_SCALE
export type ComponentSize = keyof typeof COMPONENT_SIZES
export type BorderRadiusSize = keyof typeof BORDER_RADIUS_SCALE
export type ShadowSize = keyof typeof SHADOW_SCALE
export type AnimationDuration = keyof typeof ANIMATION_DURATIONS
export type AnimationEasing = keyof typeof ANIMATION_EASINGS
export type Breakpoint = keyof typeof BREAKPOINTS
export type ZIndexLevel = keyof typeof Z_INDEX_SCALE

// Professional Typography Utilities for Easy Component Usage
export type DisplayVariant = 'display-2xl' | 'display-xl' | 'display-lg'
export type HeadingVariant =
	| 'heading-xl'
	| 'heading-lg'
	| 'heading-md'
	| 'heading-sm'
export type BodyVariant = 'body-lg' | 'body-md' | 'body-sm' | 'body-xs'
export type UIVariant = 'ui-title' | 'ui-label' | 'ui-caption'
export type MarketingVariant =
	| 'hero-primary'
	| 'hero-secondary'
	| 'feature-title'
	| 'cta-text'
