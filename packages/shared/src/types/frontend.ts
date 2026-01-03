/**
 * Frontend-specific types and interfaces
 *
 * Types used in frontend components and UI logic that need to be shared
 * across different parts of the application.
 */

import type { ComponentProps, ComponentType, ReactNode } from 'react'

// Component prop types
export interface ModernExplodedPieChartProps {
	data: Array<{ name: string; value: number; fill?: string }>
	height?: number
	className?: string
	title?: string
	description?: string
	showFooter?: boolean
}

export interface PaginationLinkProps extends ComponentProps<'a'> {
	page?: number
	currentPage?: number
	onPageChange?: ((page: number) => void) | ((page: number) => Promise<void>)
	isActive?: boolean
	size?: 'icon' | 'default' | 'sm' | 'lg'
}

// Tailwind theme types
export type TailwindColorName =
	| 'slate'
	| 'gray'
	| 'zinc'
	| 'neutral'
	| 'stone'
	| 'red'
	| 'orange'
	| 'amber'
	| 'yellow'
	| 'lime'
	| 'green'
	| 'emerald'
	| 'teal'
	| 'cyan'
	| 'sky'
	| 'blue'
	| 'indigo'
	| 'violet'
	| 'purple'
	| 'fuchsia'
	| 'pink'
	| 'rose'

export type TailwindRadiusValue = 0 | 0.3 | 0.5 | 0.65 | 0.75 | 1.0

// UI Component types (merged from frontend-ui.ts)
export interface HeroSectionProps {
	trustBadge?: string
	title: string | ReactNode
	titleHighlight?: string
	subtitle: string | ReactNode
	primaryCta: {
		label: string
		href: string
	}
	secondaryCta: {
		label: string
		href: string
	}
	trustSignals?: string
	image?: {
		src: string
		alt: string
	}
}

export interface MetricsCardProps {
	title: string
	value: string | number
	description?: string
	status?: string
	statusIcon?: ComponentType<{
		className?: string
		[key: string]: unknown
	}>
	icon?: ComponentType<{ className?: string; [key: string]: unknown }>
	colorVariant:
		| 'success'
		| 'primary'
		| 'revenue'
		| 'properties'
		| 'warning'
		| 'info'
		| 'neutral'
	className?: string
	trend?: string
}

export type ComponentPropsWithChildren<P = unknown> = P & {
	children?: ReactNode
}

export interface BlurFadeVariant {
	y?: number
	x?: number
	scale?: number
	opacity: number
	filter: string
}

export interface BlurFadeProps extends Omit<
	ComponentPropsWithChildren,
	'children'
> {
	children: ReactNode
	variant?: {
		hidden: BlurFadeVariant
		visible: BlurFadeVariant
	}
	delay?: number
	yOffset?: number
	inView?: boolean
	blur?: string
	preset?:
		| 'default'
		| 'scale'
		| 'slide-up'
		| 'slide-down'
		| 'slide-left'
		| 'slide-right'
	duration?: number
	reducedMotion?: boolean
	onAnimationComplete?: () => void
	className?: string
}
