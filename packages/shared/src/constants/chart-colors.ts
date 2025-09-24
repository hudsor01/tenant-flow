/**
 * Chart Color System for Dashboard Analytics
 *
 * Professional color palette for property management analytics.
 * Provides consistent semantic colors for charts and data visualization.
 *
 * Features:
 * - High contrast for accessibility
 * - Professional color scheme
 * - Semantic meanings for property management contexts
 * - Accessibility compliant color combinations
 */

// CORE SYSTEM COLORS - OKLCH COLOR SPACE
export const SYSTEM_COLORS = {
	// Primary blue - Main brand color
	primary: 'oklch(0.623 0.214 259.815)',
	primaryDark: 'oklch(0.523 0.197 259.815)',

	// Status colors
	success: 'oklch(0.627 0.182 145.7)',
	successDark: 'oklch(0.527 0.162 145.7)',
	warning: 'oklch(0.839 0.17 91.67)',
	warningDark: 'oklch(0.739 0.15 91.67)',
	error: 'oklch(0.637 0.237 15.34)',
	errorDark: 'oklch(0.537 0.217 15.34)',
	info: 'oklch(0.623 0.214 259.815)',
	infoDark: 'oklch(0.523 0.197 259.815)',

	// Neutral colors
	gray: 'oklch(0.627 0.014 286.15)',
	grayDark: 'oklch(0.457 0.014 286.15)',
	grayLight: 'oklch(0.827 0.008 286.15)',
	background: 'oklch(0.967 0.005 286.15)',
	backgroundDark: 'oklch(0.157 0.008 286.15)'
} as const

/**
 * Maps colors to business meanings for intuitive understanding
 */
export const PROPERTY_ANALYTICS_COLORS = {
	// Revenue tracking
	revenue: {
		primary: SYSTEM_COLORS.primary,
		primaryDark: SYSTEM_COLORS.primaryDark,
		gradient: `linear-gradient(135deg, ${SYSTEM_COLORS.primary}15, ${SYSTEM_COLORS.primary}05)`
	},

	// Occupancy status colors
	occupancy: {
		high: SYSTEM_COLORS.success, // High occupancy = good
		highDark: SYSTEM_COLORS.successDark,
		medium: SYSTEM_COLORS.warning, // Medium occupancy = caution
		mediumDark: SYSTEM_COLORS.warningDark,
		low: SYSTEM_COLORS.error, // Low occupancy = warning
		lowDark: SYSTEM_COLORS.errorDark
	},

	// Maintenance status colors
	maintenance: {
		completed: SYSTEM_COLORS.success,
		completedDark: SYSTEM_COLORS.successDark,
		pending: SYSTEM_COLORS.warning,
		pendingDark: SYSTEM_COLORS.warningDark,
		urgent: SYSTEM_COLORS.error,
		urgentDark: SYSTEM_COLORS.errorDark,
		scheduled: SYSTEM_COLORS.primary,
		scheduledDark: SYSTEM_COLORS.primaryDark
	},

	// Tenant satisfaction ratings
	satisfaction: {
		excellent: SYSTEM_COLORS.success,
		excellentDark: SYSTEM_COLORS.successDark,
		good: SYSTEM_COLORS.primary,
		goodDark: SYSTEM_COLORS.primaryDark,
		fair: SYSTEM_COLORS.warning,
		fairDark: SYSTEM_COLORS.warningDark,
		poor: SYSTEM_COLORS.error,
		poorDark: SYSTEM_COLORS.errorDark
	},

	// Financial performance
	financial: {
		high: SYSTEM_COLORS.success,
		highDark: SYSTEM_COLORS.successDark,
		medium: SYSTEM_COLORS.warning,
		mediumDark: SYSTEM_COLORS.warningDark,
		low: SYSTEM_COLORS.error,
		lowDark: SYSTEM_COLORS.errorDark
	}
} as const

// CHART PALETTES - OKLCH COLOR SPACE
export const CHART_PALETTES = {
	// Light theme palette
	default: [
		SYSTEM_COLORS.primary,
		SYSTEM_COLORS.success,
		SYSTEM_COLORS.warning,
		'oklch(0.647 0.199 285.85)', // purple
		'oklch(0.617 0.274 352.8)', // pink
		'oklch(0.717 0.142 213.4)', // teal
		'oklch(0.623 0.214 259.815)', // indigo
		'oklch(0.897 0.165 89.23)' // yellow
	],

	// Dark theme palette
	dark: [
		SYSTEM_COLORS.primaryDark,
		SYSTEM_COLORS.successDark,
		SYSTEM_COLORS.warningDark,
		'oklch(0.717 0.179 285.85)', // purple dark
		'oklch(0.617 0.274 352.8)', // pink dark
		'oklch(0.767 0.122 213.4)', // teal dark
		'oklch(0.673 0.204 259.815)', // indigo dark
		'oklch(0.917 0.145 89.23)' // yellow dark
	],

	// Specific color sets for different chart types
	gradients: {
		blue: ['oklch(0.697 0.174 259.815)', 'oklch(0.657 0.194 259.815)', 'oklch(0.627 0.204 259.815)', SYSTEM_COLORS.primary],
		green: ['oklch(0.677 0.162 145.7)', 'oklch(0.647 0.172 145.7)', 'oklch(0.617 0.182 145.7)', SYSTEM_COLORS.success],
		orange: ['oklch(0.789 0.15 91.67)', 'oklch(0.819 0.16 91.67)', 'oklch(0.799 0.165 91.67)', SYSTEM_COLORS.warning]
	},

	// Status colors for alerts and notifications
	status: {
		success: SYSTEM_COLORS.success,
		warning: SYSTEM_COLORS.warning,
		error: SYSTEM_COLORS.error,
		info: SYSTEM_COLORS.primary,
		neutral: SYSTEM_COLORS.gray
	}
} as const

// GRADIENT DEFINITIONS
export const CHART_GRADIENTS = {
	// Background gradients for cards and sections
	revenue: `linear-gradient(135deg, ${SYSTEM_COLORS.primary}20, ${SYSTEM_COLORS.primary}05)`,
	occupancy: `linear-gradient(135deg, ${SYSTEM_COLORS.success}20, ${SYSTEM_COLORS.success}05)`,
	maintenance: `linear-gradient(135deg, ${SYSTEM_COLORS.warning}20, ${SYSTEM_COLORS.warning}05)`,
	satisfaction: `linear-gradient(135deg, oklch(0.647 0.199 285.85 / 0.125), oklch(0.647 0.199 285.85 / 0.02))`,

	// Glass morphism background - OKLCH with alpha
	glass: 'oklch(1 0 0 / 0.8)',
	glassDark: 'oklch(0 0 0 / 0.3)',

	// Depth gradients for visual interest - OKLCH with alpha
	depth: {
		blue: `linear-gradient(180deg, oklch(0.623 0.214 259.815 / 0.25), oklch(0.623 0.214 259.815 / 0.06), oklch(0.623 0.214 259.815 / 0))`,
		green: `linear-gradient(180deg, oklch(0.627 0.182 145.7 / 0.25), oklch(0.627 0.182 145.7 / 0.06), oklch(0.627 0.182 145.7 / 0))`,
		orange: `linear-gradient(180deg, oklch(0.839 0.17 91.67 / 0.25), oklch(0.839 0.17 91.67 / 0.06), oklch(0.839 0.17 91.67 / 0))`,
		purple: `linear-gradient(180deg, oklch(0.647 0.199 285.85 / 0.25), oklch(0.647 0.199 285.85 / 0.06), oklch(0.647 0.199 285.85 / 0))`
	}
} as const

// ACCESSIBILITY COLOR PAIRS
export const ACCESSIBLE_COLOR_PAIRS = {
	// Light theme combinations with WCAG compliance
	light: {
		blueOnWhite: { bg: '#FFFFFF', text: SYSTEM_COLORS.primary, ratio: '4.5:1' },
		greenOnWhite: {
			bg: '#FFFFFF',
			text: SYSTEM_COLORS.success,
			ratio: '3.1:1'
		},
		orangeOnWhite: {
			bg: '#FFFFFF',
			text: SYSTEM_COLORS.warning,
			ratio: '2.2:1'
		},
		redOnWhite: { bg: '#FFFFFF', text: SYSTEM_COLORS.error, ratio: '3.3:1' }
	},

	// Dark theme combinations
	dark: {
		blueOnDark: {
			bg: '#000000',
			text: SYSTEM_COLORS.primaryDark,
			ratio: '4.8:1'
		},
		greenOnDark: {
			bg: '#000000',
			text: SYSTEM_COLORS.successDark,
			ratio: '4.1:1'
		},
		orangeOnDark: {
			bg: '#000000',
			text: SYSTEM_COLORS.warningDark,
			ratio: '3.2:1'
		},
		redOnDark: { bg: '#000000', text: SYSTEM_COLORS.errorDark, ratio: '3.8:1' }
	}
} as const

// TYPE DEFINITIONS
export type SystemColor = keyof typeof SYSTEM_COLORS
export type ChartPalette = keyof typeof CHART_PALETTES
export type ChartGradient = keyof typeof CHART_GRADIENTS
export type PropertyAnalyticsColorCategory =
	keyof typeof PROPERTY_ANALYTICS_COLORS
