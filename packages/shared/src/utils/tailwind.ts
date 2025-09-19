/**
 * Tailwind CSS utility functions and design system integration
 * Provides type-safe utilities for working with Tailwind classes and design tokens
 */

import {
	type TailwindColorName,
	type TailwindRadiusValue,
	type ThemeCSSVariables
} from '../types/frontend'

// =============================================================================
// TAILWIND CLASS UTILITIES
// =============================================================================

/**
 * Basic className utility for combining classes
 * For advanced Tailwind class merging, use tailwind-merge in frontend components
 * @param inputs - Class values to combine
 * @returns Combined class string
 */
export function cn(
	...inputs: Array<string | undefined | null | boolean>
): string {
	return inputs.filter(Boolean).join(' ')
}

/**
 * Type definition for class values (compatible with clsx/tailwind-merge)
 */
export type ClassValue =
	| string
	| number
	| boolean
	| undefined
	| null
	| ClassValue[]

// =============================================================================
// DESIGN TOKEN UTILITIES
// =============================================================================

/**
 * Tailwind color mapping for theme system
 * Maps internal theme colors to Tailwind color scales
 */
export const TAILWIND_COLOR_MAP: Record<TailwindColorName, string> = {
	blue: 'blue',
	slate: 'slate',
	stone: 'stone',
	red: 'red',
	orange: 'orange',
	amber: 'amber',
	yellow: 'yellow',
	lime: 'lime',
	green: 'green',
	emerald: 'emerald',
	teal: 'teal',
	cyan: 'cyan',
	sky: 'sky',
	indigo: 'indigo',
	violet: 'violet',
	purple: 'purple',
	fuchsia: 'fuchsia',
	pink: 'pink',
	rose: 'rose'
}

/**
 * Tailwind radius mapping for theme system
 * Maps internal radius values to Tailwind border radius classes
 */
export const TAILWIND_RADIUS_MAP: Record<TailwindRadiusValue, string> = {
	0: 'rounded-none',
	0.3: 'rounded-sm',
	0.5: 'rounded',
	0.65: 'rounded-md',
	0.75: 'rounded-lg',
	1.0: 'rounded-xl'
}

/**
 * Generate Tailwind color classes for a given theme color
 * @param color - Theme color from TailwindColorName union
 * @param shade - Tailwind color shade (50-950)
 * @returns Tailwind color class string
 */
export function getTailwindColor(
	color: TailwindColorName,
	shade: number = 500
): string {
	const tailwindColor = TAILWIND_COLOR_MAP[color]
	return `${tailwindColor}-${shade}`
}

/**
 * Generate complete color variant classes for buttons, badges, etc.
 * @param color - Theme color
 * @returns Object with text, background, border, and hover classes
 */
export function getColorVariantClasses(color: TailwindColorName) {
	const baseColor = TAILWIND_COLOR_MAP[color]

	return {
		// Light mode classes
		background: `bg-${baseColor}-500`,
		backgroundHover: `hover:bg-${baseColor}-600`,
		backgroundLight: `bg-${baseColor}-50`,
		backgroundLightHover: `hover:bg-${baseColor}-100`,

		// Text classes
		text: `text-${baseColor}-500`,
		textHover: `hover:text-${baseColor}-600`,
		textLight: `text-${baseColor}-600`,
		textDark: `text-${baseColor}-900`,

		// Border classes
		border: `border-${baseColor}-500`,
		borderLight: `border-${baseColor}-200`,

		// Focus and ring classes
		ring: `ring-${baseColor}-500`,
		focusRing: `focus:ring-${baseColor}-500`,

		// Dark mode variants
		dark: {
			background: `dark:bg-${baseColor}-600`,
			backgroundHover: `dark:hover:bg-${baseColor}-700`,
			text: `dark:text-${baseColor}-400`,
			textHover: `dark:hover:text-${baseColor}-300`,
			border: `dark:border-${baseColor}-600`
		}
	}
}

// =============================================================================
// RESPONSIVE UTILITIES
// =============================================================================

/**
 * Tailwind breakpoint utilities
 * Provides type-safe breakpoint helpers
 */
export const TAILWIND_BREAKPOINTS = {
	sm: '640px',
	md: '768px',
	lg: '1024px',
	xl: '1280px',
	'2xl': '1536px'
} as const

export type TailwindBreakpoint = keyof typeof TAILWIND_BREAKPOINTS

/**
 * Generate responsive Tailwind classes
 * @param baseClass - Base Tailwind class
 * @param responsiveClasses - Breakpoint-specific classes
 * @returns Combined responsive class string
 */
export function responsive(
	baseClass: string,
	responsiveClasses: Partial<Record<TailwindBreakpoint, string>>
): string {
	const classes = [baseClass]

	for (const [breakpoint, className] of Object.entries(responsiveClasses)) {
		if (className) {
			classes.push(`${breakpoint}:${className}`)
		}
	}

	return cn(...classes)
}

// =============================================================================
// COMPONENT VARIANT UTILITIES
// =============================================================================

/**
 * Common button size variants using Tailwind classes
 */
export const BUTTON_SIZE_VARIANTS = {
	xs: 'px-2 py-1 text-xs rounded',
	sm: 'px-3 py-1.5 text-sm rounded-md',
	default: 'px-4 py-2 text-sm rounded-md',
	lg: 'px-6 py-2.5 text-base rounded-lg',
	xl: 'px-8 py-3 text-lg rounded-lg'
} as const

/**
 * Common spacing variants using Tailwind classes
 */
export const SPACING_VARIANTS = {
	none: 'p-0',
	xs: 'p-1',
	sm: 'p-2',
	default: 'p-4',
	lg: 'p-6',
	xl: 'p-8',
	'2xl': 'p-12'
} as const

/**
 * Common shadow variants using Tailwind classes
 */
export const SHADOW_VARIANTS = {
	none: 'shadow-none',
	sm: 'shadow-sm',
	default: 'shadow',
	md: 'shadow-md',
	lg: 'shadow-lg',
	xl: 'shadow-xl',
	'2xl': 'shadow-2xl'
} as const

// =============================================================================
// CSS VARIABLE UTILITIES
// =============================================================================

/**
 * Convert ThemeCSSVariables to Tailwind-compatible CSS custom properties
 * @param variables - Theme CSS variables object
 * @returns CSS custom properties object
 */
export function cssVariablesToTailwind(
	variables: ThemeCSSVariables
): Record<string, string> {
	const result: Record<string, string> = {}

	for (const [key, value] of Object.entries(variables)) {
		// Convert CSS variable format to camelCase for easier use
		const tailwindKey = key
			.replace('--', '')
			.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
		result[tailwindKey] = value
	}

	return result
}

/**
 * Generate CSS custom property string for use in Tailwind arbitrary values
 * @param variableName - CSS variable name (with or without --)
 * @returns CSS custom property reference
 */
export function cssVar(variableName: string): string {
	const cleanName = variableName.startsWith('--')
		? variableName
		: `--${variableName}`
	return `var(${cleanName})`
}

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

/**
 * Validate if a string contains valid Tailwind CSS classes
 * Basic validation - checks for common Tailwind patterns
 * @param className - Class string to validate
 * @returns Boolean indicating if classes appear to be valid Tailwind
 */
export function isValidTailwindClass(className: string): boolean {
	if (!className || typeof className !== 'string') return false

	// Common Tailwind prefixes and patterns
	const tailwindPatterns = [
		/^(p|m|pt|pr|pb|pl|px|py|mt|mr|mb|ml|mx|my)-/, // spacing
		/^(w|h|min-w|min-h|max-w|max-h)-/, // sizing
		/^(text|bg|border|ring)-/, // colors
		/^(flex|grid|block|inline|hidden)$/, // display
		/^(rounded|opacity|shadow)-/, // effects
		/^(sm|md|lg|xl|2xl):/, // responsive prefixes
		/^(hover|focus|active|disabled):/, // state prefixes
		/^(dark|light):/ // theme prefixes
	]

	const classes = className.split(/\s+/).filter(Boolean)

	return classes.every(
		cls =>
			tailwindPatterns.some(pattern => pattern.test(cls)) ||
			// Allow arbitrary values like [#123456] or [10px]
			/^\[.+\]$/.test(cls) ||
			// Allow common utility classes
			['block', 'inline', 'hidden', 'flex', 'grid'].includes(cls)
	)
}

/**
 * Extract unique Tailwind classes from a className string
 * Removes duplicates and filters empty classes
 * @param className - Input class string
 * @returns Array of unique, valid classes
 */
export function extractTailwindClasses(className?: string): string[] {
	if (!className) return []

	const classes = className.split(/\s+/).filter(Boolean)
	return [...new Set(classes)]
}

// =============================================================================
// THEME INTEGRATION
// =============================================================================

/**
 * Generate Tailwind theme configuration from ThemeCSSVariables
 * @param lightVariables - Light theme CSS variables
 * @param darkVariables - Dark theme CSS variables
 * @returns Tailwind theme configuration object
 */
export function generateTailwindTheme(
	_lightVariables: ThemeCSSVariables,
	_darkVariables: ThemeCSSVariables
) {
	return {
		extend: {
			colors: {
				border: cssVar('--border'),
				input: cssVar('--input'),
				ring: cssVar('--ring'),
				background: cssVar('--background'),
				foreground: cssVar('--foreground'),
				primary: {
					DEFAULT: cssVar('--primary'),
					foreground: cssVar('--primary-foreground')
				},
				secondary: {
					DEFAULT: cssVar('--secondary'),
					foreground: cssVar('--secondary-foreground')
				},
				destructive: {
					DEFAULT: cssVar('--destructive'),
					foreground: cssVar('--destructive-foreground')
				},
				muted: {
					DEFAULT: cssVar('--muted'),
					foreground: cssVar('--muted-foreground')
				},
				accent: {
					DEFAULT: cssVar('--accent'),
					foreground: cssVar('--accent-foreground')
				},
				popover: {
					DEFAULT: cssVar('--popover'),
					foreground: cssVar('--popover-foreground')
				},
				card: {
					DEFAULT: cssVar('--card'),
					foreground: cssVar('--card-foreground')
				},
				chart: {
					1: cssVar('--chart-1'),
					2: cssVar('--chart-2'),
					3: cssVar('--chart-3'),
					4: cssVar('--chart-4'),
					5: cssVar('--chart-5')
				},
				sidebar: {
					DEFAULT: cssVar('--sidebar'),
					foreground: cssVar('--sidebar-foreground'),
					primary: cssVar('--sidebar-primary'),
					'primary-foreground': cssVar('--sidebar-primary-foreground'),
					accent: cssVar('--sidebar-accent'),
					'accent-foreground': cssVar('--sidebar-accent-foreground'),
					border: cssVar('--sidebar-border'),
					ring: cssVar('--sidebar-ring')
				}
			},
			borderRadius: {
				lg: cssVar('--radius'),
				md: `calc(${cssVar('--radius')} - 2px)`,
				sm: `calc(${cssVar('--radius')} - 4px)`
			}
		}
	}
}
