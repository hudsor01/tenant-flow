/**
 * Motion System v2.0.0
 *
 * Professional interaction standards that create micro-anticipation and satisfaction.
 * Based on modern design principles and "Tactile Addiction" concepts.
 *
 * Critical Requirements:
 * - Button presses feel satisfying with immediate visual response
 * - Hover states create micro-anticipation
 * - All interactions pass the 'bored browsing test'
 * - Components are screenshot-worthy
 * - Zero custom CSS - design tokens only
 */

// =============================================================================
// MOTION TOKENS - CORE TIMING FUNCTIONS
// =============================================================================

/**
 * Professional easing functions
 * These create satisfying "snap" feeling in modern interfaces
 */
export const MOTION_EASINGS = {
	// Primary - signature ease-out-expo for satisfying button presses
	'ease-out-expo': 'cubic-bezier(0.19, 1, 0.22, 1)',

	// Supporting easings for different interaction types
	'ease-out-back': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
	'ease-out-quart': 'cubic-bezier(0.25, 1, 0.5, 1)',
	'ease-in-out-circ': 'cubic-bezier(0.785, 0.135, 0.15, 0.86)',

	// Micro-interactions
	'ease-spring': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
	'ease-anticipation': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
} as const

/**
 * Carefully calibrated durations
 * Fast enough to feel responsive, long enough to be satisfying
 */
export const MOTION_DURATIONS = {
	// Micro-interactions (hover, focus, press)
	'duration-micro': '150ms', // Button press feedback
	'duration-fast': '200ms', // Quick state changes
	'duration-standard': '300ms', // Default transitions
	'duration-slow': '400ms', // Page transitions
	'duration-lazy': '600ms', // Background animations

	// Special cases
	'duration-instant': '50ms', // Immediate feedback
	'duration-deliberate': '800ms' // Thoughtful animations
} as const

// =============================================================================
// INTERACTION PATTERNS - TACTILE ADDICTION
// =============================================================================

/**
 * Transform values that create satisfying interaction feedback
 * Optimized for touch and cursor interactions
 */
export const MOTION_TRANSFORMS = {
	// Button press states - feel satisfying on all devices
	'press-tight': 'scale(0.96)', // Strong press feedback
	'press-gentle': 'scale(0.98)', // Subtle press feedback
	'press-bounce': 'scale(1.05)', // Overshoot effect

	// Hover effects - create micro-anticipation
	'hover-lift': 'translateY(-1px)', // Gentle lift
	'hover-float': 'translateY(-2px)', // More pronounced lift
	'hover-grow': 'scale(1.02)', // Slight growth
	'hover-shrink': 'scale(0.98)', // Gentle shrink

	// Focus states
	'focus-ring': 'scale(1.01)', // Subtle focus indication
	'focus-glow': 'scale(1.03)' // More pronounced focus
} as const

/**
 * Professional shadow system for depth and interaction feedback
 * Creates visual hierarchy and interaction cues
 */
export const MOTION_SHADOWS = {
	// Rest states
	'shadow-none': 'none',
	'shadow-subtle': '0 1px 2px rgba(0, 0, 0, 0.05)',
	'shadow-soft': '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
	'shadow-medium':
		'0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06)',

	// Interactive states
	'shadow-hover':
		'0 8px 25px rgba(0, 0, 0, 0.12), 0 4px 10px rgba(0, 0, 0, 0.08)',
	'shadow-active':
		'0 2px 4px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.08)',
	'shadow-focus':
		'0 0 0 3px rgba(59, 130, 246, 0.15), 0 4px 6px rgba(0, 0, 0, 0.07)',

	// Elevated states
	'shadow-large':
		'0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)',
	'shadow-xl':
		'0 25px 50px rgba(0, 0, 0, 0.15), 0 12px 30px rgba(0, 0, 0, 0.08)'
} as const

/**
 * Touch target specifications for accessibility
 * Ensures comfortable interaction on all devices
 */
export const MOTION_TOUCH_TARGETS = {
	// Minimum sizes for touch accessibility
	'touch-small': '32px', // Compact interfaces
	'touch-medium': '44px', // Standard recommended
	'touch-large': '56px', // Easier access
	'touch-xl': '64px', // Maximum comfort

	// Interactive zones
	'hit-area-expand': '8px', // Invisible hit area expansion
	'hit-area-large': '12px' // More generous hit area
} as const

/**
 * Glass morphism effects for modern interface depth
 * Creates sophisticated visual hierarchy
 */
export const MOTION_GLASS = {
	// Background blur effects
	'glass-subtle': 'backdrop-blur(8px)',
	'glass-medium-blur': 'backdrop-blur(12px)',
	'glass-strong': 'backdrop-blur(16px)',

	// Glass surface colors
	'glass-light': 'rgba(255, 255, 255, 0.8)',
	'glass-medium': 'rgba(255, 255, 255, 0.6)',
	'glass-dark': 'rgba(0, 0, 0, 0.3)',

	// Border effects for glass surfaces
	'glass-border': '1px solid rgba(255, 255, 255, 0.2)',
	'glass-border-strong': '1px solid rgba(255, 255, 255, 0.3)'
} as const

/**
 * Professional border radius system
 * Creates consistent corner rounding across components
 */
export const MOTION_RADIUS = {
	'radius-none': '0',
	'radius-small': '4px', // Subtle rounding
	'radius-medium': '8px', // Standard rounding
	'radius-large': '12px', // Generous rounding
	'radius-xl': '16px', // Card-like rounding
	'radius-full': '9999px' // Pills and circles
} as const

// =============================================================================
// MOTION PRESETS - READY-TO-USE COMBINATIONS
// =============================================================================

/**
 * Pre-configured motion combinations for common interactions
 * Apply these directly to components for consistent behavior
 */
export const MOTION_PRESETS = {
	// Button interactions
	buttonPress: {
		transform: MOTION_TRANSFORMS['press-gentle'],
		transition: `all ${MOTION_DURATIONS['duration-fast']} ${MOTION_EASINGS['ease-out-expo']}`,
		boxShadow: MOTION_SHADOWS['shadow-active']
	},

	buttonHover: {
		transform: MOTION_TRANSFORMS['hover-lift'],
		transition: `all ${MOTION_DURATIONS['duration-fast']} ${MOTION_EASINGS['ease-out-expo']}`,
		boxShadow: MOTION_SHADOWS['shadow-hover']
	},

	// Card interactions
	cardHover: {
		transform: MOTION_TRANSFORMS['hover-float'],
		transition: `all ${MOTION_DURATIONS['duration-standard']} ${MOTION_EASINGS['ease-out-expo']}`,
		boxShadow: MOTION_SHADOWS['shadow-hover']
	},

	cardPress: {
		transform: MOTION_TRANSFORMS['press-tight'],
		transition: `all ${MOTION_DURATIONS['duration-micro']} ${MOTION_EASINGS['ease-out-expo']}`,
		boxShadow: MOTION_SHADOWS['shadow-active']
	},

	// Focus states
	focusRing: {
		outline: 'none',
		boxShadow: MOTION_SHADOWS['shadow-focus'],
		transition: `box-shadow ${MOTION_DURATIONS['duration-fast']} ${MOTION_EASINGS['ease-out-expo']}`
	},

	// Loading states
	loadingPulse: {
		animation: `pulse ${MOTION_DURATIONS['duration-slow']} ${MOTION_EASINGS['ease-in-out-circ']} infinite`
	}
} as const

// =============================================================================
// CSS CUSTOM PROPERTIES - FOR DIRECT CSS USAGE
// =============================================================================

/**
 * CSS custom properties for direct stylesheet usage
 * Can be applied in global CSS or component stylesheets
 */
export const MOTION_CSS_VARS = {
	// Easings
	'--ease-out-expo': MOTION_EASINGS['ease-out-expo'],
	'--ease-out-back': MOTION_EASINGS['ease-out-back'],
	'--ease-spring': MOTION_EASINGS['ease-spring'],

	// Durations
	'--duration-micro': MOTION_DURATIONS['duration-micro'],
	'--duration-fast': MOTION_DURATIONS['duration-fast'],
	'--duration-standard': MOTION_DURATIONS['duration-standard'],
	'--duration-slow': MOTION_DURATIONS['duration-slow'],

	// Transforms
	'--press-gentle': MOTION_TRANSFORMS['press-gentle'],
	'--hover-lift': MOTION_TRANSFORMS['hover-lift'],
	'--hover-grow': MOTION_TRANSFORMS['hover-grow'],

	// Shadows
	'--shadow-soft': MOTION_SHADOWS['shadow-soft'],
	'--shadow-hover': MOTION_SHADOWS['shadow-hover'],
	'--shadow-focus': MOTION_SHADOWS['shadow-focus'],

	// Touch targets
	'--touch-medium': MOTION_TOUCH_TARGETS['touch-medium'],
	'--touch-large': MOTION_TOUCH_TARGETS['touch-large'],

	// Radius
	'--radius-medium': MOTION_RADIUS['radius-medium'],
	'--radius-large': MOTION_RADIUS['radius-large']
} as const

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type MotionEasing = keyof typeof MOTION_EASINGS
export type MotionDuration = keyof typeof MOTION_DURATIONS
export type MotionTransform = keyof typeof MOTION_TRANSFORMS
export type MotionShadow = keyof typeof MOTION_SHADOWS
export type MotionTouchTarget = keyof typeof MOTION_TOUCH_TARGETS
export type MotionGlass = keyof typeof MOTION_GLASS
export type MotionRadius = keyof typeof MOTION_RADIUS
export type MotionPreset = keyof typeof MOTION_PRESETS
