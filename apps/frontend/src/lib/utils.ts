/**
 * Core Utilities - TenantFlow Design System
 *
 * This file provides essential utilities that align with TenantFlow's design system
 * and globals.css implementation. All utilities use OKLCH color space and follow
 * the minimalist, premium approach defined in the brand guidelines.
 *
 * Key Principles:
 * - Touch-first (44px minimum heights)
 * - OKLCH color space for perceptual uniformity
 * - Premium animations and micro-interactions
 * - Clean, minimalist aesthetic
 */

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Re-export design system utilities for easy access
export {
	animationClasses,
	badgeClasses,
	buttonClasses,
	cardClasses,
	containerClasses,
	formErrorClasses,
	formFieldClasses,
	formLabelClasses,
	generateThemeCSS,
	getSemanticColor,
	glassClasses,
	gridClasses,
	inputClasses,
	premiumButtonClasses,
	responsiveClasses,
	shadowClasses,
	statusClasses,
	tableClasses,
	transitionClasses,
	typographyClasses
} from './design-system'

// Re-export shared design system constants
export {
	ANIMATION_DURATIONS,
	BREAKPOINTS,
	COMPONENT_SIZES,
	SEMANTIC_COLORS,
	SHADOW_SCALE,
	SPACING_SCALE,
	TYPOGRAPHY_SCALE
} from '@repo/shared'

/**
 * Enhanced className utility with intelligent Tailwind class merging
 * Combines clsx for conditional classes with tailwind-merge for deduplication
 * @param inputs - Class values to combine and deduplicate
 * @returns Optimized class string with no duplicate or conflicting classes
 */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

/**
 * Format currency with proper locale formatting
 * @param amount - Amount to format
 * @param currency - Currency code (default: USD)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency,
		minimumFractionDigits: 0,
		maximumFractionDigits: 2
	}).format(amount)
}

/**
 * Format percentage with proper locale formatting
 * @param value - Percentage value (0-100)
 * @param decimals - Number of decimal places
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimals = 1): string {
	return new Intl.NumberFormat('en-US', {
		style: 'percent',
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals
	}).format(value / 100)
}

/**
 * Format number with proper locale formatting
 * @param value - Number to format
 * @param options - Intl.NumberFormat options
 * @returns Formatted number string
 */
export function formatNumber(
	value: number,
	options?: Intl.NumberFormatOptions
): string {
	return new Intl.NumberFormat('en-US', options).format(value)
}

/**
 * Generate random ID for component keys
 * @param prefix - Optional prefix for the ID
 * @returns Random ID string
 */
export function generateId(prefix = 'id'): string {
	return `${prefix}-${Math.random().toString(36).substring(2, 9)}`
}

// ============================================================================
// FOCUS MANAGEMENT (Touch-First & Accessibility Compliant)
// ============================================================================

/**
 * Premium focus ring that aligns with TenantFlow's design system
 * Uses OKLCH colors and proper offset for accessibility
 */
export const focusRing = [
	'outline-none',
	'focus-visible:outline-2',
	'focus-visible:outline-offset-2',
	'focus-visible:outline-[oklch(var(--focus-ring-color))]'
]

/**
 * Interactive focus styles for buttons and clickable elements
 * Includes premium hover animations
 */
export const interactiveFocus = [
	...focusRing,
	'transition-all',
	'duration-[var(--duration-quick)]',
	'ease-[var(--ease-smooth)]'
]

// ============================================================================
// INPUT STATES (Form-Focused Design System)
// ============================================================================

/**
 * Default input focus state using design system colors
 */
export const focusInput = [
	'focus:outline-none',
	'focus:ring-2',
	'focus:ring-[oklch(var(--color-primary-brand-25))]',
	'focus:border-[oklch(var(--color-primary-brand))]',
	'transition-all',
	'duration-[var(--duration-quick)]'
]

/**
 * Error state input styling
 */
export const hasErrorInput = [
	'ring-2',
	'ring-[oklch(var(--color-error-border))]',
	'border-[oklch(var(--color-error))]',
	'focus:ring-[oklch(var(--color-error-background))]'
]

/**
 * Success state input styling
 */
export const hasSuccessInput = [
	'ring-2',
	'ring-[oklch(var(--color-success-border))]',
	'border-[oklch(var(--color-success))]',
	'focus:ring-[oklch(var(--color-success-background))]'
]

/**
 * Warning state input styling
 */
export const hasWarningInput = [
	'ring-2',
	'ring-[oklch(var(--color-warning-border))]',
	'border-[oklch(var(--color-warning))]',
	'focus:ring-[oklch(var(--color-warning-background))]'
]

/**
 * Info state input styling
 */
export const hasInfoInput = [
	'ring-2',
	'ring-[oklch(var(--color-info-border))]',
	'border-[oklch(var(--color-info))]',
	'focus:ring-[oklch(var(--color-info-background))]'
]

// ============================================================================
// TOUCH-FIRST UTILITIES (44px minimum touch targets)
// ============================================================================

/**
 * Touch-friendly button base classes
 * Ensures 44px minimum height for accessibility
 */
export const touchTarget = [
	'min-h-[44px]',
	'min-w-[44px]',
	'touch-manipulation'
]

/**
 * Touch-friendly interactive element base
 */
export const touchInteractive = [
	...touchTarget,
	...interactiveFocus,
	'select-none'
]

// ============================================================================
// ANIMATION & TRANSITION UTILITIES
// ============================================================================

/**
 * Standard smooth transition for most interactions
 */
export const smoothTransition = [
	'transition-all',
	'duration-[var(--duration-quick)]',
	'ease-[var(--ease-smooth)]'
]

/**
 * Standard transition for hover effects
 */
export const standardTransition = [
	'transition-all',
	'duration-[var(--duration-standard)]',
	'ease-[var(--ease-smooth)]'
]

/**
 * Slow transition for larger movements
 */
export const slowTransition = [
	'transition-all',
	'duration-[var(--duration-slow)]',
	'ease-[var(--ease-smooth)]'
]

/**
 * Premium micro-interaction for buttons and cards
 */
export const premiumHover = [
	...smoothTransition,
	'hover:scale-[1.02]',
	'hover:-translate-y-0.5',
	'active:scale-[0.98]'
]

/**
 * Subtle hover effect for cards and containers
 */
export const subtleHover = [
	...smoothTransition,
	'hover:shadow-[var(--shadow-medium)]',
	'hover:scale-[1.01]'
]

/**
 * Glass morphism transition effects
 */
export const glassTransition = [
	'transition-all',
	'duration-[var(--duration-standard)]',
	'backdrop-blur-md'
]

// ============================================================================
// LAYOUT & SPACING UTILITIES
// ============================================================================

/**
 * Standard content container with design system spacing
 */
export const contentContainer = [
	'mx-auto',
	'px-4',
	'sm:px-6',
	'lg:px-8',
	'max-w-screen-xl'
]

/**
 * Narrow content container for forms and focused content
 */
export const narrowContainer = ['mx-auto', 'px-4', 'sm:px-6', 'max-w-2xl']

/**
 * Wide content container for dashboards
 */
export const wideContainer = [
	'mx-auto',
	'px-4',
	'sm:px-6',
	'lg:px-8',
	'max-w-7xl'
]

/**
 * Card content padding following design system
 */
export const cardPadding = ['p-6', 'sm:p-8']

/**
 * Small card padding for compact layouts
 */
export const cardPaddingSmall = ['p-4', 'sm:p-6']

/**
 * Form section spacing
 */
export const formSection = ['space-y-6']

/**
 * Grid gap using design tokens
 */
export const gridGap = ['gap-4', 'md:gap-6', 'lg:gap-8']

// ============================================================================
// TEXT & TYPOGRAPHY UTILITIES (OKLCH Color System)
// ============================================================================

/**
 * Primary text color using design system (85% opacity)
 */
export const textPrimary = 'text-[oklch(var(--color-label-primary))]'

/**
 * Secondary text color using design system (50% opacity)
 */
export const textSecondary = 'text-[oklch(var(--color-label-secondary))]'

/**
 * Tertiary text color using design system (25% opacity)
 */
export const textTertiary = 'text-[oklch(var(--color-label-tertiary))]'

/**
 * Quaternary text color using design system (10% opacity)
 */
export const textQuaternary = 'text-[oklch(var(--color-label-quaternary))]'

/**
 * Muted text color (alias for tertiary)
 */
export const textMuted = textTertiary

// ============================================================================
// BACKGROUND & SURFACE UTILITIES (OKLCH Color System)
// ============================================================================

/**
 * Primary background using design system
 */
export const bgPrimary = 'bg-[oklch(1_0_0)]'

/**
 * Secondary background with subtle fill
 */
export const bgSecondary = 'bg-[oklch(var(--color-background-secondary))]'

/**
 * Card background with primary fill
 */
export const bgCard = 'bg-[oklch(var(--color-fill-primary))]'

/**
 * Subtle card background with secondary fill
 */
export const bgCardSubtle = 'bg-[oklch(var(--color-fill-secondary))]'

/**
 * Tertiary background with minimal opacity
 */
export const bgTertiary = 'bg-[oklch(var(--color-fill-tertiary))]'

/**
 * Accent background for highlights
 */
export const bgAccent = 'bg-[oklch(var(--color-accent))]'

/**
 * Accent hover background
 */
export const bgAccentHover = 'bg-[oklch(var(--color-accent-hover))]'

/**
 * Primary brand background
 */
export const bgPrimaryBrand = 'bg-[oklch(var(--color-primary-brand))]'

/**
 * Primary brand hover background
 */
export const bgPrimaryBrandHover = 'bg-[oklch(var(--color-primary-brand-85))]'

// ============================================================================
// BORDER & SEPARATOR UTILITIES
// ============================================================================

/**
 * Standard border using separator color
 */
export const border = 'border-[oklch(var(--color-separator))]'

/**
 * Top border only
 */
export const borderTop = 'border-t-[oklch(var(--color-separator))]'

/**
 * Bottom border only
 */
export const borderBottom = 'border-b-[oklch(var(--color-separator))]'

/**
 * Left border only
 */
export const borderLeft = 'border-l-[oklch(var(--color-separator))]'

/**
 * Right border only
 */
export const borderRight = 'border-r-[oklch(var(--color-separator))]'

// ============================================================================
// SEMANTIC STATE UTILITIES (Success, Error, Warning, Info)
// ============================================================================

/**
 * Success feedback styling
 */
export const feedbackSuccess = [
	'text-[oklch(var(--color-success-foreground))]',
	'bg-[oklch(var(--color-success-background))]',
	'border-[oklch(var(--color-success-border))]'
]

/**
 * Error feedback styling
 */
export const feedbackError = [
	'text-[oklch(var(--color-error-foreground))]',
	'bg-[oklch(var(--color-error-background))]',
	'border-[oklch(var(--color-error-border))]'
]

/**
 * Warning feedback styling
 */
export const feedbackWarning = [
	'text-[oklch(var(--color-warning-foreground))]',
	'bg-[oklch(var(--color-warning-background))]',
	'border-[oklch(var(--color-warning-border))]'
]

/**
 * Info feedback styling
 */
export const feedbackInfo = [
	'text-[oklch(var(--color-info-foreground))]',
	'bg-[oklch(var(--color-info-background))]',
	'border-[oklch(var(--color-info-border))]'
]

// ============================================================================
// LOADING & STATES
// ============================================================================

/**
 * Loading skeleton animation using design system
 */
export const skeletonPulse = [
	'animate-pulse',
	'bg-[oklch(var(--color-fill-secondary))]',
	'rounded-[var(--radius-medium)]'
]

/**
 * Shimmer loading animation
 */
export const shimmerLoading = [
	'relative',
	'overflow-hidden',
	'bg-[oklch(var(--color-fill-secondary))]',
	'before:absolute',
	'before:inset-0',
	'before:-translate-x-full',
	'before:animate-[shimmer_2s_infinite]',
	'before:bg-gradient-to-r',
	'before:from-transparent',
	'before:via-white/60',
	'before:to-transparent'
]

/**
 * Disabled state styling
 */
export const disabledState = [
	'opacity-50',
	'cursor-not-allowed',
	'pointer-events-none'
]

/**
 * Loading state styling
 */
export const loadingState = ['opacity-75', 'cursor-wait', 'pointer-events-none']

// ============================================================================
// GLASS MORPHISM UTILITIES
// ============================================================================

/**
 * Glass material background
 */
export const glassMaterial = [
	'bg-[var(--glass-material)]',
	'backdrop-blur-md',
	'border-[var(--glass-border)]'
]

/**
 * Glass card with shadow
 */
export const glassCard = [
	...glassMaterial,
	'shadow-[var(--glass-shadow)]',
	'rounded-[var(--radius-large)]'
]

/**
 * Glass navigation background
 */
export const glassNav = [
	...glassMaterial,
	'backdrop-blur-lg',
	'supports-[backdrop-filter]:bg-white/60'
]

// ============================================================================
// SHADOW UTILITIES
// ============================================================================

/**
 * Small shadow using design system
 */
export const shadowSmall = 'shadow-[var(--shadow-small)]'

/**
 * Medium shadow using design system
 */
export const shadowMedium = 'shadow-[var(--shadow-medium)]'

/**
 * Large shadow using design system
 */
export const shadowLarge = 'shadow-[var(--shadow-large)]'

/**
 * Glass shadow for premium elements
 */
export const shadowGlass = 'shadow-[var(--glass-shadow)]'

// ============================================================================
// RESPONSIVE UTILITIES
// ============================================================================

/**
 * Mobile-first responsive text sizing
 */
export const responsiveText = {
	sm: 'text-sm sm:text-base',
	base: 'text-base sm:text-lg',
	lg: 'text-lg sm:text-xl',
	xl: 'text-xl sm:text-2xl',
	'2xl': 'text-2xl sm:text-3xl',
	'3xl': 'text-3xl sm:text-4xl'
}

/**
 * Mobile-first responsive spacing
 */
export const responsiveSpacing = {
	sm: 'p-4 sm:p-6',
	base: 'p-6 sm:p-8',
	lg: 'p-8 sm:p-12',
	xl: 'p-12 sm:p-16'
}

/**
 * Mobile-first responsive margins
 */
export const responsiveMargin = {
	sm: 'm-4 sm:m-6',
	base: 'm-6 sm:m-8',
	lg: 'm-8 sm:m-12',
	xl: 'm-12 sm:m-16'
}

// ============================================================================
// UTILITY FUNCTIONS FOR DESIGN SYSTEM INTEGRATION
// ============================================================================

/**
 * Create a CSS custom property reference
 * @param property - CSS custom property name (without --)
 * @returns CSS var() reference string
 */
export function cssVar(property: string): string {
	return `var(--${property})`
}

/**
 * Create OKLCH color string with optional alpha
 * @param property - Color property name
 * @param alpha - Optional alpha value (0-100)
 * @returns OKLCH color string
 */
export function oklchColor(property: string, alpha?: number): string {
	const alphaString = alpha !== undefined ? ` / ${alpha}%` : ''
	return `oklch(var(--${property})${alphaString})`
}

/**
 * Generate responsive breakpoint classes
 * @param base - Base class
 * @param breakpoints - Breakpoint variations
 * @returns Array of responsive classes
 */
export function responsive(
	base: string,
	breakpoints: Partial<Record<string, string>>
): string[] {
	const classes = [base]

	for (const [bp, value] of Object.entries(breakpoints)) {
		if (value) classes.push(`${bp}:${value}`)
	}

	return classes
}

/**
 * Clamp utility for responsive design
 * @param min - Minimum value
 * @param preferred - Preferred value (viewport-based)
 * @param max - Maximum value
 * @returns CSS clamp string
 */
export function clampSize(min: string, preferred: string, max: string): string {
	return `clamp(${min}, ${preferred}, ${max})`
}

/**
 * Create a design system compliant button variant
 * @param variant - Button style variant
 * @param className - Additional classes
 * @returns Complete button class array
 */
export function createButton(
	variant: 'primary' | 'secondary' | 'outline' | 'ghost' = 'primary',
	className?: string
) {
	const baseClasses = [
		...touchTarget,
		...interactiveFocus,
		'inline-flex',
		'items-center',
		'justify-center',
		'whitespace-nowrap',
		'rounded-[var(--radius-medium)]',
		'px-4',
		'py-2',
		'text-sm',
		'font-medium',
		'disabled:opacity-50',
		'disabled:pointer-events-none'
	]

	const variantClasses = {
		primary: [
			'bg-[var(--button-primary-idle)]',
			'text-white',
			'hover:bg-[var(--button-primary-hover)]',
			'shadow-[var(--shadow-small)]'
		],
		secondary: [
			'bg-[var(--button-secondary-idle)]',
			textPrimary,
			'hover:bg-[var(--button-secondary-hover)]',
			'border',
			border
		],
		outline: [
			'border',
			border,
			textPrimary,
			'hover:bg-[oklch(var(--color-fill-primary))]'
		],
		ghost: [
			textSecondary,
			'hover:bg-[oklch(var(--color-fill-primary))]',
			'hover:' + textPrimary
		]
	}

	return cn(...baseClasses, ...variantClasses[variant], className)
}

/**
 * Create a design system compliant card
 * @param variant - Card style variant
 * @param className - Additional classes
 * @returns Complete card class string
 */
export function createCard(
	variant: 'default' | 'glass' | 'elevated' = 'default',
	className?: string
) {
	const baseClasses = [
		'rounded-[var(--radius-large)]',
		...cardPadding,
		...subtleHover
	]

	const variantClasses = {
		default: [bgCard, border, 'border', shadowSmall],
		glass: [...glassCard],
		elevated: [bgPrimary, shadowMedium, 'hover:' + shadowLarge]
	}

	return cn(...baseClasses, ...variantClasses[variant], className)
}
