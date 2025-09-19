/**
 * Frontend Design System Utilities
 * Enhanced design system utilities that build on the shared package
 * Provides frontend-specific implementations with tailwind-merge integration
 */

import {
	SEMANTIC_COLORS,
	type ComponentSize,
	type ButtonVariant,
	type BadgeVariant,
	type ContainerSize,
	type AnimationType,
	type StatusType,
	type BadgeSize,
	type GridColumnsConfig,
	type ResponsiveValuesConfig
} from '@repo/shared'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Enhanced className utility with intelligent Tailwind class merging
 * Combines clsx for conditional classes with tailwind-merge for deduplication
 * @param inputs - Class values to combine and deduplicate
 * @returns Optimized class string with no duplicate or conflicting classes
 */
export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs))
}

/**
 * Create a variant-based className function using cva pattern
 * @param base - Base classes always applied
 * @param variants - Conditional variant classes
 * @returns Function that generates classes based on props
 */
export function createVariants<
	T extends Record<string, Record<string, string>>
>(
	base: string,
	variants: T,
	defaultVariants?: {
		[K in keyof T]?: string
	}
) {
	return function (
		props?: {
			[K in keyof T]?: string
		} & {
			className?: string
		}
	) {
		const variantClasses = Object.entries(variants)
			.map(([key, variantMap]) => {
				const selectedVariant =
					props?.[key as keyof T] ?? defaultVariants?.[key as keyof T]
				return selectedVariant && typeof selectedVariant === 'string'
					? variantMap[selectedVariant]
					: null
			})
			.filter(Boolean)

		return cn(base, ...variantClasses, props?.className)
	}
}

/**
 * Generate button classes with consistent styling
 * @param variant - Button style variant
 * @param size - Button size
 * @param className - Additional classes
 * @returns Complete button class string
 */
export function buttonClasses(
	variant: ButtonVariant = 'primary',
	size: ComponentSize = 'default',
	className?: string
): string {
	const baseClasses =
		'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'

	const sizeClasses = {
		xs: 'h-6 px-2 text-xs',
		sm: 'h-8 px-3 text-xs',
		default: 'h-9 px-4 py-2',
		lg: 'h-10 px-8',
		xl: 'h-11 px-8'
	}

	const variantClasses = {
		primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
		secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
		outline:
			'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
		ghost: 'hover:bg-accent hover:text-accent-foreground',
		destructive:
			'bg-destructive text-destructive-foreground hover:bg-destructive/90'
	}

	return cn(baseClasses, sizeClasses[size], variantClasses[variant], className)
}

/**
 * Generate input classes with consistent styling
 * @param variant - Input style variant
 * @param size - Input size
 * @param className - Additional classes
 * @returns Complete input class string
 */
export function inputClasses(
	variant: 'default' | 'invalid' = 'default',
	size: ComponentSize = 'default',
	className?: string
): string {
	const baseClasses =
		'flex w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

	const sizeClasses = {
		xs: 'h-6 px-2 py-1 text-xs',
		sm: 'h-8 px-2 py-1 text-xs',
		default: 'h-9 px-3 py-2 text-sm',
		lg: 'h-10 px-3 py-2',
		xl: 'h-11 px-4 py-2'
	}

	const variantClasses = {
		default: 'border-input',
		invalid: 'border-destructive focus-visible:ring-destructive'
	}

	return cn(baseClasses, sizeClasses[size], variantClasses[variant], className)
}

/**
 * Generate card classes with consistent styling
 * @param variant - Card style variant
 * @param className - Additional classes
 * @returns Complete card class string
 */
export function cardClasses(
	variant: 'default' | 'elevated' | 'interactive' | 'premium' = 'default',
	className?: string
): string {
	const baseClasses = 'rounded-lg border bg-card text-card-foreground'

	const variantClasses = {
		default: 'shadow-sm',
		elevated: 'shadow-md',
		interactive: 'shadow-sm hover:shadow-md transition-shadow cursor-pointer',
		premium:
			'shadow-lg border-primary/20 bg-gradient-to-br from-card to-card/50'
	}

	return cn(baseClasses, variantClasses[variant], className)
}

/**
 * Generate badge classes with consistent styling
 * @param variant - Badge style variant
 * @param size - Badge size
 * @param className - Additional classes
 * @returns Complete badge class string
 */
export function badgeClasses(
	variant: BadgeVariant = 'default',
	size: BadgeSize = 'default',
	className?: string
): string {
	const baseClasses =
		'inline-flex items-center rounded-full border font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'

	const sizeClasses = {
		sm: 'px-2 py-0.5 text-xs',
		default: 'px-2.5 py-0.5 text-xs',
		lg: 'px-3 py-1 text-sm'
	}

	const variantClasses = {
		default:
			'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
		secondary:
			'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
		destructive:
			'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
		success: 'border-transparent bg-accent text-accent-foreground hover:bg-accent/80',
		warning: 'border-transparent bg-muted text-muted-foreground hover:bg-muted/80',
		outline:
			'border-input text-foreground hover:bg-accent hover:text-accent-foreground'
	}

	return cn(baseClasses, sizeClasses[size], variantClasses[variant], className)
}

/**
 * Generate responsive grid classes
 * @param columns - Number of columns for different breakpoints
 * @param className - Additional classes
 * @returns Grid class string
 */
export function gridClasses(
	columns: GridColumnsConfig,
	className?: string
): string {
	const baseClasses = 'grid gap-4'

	const columnClasses = [
		`grid-cols-${columns.default}`,
		columns.sm && `sm:grid-cols-${columns.sm}`,
		columns.md && `md:grid-cols-${columns.md}`,
		columns.lg && `lg:grid-cols-${columns.lg}`,
		columns.xl && `xl:grid-cols-${columns.xl}`,
		columns['2xl'] && `2xl:grid-cols-${columns['2xl']}`
	].filter(Boolean)

	return cn(baseClasses, ...columnClasses, className)
}

/**
 * Generate container classes with consistent max-widths
 * @param size - Container size constraint
 * @param className - Additional classes
 * @returns Container class string
 */
export function containerClasses(
	size: ContainerSize = 'xl',
	className?: string
): string {
	const baseClasses = 'mx-auto px-4 sm:px-6 lg:px-8'

	const sizeClasses = {
		sm: 'max-w-screen-sm',
		md: 'max-w-screen-md',
		lg: 'max-w-screen-lg',
		xl: 'max-w-screen-xl',
		'2xl': 'max-w-screen-2xl',
		full: 'max-w-full'
	}

	return cn(baseClasses, sizeClasses[size], className)
}

/**
 * Generate animation classes for common transitions
 * @param type - Animation type
 * @param className - Additional classes
 * @returns Animation class string
 */
export function animationClasses(
	type: AnimationType,
	className?: string
): string {
	const animationClasses = {
		'fade-in': 'animate-in fade-in-0 duration-300',
		'slide-up': 'animate-in slide-in-from-bottom-2 duration-300',
		'slide-down': 'animate-in slide-in-from-top-2 duration-300',
		scale: 'animate-in zoom-in-95 duration-200',
		bounce: 'animate-bounce',
		pulse: 'animate-pulse'
	}

	return cn(animationClasses[type], className)
}

/**
 * Transition utility classes for consistent animations
 * Replaces repetitive inline transition styles throughout the codebase
 */
export const transitionClasses = {
	fast: 'transition-fast',
	fastTransform: 'transition-fast-transform',
	fastColor: 'transition-fast-color'
} as const

/**
 * Generate CSS custom properties for theme values
 * @param theme - Theme configuration object
 * @returns CSS custom properties object
 */
export function generateThemeCSS(
	theme: Record<string, string>
): Record<string, string> {
	const css: Record<string, string> = {}

	for (const [key, value] of Object.entries(theme)) {
		css[`--${key}`] = value
	}

	return css
}

/**
 * Get semantic color value with CSS variable fallback
 * @param colorKey - Semantic color key
 * @param fallback - Fallback color if CSS variable not available
 * @returns Color value string
 */
export function getSemanticColor(
	colorKey: keyof typeof SEMANTIC_COLORS,
	fallback?: string
): string {
	return SEMANTIC_COLORS[colorKey] || fallback || '#000'
}

/**
 * Generate responsive utility classes
 * @param property - CSS property to make responsive
 * @param values - Values for different breakpoints
 * @returns Responsive class string
 */
export function responsiveClasses(
	property: string,
	values: ResponsiveValuesConfig
): string {
	const classes = [
		`${property}-${values.default}`,
		values.sm && `sm:${property}-${values.sm}`,
		values.md && `md:${property}-${values.md}`,
		values.lg && `lg:${property}-${values.lg}`,
		values.xl && `xl:${property}-${values.xl}`,
		values['2xl'] && `2xl:${property}-${values['2xl']}`
	].filter(Boolean)

	return cn(...classes)
}

/**
 * Generate form field wrapper classes
 * @param hasError - Whether field has validation error
 * @param className - Additional classes
 * @returns Form field class string
 */
export function formFieldClasses(
	hasError?: boolean,
	className?: string
): string {
	const baseClasses = 'space-y-2'
	const errorClasses = hasError ? 'has-error' : ''

	return cn(baseClasses, errorClasses, className)
}

/**
 * Generate form label classes
 * @param required - Whether field is required
 * @param className - Additional classes
 * @returns Form label class string
 */
export function formLabelClasses(
	required?: boolean,
	className?: string
): string {
	const baseClasses =
		'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
	const requiredClasses = required
		? 'after:content-["*"] after:ml-0.5 after:text-destructive'
		: ''

	return cn(baseClasses, requiredClasses, className)
}

/**
 * Generate form error message classes
 * @param className - Additional classes
 * @returns Form error class string
 */
export function formErrorClasses(className?: string): string {
	const baseClasses = 'text-sm font-medium text-destructive'

	return cn(baseClasses, className)
}

/**
 * Generate status indicator classes with consistent styling
 * @param status - Status type
 * @param size - Indicator size
 * @param className - Additional classes
 * @returns Status indicator class string
 */
export function statusClasses(
	status: StatusType = 'info',
	size: BadgeSize = 'default',
	className?: string
): string {
	const baseClasses = 'inline-flex items-center rounded-full'

	const sizeClasses = {
		sm: 'h-2 w-2',
		default: 'h-3 w-3',
		lg: 'h-4 w-4'
	}

	const statusClasses = {
		success: 'bg-accent',
		warning: 'bg-muted',
		error: 'bg-destructive',
		info: 'bg-primary',
		pending: 'bg-muted'
	}

	return cn(baseClasses, sizeClasses[size], statusClasses[status], className)
}


/**
 * Generate table classes with consistent styling
 * @param variant - Table style variant
 * @param className - Additional classes
 * @returns Table class string
 */
export function tableClasses(
	variant: 'default' | 'bordered' | 'striped' = 'default',
	className?: string
): string {
	const baseClasses = 'w-full caption-bottom text-sm'

	const variantClasses = {
		default: '',
		bordered: 'border border-border',
		striped: '[&>tbody>tr:nth-child(odd)]:bg-muted/50'
	}

	return cn(baseClasses, variantClasses[variant], className)
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
 * Generate random ID for component keys
 * @param prefix - Optional prefix for the ID
 * @returns Random ID string
 */
export function generateId(prefix = 'id'): string {
	return `${prefix}-${Math.random().toString(36).substr(2, 9)}`
}


// Export all utilities from shared package
export * from '@repo/shared'
