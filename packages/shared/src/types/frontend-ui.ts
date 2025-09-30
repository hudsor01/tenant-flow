/**
 * Frontend UI component types
 * Shared types for React components and UI interfaces
 */

// Hero Section Types
export interface HeroSectionProps {
	trustBadge?: string
	title: string | React.ReactNode
	titleHighlight?: string
	subtitle: string | React.ReactNode
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

// Metrics Card Types
export interface MetricsCardProps {
	title: string
	value: string | number
	description?: string
	status?: string
	statusIcon?: React.ComponentType<{ className?: string; [key: string]: unknown }>
	icon?: React.ComponentType<{ className?: string; [key: string]: unknown }>
	colorVariant: 'success' | 'primary' | 'revenue' | 'property' | 'warning' | 'info' | 'neutral'
	className?: string
	trend?: string
}

// React Component Types
export type ComponentPropsWithChildren<P = unknown> = P & {
	children?: React.ReactNode
}

// Blur Fade Component Types
export interface BlurFadeVariant {
	y?: number
	x?: number
	scale?: number
	opacity: number
	filter: string
}

export interface BlurFadeProps extends Omit<ComponentPropsWithChildren, 'children'> {
	children: React.ReactNode
	variant?: {
		hidden: BlurFadeVariant
		visible: BlurFadeVariant
	}
	delay?: number
	yOffset?: number
	inView?: boolean
	blur?: string
	preset?: 'default' | 'scale' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right'
	duration?: number
	reducedMotion?: boolean
	onAnimationComplete?: () => void
	className?: string
}

// Add other frontend UI types here as needed
