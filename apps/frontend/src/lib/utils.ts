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
	gridClasses,
	inputClasses,
	responsiveClasses,
	tableClasses,
	transitionClasses
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

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD'
	}).format(amount)
}
