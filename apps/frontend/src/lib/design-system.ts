/**
 * Frontend Design System Utilities
 * Enhanced design system utilities that build on the shared package
 * Provides frontend-specific implementations with tailwind-merge integration
 */

import { type ComponentSize } from '@repo/shared/constants/design-system'
import type {
	AnimationType,
	BadgeSize,
	BadgeVariant,
	ButtonVariant,
	ContainerSize,
	GridColumnsConfig,
	ResponsiveValuesConfig
} from '@repo/shared/types/frontend'
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
		'inline-flex items-center justify-center whitespace-nowrap rounded-[var(--radius-md)] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'

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
		'flex w-full rounded-[var(--radius-md)] border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

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
	const baseClasses =
		'rounded-[var(--radius-lg)] border bg-card text-card-foreground'

	const variantClasses = {
		default: 'shadow-sm',
		elevated: 'shadow-md',
		interactive: 'shadow-sm hover:shadow-md transition-shadow cursor-pointer',
		premium:
			'shadow-lg border-primary/20 bg-card/80'
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
		success:
			'border-transparent bg-accent text-accent-foreground hover:bg-accent/80',
		warning:
			'border-transparent bg-muted text-muted-foreground hover:bg-muted/80',
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
 * Generate random ID for component keys
 * @param prefix - Optional prefix for the ID
 * @returns Random ID string
 */
export function generateId(prefix = 'id'): string {
	return `${prefix}-${Math.random().toString(36).substring(2, 9)}`
}

// ============================================================================
// THEME UTILITIES
// ============================================================================

/**
 * Generate CSS custom properties for theme values
 * @param theme - Theme configuration object
 * @returns CSS custom properties object
 */
export function getThemeCSS(
	theme?: Record<string, string>
): Record<string, string> {
	if (!theme) return {}
	const css: Record<string, string> = {}

	for (const [key, value] of Object.entries(theme)) {
		css[`--${key}`] = value
	}

	return css
}

/**
 * Generate premium glass morphism classes
 * @param variant - Glass variant type
 * @param className - Additional classes
 * @returns Glass effect class string
 */
export function glassClasses(
	variant: 'default' | 'strong' | 'premium' = 'default',
	className?: string
): string {
	const baseClasses = 'backdrop-blur-md border'

	const variantClasses = {
		default: 'glass',
		strong: 'glass-strong',
		premium: 'card-glass-premium' // Uses the sophisticated CSS class
	}

	return cn(baseClasses, variantClasses[variant], className)
}

/**
 * Generate premium button classes with enhanced animations
 * @param variant - Button style variant
 * @param size - Button size
 * @param premium - Enable premium animations
 * @param className - Additional classes
 * @returns Premium button class string
 */
export function premiumButtonClasses(
	variant: ButtonVariant = 'primary',
	size: ComponentSize = 'default',
	premium = false,
	className?: string
): string {
	const baseClasses = buttonClasses(variant, size)
	const premiumClasses = premium ? 'btn-premium-hover' : ''

	return cn(baseClasses, premiumClasses, className)
}

/**
 * Generate shadow classes using design tokens
 * @param level - Shadow intensity level
 * @param premium - Use premium shadow variants
 * @param className - Additional classes
 * @returns Shadow class string
 */
export function shadowClasses(
	level: 'small' | 'medium' | 'large' = 'medium',
	premium = false,
	className?: string
): string {
	const shadowClass = premium
		? `shadow-premium-${level === 'small' ? 'sm' : level === 'medium' ? 'md' : 'lg'}`
		: `shadow-${level}`

	return cn(shadowClass, className)
}

/**
 * Generate typography classes using unified tokens
 * @param scale - Typography scale from design tokens
 * @param weight - Font weight
 * @param className - Additional classes
 * @returns Typography class string
 */
export function typographyClasses(
	scale:
		| 'large-title'
		| 'title-1'
		| 'title-2'
		| 'headline'
		| 'body'
		| 'caption' = 'body',
	weight: 'normal' | 'medium' | 'semibold' | 'bold' = 'normal',
	className?: string
): string {
	const scaleClasses = {
		'large-title': 'font-large-title',
		'title-1': 'font-title-1',
		'title-2': 'font-title-2',
		headline: 'font-headline',
		body: 'font-body',
		caption: 'font-caption'
	}

	const weightClasses = {
		normal: 'font-normal',
		medium: 'font-medium',
		semibold: 'font-semibold',
		bold: 'font-bold'
	}

	return cn(scaleClasses[scale], weightClasses[weight], className)
}

/**
 * Apply design token values to inline styles
 * @param tokenValue - Design token value
 * @param property - CSS property name
 * @returns CSS style object
 */
export function applyToken(
	tokenValue: string,
	property: string
): React.CSSProperties {
	return { [property]: tokenValue }
}

// Re-export design system constants for Magic UI components
export {
	ANIMATION_DURATIONS,
	TYPOGRAPHY_SCALE
} from '@repo/shared/constants/design-system'

/**
 * Generate sidebar container classes with responsive and conditional variants
 * @param variant - Sidebar style variant (sidebar, floating, inset)
 * @param collapsible - Whether sidebar is collapsible
 * @param side - Sidebar side (left, right)
 * @param className - Additional classes
 * @returns Complete sidebar container class string
 */
export function sidebarContainerClasses(
	variant?: 'sidebar' | 'floating' | 'inset',
	collapsible?: boolean,
	side?: 'left' | 'right',
	className?: string
): string {
	const baseClasses = 'relative bg-transparent transition-[width] duration-200 ease-linear'

	const variantClasses = {
		sidebar: '',
		floating: 'group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+var(--spacing-4))]',
		inset: 'group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+var(--spacing-4))]'
	}

	const collapsibleClasses = collapsible ? 'group-data-[collapsible=icon]:w-(--sidebar-width-icon)' : ''
	const sideClasses = side === 'right' ? 'rotate-180' : ''

	return cn(baseClasses, variantClasses[variant || 'sidebar'], collapsibleClasses, sideClasses, className)
}

/**
 * Generate sidebar rail classes
 * @param className - Additional classes
 * @returns Complete sidebar rail class string
 */
export function sidebarRailClasses(className?: string): string {
	const baseClasses = 'hover:after:bg-sidebar-border absolute inset-y-0 z-20 hidden w-4 translate-x-[-50%] transition-all ease-linear group-data-[side=left]:-right-4 group-data-[side=right]:left-0 after:absolute after:inset-y-0 after:left-1/2 after:w-0.5 sm:flex in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize [[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize hover:group-data-[collapsible=offcanvas]:bg-sidebar group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full [[data-side=left][data-collapsible=offcanvas]_&]:-right-2 [[data-side=right][data-collapsible=offcanvas]_&]:-left-2'

	return cn(baseClasses, className)
}

/**
 * Generate feature card classes with hover effects
 * @param className - Additional classes
 * @returns Complete feature card class string
 */
export function sectionFeatureCardClasses(className?: string): string {
	const baseClasses = 'group/feature relative p-[var(--spacing-6)] rounded bg-card/50 border border-border/40 hover:border-(--hover-border-color) hover:bg-(--feature-card-hover-bg) transition-(--feature-card-transition) hover:shadow-(--feature-card-hover-shadow) hover:shadow-primary/10 backdrop-blur-sm hover:transform-(--hover-lift)'

	return cn(baseClasses, className)
}

/**
 * Generate feature card icon classes with hover animations
 * @param className - Additional classes
 * @returns Complete feature card icon class string
 */
export function featureCardIconClasses(className?: string): string {
	const baseClasses = 'size-[var(--spacing-12)] rounded bg-primary/10 text-primary flex items-center justify-center group-hover/feature:bg-primary/20 group-hover/feature:transform-(--feature-card-icon-hover) transition-(--feature-card-transition) group-hover/feature:shadow-lg group-hover/feature:shadow-primary/25'

	return cn(baseClasses, className)
}

/**
 * Generate navbar button classes with hover effects
 * @param variant - Button variant (cta, link)
 * @param className - Additional classes
 * @returns Complete navbar button class string
 */
export function navbarButtonClasses(
	variant: 'cta' | 'link' = 'link',
	className?: string
): string {
	const baseClasses = 'hidden sm:flex items-center px-6 py-2.5 font-medium text-sm rounded-(--radius-medium) transition-(--navbar-btn-transition)'

	const variantClasses = {
		cta: 'bg-linear-to-r from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl',
		link: 'text-foreground hover:bg-(--navbar-btn-hover-bg) hover:text-(--navbar-btn-hover-text)'
	}

	return cn(baseClasses, variantClasses[variant], className)
}

/**
 * Generate lightbox navigation button classes
 * @param position - Button position (left or right)
 * @param className - Additional classes
 * @returns Complete lightbox navigation button class string
 */
export function lightboxNavButtonClasses(
	position: 'left' | 'right',
	className?: string
): string {
	const baseClasses = 'absolute top-1/2 -translate-y-1/2 bg-(--lightbox-nav-bg) hover:bg-(--lightbox-nav-hover-bg) text-white rounded-full transition-(--lightbox-nav-transition)'
	const positionClasses = position === 'left' ? 'left-4' : 'right-4'

	return cn(baseClasses, positionClasses, className)
}

/**
 * Generate pricing card classes with hover effects
 * @param popular - Whether card is popular variant
 * @param className - Additional classes
 * @returns Complete pricing card class string
 */
export function pricingCardClasses(
	popular?: boolean,
	className?: string
): string {
	const baseClasses = 'relative flex h-full flex-col overflow-hidden border border-border/60 bg-card/80 text-left shadow-sm backdrop-blur transition-(--hover-transition) ease-out hover:transform-(--pricing-card-hover) hover:shadow-(--pricing-card-hover-shadow)'

	const popularClasses = popular ? 'ring-2 ring-primary/70' : ''

	return cn(baseClasses, popularClasses, className)
}

/**
 * Generate portal feature grid classes
 * @param className - Additional classes
 * @returns Complete portal feature grid class string
 */
export function portalFeatureGridClasses(className?: string): string {
	const baseClasses = 'grid gap-[var(--spacing-6)] [grid-template-columns:var(--layout-grid-cols-2)] lg:[grid-template-columns:var(--layout-grid-cols-5)]'

	return cn(baseClasses, className)
}

/**
 * Generate portal feature card classes with hover effects
 * @param colorVariant - Color variant for the card
 * @param className - Additional classes
 * @returns Complete portal feature card class string
 */
export function portalFeatureCardClasses(
	colorVariant?: 'primary' | 'secondary' | 'accent',
	className?: string
): string {
	const baseClasses = 'text-center p-[var(--spacing-4)] bg-background/50 rounded-xl border border-muted/30 group-hover:transform-(--portal-feature-hover) transition-(--portal-feature-transition)'

	const colorClasses = {
		primary: 'hover:bg-primary/5',
		secondary: 'hover:bg-secondary/5',
		accent: 'hover:bg-accent/5'
	}

	return cn(baseClasses, colorClasses[colorVariant || 'primary'], className)
}

/**
 * Generate mobile dropdown link classes
 * @param className - Additional classes
 * @returns Complete mobile dropdown link class string
 */
export const mobileDropdownLinkClasses = cn(
	'block px-4 py-2 text-sm text-foreground/70 hover:text-foreground hover:bg-muted/50 rounded-lg transition-all duration-200'
)

/**
 * Generate bento card classes with hover effects and animations
 * @param className - Additional classes
 * @returns Complete bento card class string
 */
export function bentoCardClasses(className?: string): string {
	const baseClasses = 'group relative flex flex-col justify-between overflow-hidden rounded-xl bg-card shadow-sm border hover:shadow-lg transition-all duration-300'

	return cn(baseClasses, className)
}

/**
 * Generate bento card content classes with hover animations
 * @param className - Additional classes
 * @returns Complete bento card content class string
 */
export function bentoCardContentClasses(className?: string): string {
	const baseClasses = 'flex transform-gpu flex-col gap-2 transition-all duration-300 lg:group-hover:-translate-y-2'

	return cn(baseClasses, className)
}

/**
 * Generate bento card icon classes with hover scaling
 * @param className - Additional classes
 * @returns Complete bento card icon class string
 */
export function bentoCardIconClasses(className?: string): string {
	const baseClasses = 'size-12 origin-left transform-gpu text-foreground transition-all duration-300 group-hover:scale-90'

	return cn(baseClasses, className)
}

/**
 * Generate bento card overlay classes for hover effects
 * @param className - Additional classes
 * @returns Complete bento card overlay class string
 */
export function bentoCardOverlayClasses(className?: string): string {
	const baseClasses = 'pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 group-hover:bg-accent/5'

	return cn(baseClasses, className)
}

/**
 * Generate border beam classes with complex animations and masks
 * @param variant - Color variant for the beam
 * @param className - Additional classes
 * @returns Complete border beam class string
 */
export function borderBeamClasses(
	variant: 'primary' | 'accent' | 'rainbow' | 'success' | 'warning' | 'danger' = 'primary',
	className?: string
): string {
	const baseClasses = 'pointer-events-none absolute inset-0 rounded-[inherit] [border:calc(var(--color-border-width)*1px)_solid_transparent] ![mask-clip:padding-box,border-box] ![mask-composite:intersect] [mask:linear-gradient(transparent,transparent),linear-gradient(white,white)] after:absolute after:aspect-square after:w-[calc(var(--size)*1px)] after:animate-border-beam after:[animation-delay:var(--delay)] after:[offset-anchor:calc(var(--anchor)*1%)_50%] after:[offset-path:rect(0_auto_auto_0_round_calc(var(--size)*1px))] after:will-change-transform after:backface-visibility-hidden'

	const variantClasses = {
		primary: 'after:[background:linear-gradient(to_left,var(--color-primary),var(--color-primary-foreground),transparent)]',
		accent: 'after:[background:linear-gradient(to_left,var(--color-accent),var(--color-accent-foreground),transparent)]',
		rainbow: 'after:[background:linear-gradient(to_left,var(--color-primary),var(--color-accent),transparent)]',
		success: 'after:[background:linear-gradient(to_left,var(--color-primary),var(--color-primary-foreground),transparent)]',
		warning: 'after:[background:linear-gradient(to_left,var(--color-accent),var(--color-accent-foreground),transparent)]',
		danger: 'after:[background:linear-gradient(to_left,var(--color-destructive),var(--color-destructive-foreground),transparent)]'
	}

	return cn(baseClasses, variantClasses[variant], className)
}

/**
 * Generate glowing effect classes with blur and scaling
 * @param glowOpacity - Opacity of the glow effect
 * @param className - Additional classes
 * @returns Complete glowing effect class string
 */
export function glowingEffectClasses(
	glowOpacity: number = 0.4,
	className?: string
): string {
	const baseClasses = 'relative'
	const glowClasses = `absolute inset-0 rounded-[inherit] blur-xl opacity-${Math.round(glowOpacity * 100)}`

	return cn(baseClasses, glowClasses, className)
}

/**
 * Generate glowing effect blur classes
 * @param className - Additional classes
 * @returns Complete glowing effect blur class string
 */
export function glowingEffectBlurClasses(className?: string): string {
	const baseClasses = 'absolute inset-0 rounded-[inherit] blur-xl'

	return cn(baseClasses, className)
}

/**
 * Generate timeline content classes with blur and transform effects
 * @param isInView - Whether the element is in view
 * @param className - Additional classes
 * @returns Complete timeline content class string
 */
export function timelineContentClasses(
	isInView: boolean,
	className?: string
): string {
	const baseClasses = 'transition-all duration-500 ease-out'
	const inViewClasses = isInView
		? 'opacity-100 blur-none translate-y-0'
		: 'opacity-0 blur-sm translate-y-5'

	return cn(baseClasses, inViewClasses, className)
}

/**
 * Generate mobile navigation item classes
 * @param isActive - Whether the navigation item is active
 * @param className - Additional classes
 * @returns Complete mobile navigation item class string
 */
export function mobileNavItemClasses(
	isActive: boolean,
	className?: string
): string {
	const baseClasses = 'flex h-14 w-16 flex-col items-center justify-center rounded-lg text-xs font-medium transition-colors'
	const activeClasses = isActive
		? 'text-primary bg-primary/10'
		: 'text-muted-foreground hover:text-foreground'

	return cn(baseClasses, activeClasses, className)
}

/**
 * Generate mobile navigation link classes
 * @param isActive - Whether the navigation link is active
 * @param className - Additional classes
 * @returns Complete mobile navigation link class string
 */
export function mobileNavLinkClasses(
	isActive: boolean,
	className?: string
): string {
	const baseClasses = 'flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors'
	const activeClasses = isActive
		? 'text-primary bg-primary/10'
		: 'text-muted-foreground hover:text-foreground hover:bg-muted/50'

	return cn(baseClasses, activeClasses, className)
}

/**
 * Generate feature icon container classes with consistent styling
 * @param variant - Color variant for the icon background
 * @param className - Additional classes
 * @returns Complete feature icon container class string
 */
export function featureIconContainerClasses(
	variant: 'primary' | 'accent' | 'success' | 'warning' = 'primary',
	className?: string
): string {
	const variantClasses = {
		primary: 'bg-primary/10',
		accent: 'bg-accent/10',
		success: 'bg-success/10',
		warning: 'bg-warning/10'
	}

	return cn(
		'size-[var(--spacing-10)] rounded-lg flex items-center justify-center mx-auto mb-[var(--spacing-2)]',
		variantClasses[variant],
		className
	)
}

/**
 * Generate pricing feature card classes with hover effects
 * @param variant - Color variant for the card
 * @param className - Additional classes
 * @returns Complete pricing feature card class string
 */
export function pricingFeatureCardClasses(
	variant: 'primary' | 'accent' = 'primary',
	className?: string
): string {
	const variantClasses = {
		primary: 'bg-primary/8 border-primary/20 hover:border-primary/30',
		accent: 'bg-accent/8 border-accent/20 hover:border-accent/30'
	}

	return cn(
		'group p-[var(--spacing-5)] rounded-2xl border-2 hover:shadow-lg cursor-pointer transition-all duration-200',
		variantClasses[variant],
		className
	)
}

/**
 * Generate billing info card classes
 * @param className - Additional classes
 * @returns Complete billing info card class string
 */
export function billingInfoCardClasses(className?: string): string {
	return cn(
		'bg-background/70 rounded-lg p-(--spacing-4) border border-primary/20',
		className
	)
}

/**
 * Generate trust signal item classes
 * @param className - Additional classes
 * @returns Complete trust signal item class string
 */
export function trustSignalItemClasses(className?: string): string {
	return cn(
		'flex items-center gap-[var(--spacing-3)]',
		className
	)
}

/**
 * Generate trust signal icon classes
 * @param variant - Color variant for the icon background
 * @param className - Additional classes
 * @returns Complete trust signal icon class string
 */
export function trustSignalIconClasses(
	variant: 'primary' | 'accent' | 'success' = 'primary',
	className?: string
): string {
	const variantClasses = {
		primary: 'bg-primary/10',
		accent: 'bg-accent/10',
		success: 'bg-success/10'
	}

	return cn(
		'size-[var(--spacing-8)] rounded-lg flex items-center justify-center',
		variantClasses[variant],
		className
	)
}

/**
 * Generate trust indicator badge classes
 * @param className - Additional classes
 * @returns Complete trust indicator badge class string
 */
export function trustIndicatorBadgeClasses(className?: string): string {
	return cn(
		'inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary backdrop-blur-sm',
		className
	)
}

/**
 * Generate stat card classes
 * @param className - Additional classes
 * @returns Complete stat card class string
 */
export function statCardClasses(className?: string): string {
	return cn(
		'group relative p-[var(--spacing-6)] rounded-lg bg-card border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5',
		className
	)
}

/**
 * Generate enhanced showcase card classes with complex hover effects
 * @param className - Additional classes
 * @returns Complete showcase card class string
 */
export function showcaseCardClasses(className?: string): string {
	return cn(
		'relative bg-card/50 border border-border/40 rounded p-6 text-center backdrop-blur-sm hover:bg-card/90 hover:border-primary/40 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10 overflow-hidden hover:-translate-y-1 hover:scale-[1.02]',
		className
	)
}

/**
 * Generate testimonial card classes
 * @param className - Additional classes
 * @returns Complete testimonial card class string
 */
export function testimonialCardClasses(className?: string): string {
	return cn(
		'relative bg-card border border-border rounded-2xl p-8 h-full hover:border-primary/40 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5',
		className
	)
}

/**
 * Generate accordion item classes
 * @param className - Additional classes
 * @returns Complete accordion item class string
 */
export function accordionItemClasses(className?: string): string {
	return cn(
		'rounded-2xl border border-border/50 bg-background/60 px-5 transition-colors hover:border-primary/30',
		className
	)
}
