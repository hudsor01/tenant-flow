/**
 * Typography Token Bridge
 * Maps design tokens from tenantflow-ui-kit.tokens.json to Tailwind utilities
 * Provides a bridge between design system tokens and application typography
 */

// =============================================================================
// DESIGN TOKEN DEFINITIONS
// =============================================================================

/**
 * Roboto Typography Scale from Design Tokens
 * These values are extracted from tenantflow-ui-kit.tokens.json
 * and represent the core typography system
 */
export const TYPOGRAPHY_TOKENS = {
	// Large Display (26px variants)
	'sf-display-lg': {
		fontFamily: 'Roboto',
		fontSize: '26px',
		fontWeight: 400,
		letterSpacing: '0px',
		lineHeight: 1.23
	},
	'sf-display-lg-bold': {
		fontFamily: 'Roboto',
		fontSize: '26px',
		fontWeight: 700,
		letterSpacing: '0px',
		lineHeight: 1.23
	},

	// Medium Display (22px variants)
	'sf-display-md': {
		fontFamily: 'Roboto',
		fontSize: '22px',
		fontWeight: 400,
		letterSpacing: '0px',
		lineHeight: 1.18
	},
	'sf-display-md-bold': {
		fontFamily: 'Roboto',
		fontSize: '22px',
		fontWeight: 700,
		letterSpacing: '0px',
		lineHeight: 1.18
	},

	// Body Text (17px variants)
	'sf-body': {
		fontFamily: 'Roboto',
		fontSize: '17px',
		fontWeight: 400,
		letterSpacing: '0px',
		lineHeight: 1.29
	},
	'sf-body-bold': {
		fontFamily: 'Roboto',
		fontSize: '17px',
		fontWeight: 700,
		letterSpacing: '0px',
		lineHeight: 1.29
	},

	// Callout (15px variants)
	'sf-callout': {
		fontFamily: 'Roboto',
		fontSize: '15px',
		fontWeight: 400,
		letterSpacing: '0px',
		lineHeight: 1.33
	},
	'sf-callout-semibold': {
		fontFamily: 'Roboto',
		fontSize: '15px',
		fontWeight: 600,
		letterSpacing: '0px',
		lineHeight: 1.33
	},

	// Label (13px variants)
	'sf-label': {
		fontFamily: 'Roboto',
		fontSize: '13px',
		fontWeight: 400,
		letterSpacing: '0px',
		lineHeight: 1.23
	},
	'sf-label-semibold': {
		fontFamily: 'Roboto',
		fontSize: '13px',
		fontWeight: 600,
		letterSpacing: '0px',
		lineHeight: 1.23
	},
	'sf-label-bold': {
		fontFamily: 'Roboto',
		fontSize: '13px',
		fontWeight: 700,
		letterSpacing: '0px',
		lineHeight: 1.23
	},
	'sf-label-heavy': {
		fontFamily: 'Roboto',
		fontSize: '13px',
		fontWeight: 900,
		letterSpacing: '0px',
		lineHeight: 1.23
	},

	// Caption (12px variants)
	'sf-caption': {
		fontFamily: 'Roboto',
		fontSize: '12px',
		fontWeight: 400,
		letterSpacing: '0px',
		lineHeight: 1.25
	},
	'sf-caption-semibold': {
		fontFamily: 'Roboto',
		fontSize: '12px',
		fontWeight: 600,
		letterSpacing: '0px',
		lineHeight: 1.25
	},

	// Small Text (11px variants)
	'sf-small': {
		fontFamily: 'Roboto',
		fontSize: '11px',
		fontWeight: 400,
		letterSpacing: '0px',
		lineHeight: 1.27
	},
	'sf-small-semibold': {
		fontFamily: 'Roboto',
		fontSize: '11px',
		fontWeight: 600,
		letterSpacing: '0px',
		lineHeight: 1.27
	},

	// Micro Text (10px variants)
	'sf-micro': {
		fontFamily: 'Roboto',
		fontSize: '10px',
		fontWeight: 400,
		letterSpacing: '0px',
		lineHeight: 1.3
	},
	'sf-micro-semibold': {
		fontFamily: 'Roboto',
		fontSize: '10px',
		fontWeight: 600,
		letterSpacing: '0px',
		lineHeight: 1.3
	}
} as const

// =============================================================================
// TAILWIND UTILITY MAPPING
// =============================================================================

/**
 * Maps design tokens to Tailwind utility classes
 * This provides a bridge between the design system and application code
 */
export const TOKEN_TO_TAILWIND_MAP = {
	// Display variants (26px/22px) - with Roboto font
	'sf-display-lg':
		'font-sans text-[26px] font-normal leading-[1.23] tracking-normal',
	'sf-display-lg-bold':
		'font-sans text-[26px] font-bold leading-[1.23] tracking-normal',
	'sf-display-md':
		'font-sans text-[22px] font-normal leading-[1.18] tracking-normal',
	'sf-display-md-bold':
		'font-sans text-[22px] font-bold leading-[1.18] tracking-normal',

	// Body variants (17px)
	'sf-body': 'font-sans text-[17px] font-normal leading-[1.29] tracking-normal',
	'sf-body-bold':
		'font-sans text-[17px] font-bold leading-[1.29] tracking-normal',

	// Callout variants (15px)
	'sf-callout':
		'font-sans text-[15px] font-normal leading-[1.33] tracking-normal',
	'sf-callout-semibold':
		'font-sans text-[15px] font-semibold leading-[1.33] tracking-normal',

	// Label variants (13px)
	'sf-label':
		'font-sans text-[13px] font-normal leading-[1.23] tracking-normal',
	'sf-label-semibold':
		'font-sans text-[13px] font-semibold leading-[1.23] tracking-normal',
	'sf-label-bold':
		'font-sans text-[13px] font-bold leading-[1.23] tracking-normal',
	'sf-label-heavy':
		'font-sans text-[13px] font-black leading-[1.23] tracking-normal',

	// Caption variants (12px)
	'sf-caption': 'font-sans text-xs font-normal leading-[1.25] tracking-normal',
	'sf-caption-semibold':
		'font-sans text-xs font-semibold leading-[1.25] tracking-normal',

	// Small variants (11px)
	'sf-small':
		'font-sans text-[11px] font-normal leading-[1.27] tracking-normal',
	'sf-small-semibold':
		'font-sans text-[11px] font-semibold leading-[1.27] tracking-normal',

	// Micro variants (10px)
	'sf-micro': 'font-sans text-[10px] font-normal leading-[1.3] tracking-normal',
	'sf-micro-semibold':
		'font-sans text-[10px] font-semibold leading-[1.3] tracking-normal'
} as const

// =============================================================================
// SEMANTIC TYPOGRAPHY MAPPING
// =============================================================================

/**
 * Maps semantic use cases to design tokens
 * This provides meaningful names for common UI patterns
 */
export const SEMANTIC_TYPOGRAPHY = {
	// Page Headers
	'page-title': 'sf-display-lg-bold',
	'page-subtitle': 'sf-display-md',
	'section-title': 'sf-display-md-bold',
	'section-subtitle': 'sf-body',

	// Content
	'body-primary': 'sf-body',
	'body-secondary': 'sf-callout',
	'body-emphasis': 'sf-body-bold',

	// UI Elements
	'button-primary': 'sf-body-bold',
	'button-secondary': 'sf-callout-semibold',
	'input-label': 'sf-label-semibold',
	'input-text': 'sf-body',
	'input-placeholder': 'sf-body',
	'input-helper': 'sf-caption',
	'input-error': 'sf-caption-semibold',

	// Navigation
	'nav-primary': 'sf-body-bold',
	'nav-secondary': 'sf-callout-semibold',
	breadcrumb: 'sf-caption',
	'tab-active': 'sf-body-bold',
	'tab-inactive': 'sf-body',

	// Data Display
	'table-header': 'sf-label-bold',
	'table-cell': 'sf-body',
	'stat-value': 'sf-display-lg-bold',
	'stat-label': 'sf-label',
	badge: 'sf-caption-semibold',
	tag: 'sf-small-semibold',

	// Feedback
	'toast-title': 'sf-body-bold',
	'toast-message': 'sf-callout',
	tooltip: 'sf-caption',
	'alert-title': 'sf-body-bold',
	'alert-message': 'sf-callout',

	// Metadata
	timestamp: 'sf-caption',
	author: 'sf-label-semibold',
	meta: 'sf-small',
	copyright: 'sf-micro'
} as const

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get Tailwind classes for a given typography token
 * @param token - The typography token name
 * @returns Tailwind utility classes string
 */
export function getTypographyClasses(
	token: keyof typeof TOKEN_TO_TAILWIND_MAP
): string {
	return TOKEN_TO_TAILWIND_MAP[token]
}

/**
 * Get Tailwind classes for a semantic typography use case
 * @param semantic - The semantic typography name
 * @returns Tailwind utility classes string
 */
export function getSemanticTypography(
	semantic: keyof typeof SEMANTIC_TYPOGRAPHY
): string {
	const token = SEMANTIC_TYPOGRAPHY[semantic]
	return TOKEN_TO_TAILWIND_MAP[token]
}

/**
 * Get raw token values for a given typography token
 * @param token - The typography token name
 * @returns Typography token object with all properties
 */
export function getTypographyToken(token: keyof typeof TYPOGRAPHY_TOKENS) {
	return TYPOGRAPHY_TOKENS[token]
}

// =============================================================================
// REACT COMPONENT UTILITIES
// =============================================================================

/**
 * Typography variant type for React components
 */
export type TypographyVariant = keyof typeof TOKEN_TO_TAILWIND_MAP

/**
 * Semantic typography type for React components
 */
export type SemanticTypographyVariant = keyof typeof SEMANTIC_TYPOGRAPHY

/**
 * Props for typography components
 */
export interface TypographyProps {
	variant?: TypographyVariant
	semantic?: SemanticTypographyVariant
	className?: string
	as?: React.ElementType
}

/**
 * Helper to combine typography classes with custom classes
 * @param props - Typography component props
 * @returns Combined className string
 */
export function getTypographyClassName(props: TypographyProps): string {
	const { variant, semantic, className = '' } = props

	let baseClasses = ''

	if (semantic) {
		baseClasses = getSemanticTypography(semantic)
	} else if (variant) {
		baseClasses = getTypographyClasses(variant)
	}

	return `${baseClasses} ${className}`.trim()
}

// =============================================================================
// MIGRATION HELPER
// =============================================================================

/**
 * Maps old TYPOGRAPHY_SCALE keys to new design tokens
 * This helps with gradual migration from the old system
 */
export const TYPOGRAPHY_SCALE_MIGRATION = {
	// Display sizes
	'display-2xl': 'sf-display-lg-bold',
	'display-xl': 'sf-display-lg-bold',
	'display-lg': 'sf-display-md-bold',

	// Heading sizes
	'heading-xl': 'sf-display-md-bold',
	'heading-lg': 'sf-display-md',
	'heading-md': 'sf-body-bold',
	'heading-sm': 'sf-body',

	// Body text
	'body-lg': 'sf-body',
	'body-md': 'sf-callout',
	'body-sm': 'sf-label',
	'body-xs': 'sf-caption',

	// UI variants
	'ui-title': 'sf-body-bold',
	'ui-label': 'sf-label-semibold',
	'ui-caption': 'sf-caption',

	// Marketing
	'hero-primary': 'sf-display-lg-bold',
	'hero-secondary': 'sf-body',
	'feature-title': 'sf-display-md',
	'cta-text': 'sf-body-bold'
} as const

/**
 * Get new token name from old TYPOGRAPHY_SCALE key
 * @param oldKey - The old TYPOGRAPHY_SCALE key
 * @returns New design token name
 */
export function migrateTypographyScale(
	oldKey: keyof typeof TYPOGRAPHY_SCALE_MIGRATION
): string {
	return TYPOGRAPHY_SCALE_MIGRATION[oldKey]
}
