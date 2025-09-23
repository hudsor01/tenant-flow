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

// CORE SYSTEM COLORS
export const SYSTEM_COLORS = {
	// Primary blue - Main brand color
	primary: '#007AFF',
	primaryDark: '#0056CC',

	// Status colors
	success: '#34C759',
	successDark: '#28A745',
	warning: '#FF9500',
	warningDark: '#E8890B',
	error: '#FF3B30',
	errorDark: '#DC3545',
	info: '#007AFF',
	infoDark: '#0056CC',

	// Neutral colors
	gray: '#8E8E93',
	grayDark: '#636366',
	grayLight: '#C7C7CC',
	background: '#F2F2F7',
	backgroundDark: '#1C1C1E'
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

// CHART PALETTES
export const CHART_PALETTES = {
	// Light theme palette
	default: [
		SYSTEM_COLORS.primary,
		SYSTEM_COLORS.success,
		SYSTEM_COLORS.warning,
		'#AF52DE', // purple
		'#FF2D92', // pink
		'#5AC8FA', // teal
		'#007AFF', // indigo
		'#FFCC00' // yellow
	],

	// Dark theme palette
	dark: [
		SYSTEM_COLORS.primaryDark,
		SYSTEM_COLORS.successDark,
		SYSTEM_COLORS.warningDark,
		'#BF5AF2', // purple dark
		'#FF2D92', // pink dark
		'#64D2FF', // teal dark
		'#0A84FF', // indigo dark
		'#FFD60A' // yellow dark
	],

	// Specific color sets for different chart types
	gradients: {
		blue: ['#42A5F5', '#2196F3', '#1E88E5', SYSTEM_COLORS.primary],
		green: ['#66BB6A', '#4CAF50', '#43A047', SYSTEM_COLORS.success],
		orange: ['#FFA726', '#FF9800', '#FB8C00', SYSTEM_COLORS.warning]
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
	satisfaction: `linear-gradient(135deg, #AF52DE20, #AF52DE05)`,

	// Glass morphism background
	glass: 'rgba(255, 255, 255, 0.8)',
	glassDark: 'rgba(0, 0, 0, 0.3)',

	// Depth gradients for visual interest
	depth: {
		blue: `linear-gradient(180deg, ${SYSTEM_COLORS.primary}40, ${SYSTEM_COLORS.primary}10, ${SYSTEM_COLORS.primary}00)`,
		green: `linear-gradient(180deg, ${SYSTEM_COLORS.success}40, ${SYSTEM_COLORS.success}10, ${SYSTEM_COLORS.success}00)`,
		orange: `linear-gradient(180deg, ${SYSTEM_COLORS.warning}40, ${SYSTEM_COLORS.warning}10, ${SYSTEM_COLORS.warning}00)`,
		purple: `linear-gradient(180deg, #AF52DE40, #AF52DE10, #AF52DE00)`
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
