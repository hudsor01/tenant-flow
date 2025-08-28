/**
 * Base Stats Components - Pure React Components
 * Extensible base following shadcn/ui patterns with strict purity
 * NO business logic, NO side effects, NO hardcoded variants
 */

import React from 'react'
import { cn } from '@/lib/utils'

// ============================================================================
// NATIVE STYLING CLASSES - Using UnoCSS shortcuts
// ============================================================================

const statsClasses = {
	container: {
		base: 'relative overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-all',
		size: {
			default: 'pad-md',
			compact: 'pad-sm',
			large: 'pad-lg'
		},
		emphasis: {
			subtle: 'border-border hover:border-border/60',
			bold: 'border-2 border-border hover:border-primary/20',
			elevated: 'border-border shadow-md hover:shadow-lg'
		},
		interactive: 'hover:-translate-y-0.5 hover:scale-[1.02] cursor-pointer'
	},
	icon: {
		base: 'center rounded-lg transition-colors',
		size: {
			sm: 'h-8 w-8 p-1.5',
			default: 'h-10 w-10 p-2',
			lg: 'h-12 w-12 p-2.5'
		}
	},
	value: {
		base: 'font-bold tracking-tight transition-colors',
		size: {
			sm: 'text-lg',
			default: 'text-2xl',
			lg: 'text-3xl',
			xl: 'text-4xl'
		}
	},
	trend: {
		base: 'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-colors',
		direction: {
			up: 'status-success dark:bg-green-900/20 dark:text-green-300',
			down: 'status-error dark:bg-red-900/20 dark:text-red-300',
			neutral: 'status-neutral dark:bg-gray-900/20 dark:text-gray-300'
		}
	}
}

// ============================================================================
// PURE COMPONENT INTERFACES - No business logic
// ============================================================================

export interface StatsContainerProps extends React.HTMLAttributes<HTMLDivElement> {
	size?: keyof typeof statsClasses.container.size
	emphasis?: keyof typeof statsClasses.container.emphasis
	interactive?: boolean
	children: React.ReactNode
}

export interface StatsHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
	title: string
	subtitle?: string
	icon?: React.ReactNode
	action?: React.ReactNode
}

export interface StatsIconProps extends React.HTMLAttributes<HTMLDivElement> {
	size?: keyof typeof statsClasses.icon.size
	children: React.ReactNode
}

export interface StatsValueProps extends React.HTMLAttributes<HTMLDivElement> {
	size?: keyof typeof statsClasses.value.size
	value: string | number
	label?: string
}

export interface StatsTrendProps extends React.HTMLAttributes<HTMLDivElement> {
	direction?: keyof typeof statsClasses.trend.direction
	value: number
	label?: string
	showIcon?: boolean
}

export interface StatsDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
	children: React.ReactNode
}

// ============================================================================
// PURE BASE COMPONENTS - Zero side effects, pure functions
// ============================================================================

/**
 * Pure Stats Container - Base wrapper with styling variants only
 */
const StatsContainer = React.forwardRef<HTMLDivElement, StatsContainerProps>(
	({ className, size = 'default', emphasis = 'subtle', interactive = false, children, ...props }, ref) => {
		const sizeClasses = statsClasses.container.size[size]
		const emphasisClasses = statsClasses.container.emphasis[emphasis]
		const interactiveClasses = interactive ? statsClasses.container.interactive : ''
		
		return (
			<div
				ref={ref}
				className={cn(
					statsClasses.container.base,
					sizeClasses,
					emphasisClasses,
					interactiveClasses,
					className
				)}
				{...props}
			>
				{children}
			</div>
		)
	}
)
StatsContainer.displayName = 'StatsContainer'

/**
 * Pure Stats Header - Layout component for title/actions
 */
const StatsHeader = React.forwardRef<HTMLDivElement, StatsHeaderProps>(
	({ className, title, subtitle, icon, action, ...props }, ref) => (
		<div
			ref={ref}
			className={cn('flex items-start justify-between space-y-0', className)}
			{...props}
		>
			<div className="space-y-1">
				<div className="flex items-center gap-2">
					{icon && <div className="text-muted-foreground">{icon}</div>}
					<h3 className="text-sm font-medium tracking-tight text-muted-foreground">
						{title}
					</h3>
				</div>
				{subtitle && (
					<p className="text-xs text-muted-foreground">{subtitle}</p>
				)}
			</div>
			{action && <div className="ml-auto">{action}</div>}
		</div>
	)
)
StatsHeader.displayName = 'StatsHeader'

/**
 * Pure Stats Icon - Styled icon container with size variants
 */
const StatsIcon = React.forwardRef<HTMLDivElement, StatsIconProps>(
	({ className, size = 'default', children, ...props }, ref) => {
		const sizeClasses = statsClasses.icon.size[size]
		
		return (
			<div
				ref={ref}
				className={cn(statsClasses.icon.base, sizeClasses, className)}
				{...props}
			>
				{children}
			</div>
		)
	}
)
StatsIcon.displayName = 'StatsIcon'

/**
 * Pure Stats Value - Display numeric values with formatting
 */
const StatsValue = React.forwardRef<HTMLDivElement, StatsValueProps>(
	({ className, size = 'default', value, label, ...props }, ref) => {
		const sizeClasses = statsClasses.value.size[size]
		
		return (
			<div ref={ref} className={cn('space-y-1', className)} {...props}>
				<div className={cn(statsClasses.value.base, sizeClasses, 'text-foreground')}>
					{typeof value === 'number' ? value.toLocaleString() : value}
				</div>
				{label && (
					<p className="text-xs text-muted-foreground font-medium">{label}</p>
				)}
			</div>
		)
	}
)
StatsValue.displayName = 'StatsValue'

/**
 * Pure Stats Trend - Trend indicator with direction variants
 */
const StatsTrend = React.forwardRef<HTMLDivElement, StatsTrendProps>(
	({ className, direction, value, label, showIcon = true, ...props }, ref) => {
		// Pure function - determine direction from value if not provided
		const trendDirection = direction ?? (
			value > 0 ? 'up' : value < 0 ? 'down' : 'neutral'
		)
		
		const directionClasses = statsClasses.trend.direction[trendDirection]

		// Pure function - get appropriate icon
		const getTrendIcon = () => {
			if (!showIcon) return null
			switch (trendDirection) {
				case 'up':
					return <i className="icon-sm i-lucide-trending-up"  />
				case 'down':
					return <i className="icon-sm i-lucide-trending-down"  />
				case 'neutral':
					return <i className="icon-sm i-lucide-minus"  />
				default:
					return null
			}
		}

		return (
			<div
				ref={ref}
				className={cn(statsClasses.trend.base, directionClasses, className)}
				{...props}
			>
				{getTrendIcon()}
				<span>
					{value > 0 ? '+' : ''}{Math.abs(value)}%
				</span>
				{label && <span className="ml-1">{label}</span>}
			</div>
		)
	}
)
StatsTrend.displayName = 'StatsTrend'

/**
 * Pure Stats Description - Text description component
 */
const StatsDescription = React.forwardRef<HTMLParagraphElement, StatsDescriptionProps>(
	({ className, children, ...props }, ref) => (
		<p
			ref={ref}
			className={cn('text-sm text-muted-foreground', className)}
			{...props}
		>
			{children}
		</p>
	)
)
StatsDescription.displayName = 'StatsDescription'

// ============================================================================
// COMPOSITION HELPERS - Pure layout components
// ============================================================================

export interface StatsGridProps extends React.HTMLAttributes<HTMLDivElement> {
	columns?: 2 | 3 | 4
	children: React.ReactNode
}

/**
 * Pure Stats Grid - Responsive grid layout for stats
 */
const StatsGrid = React.forwardRef<HTMLDivElement, StatsGridProps>(
	({ className, columns = 4, children, ...props }, ref) => {
		const gridCols = {
			2: 'grid-cols-1 md:grid-cols-2',
			3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
			4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
		}

		return (
			<div
				ref={ref}
				className={cn('grid gap-4', gridCols[columns], className)}
				{...props}
			>
				{children}
			</div>
		)
	}
)
StatsGrid.displayName = 'StatsGrid'

// ============================================================================
// LOADING STATES - Pure skeleton components
// ============================================================================

export interface StatsSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
	showTrend?: boolean
}

/**
 * Pure Stats Skeleton - Loading state component
 */
const StatsSkeleton = React.forwardRef<HTMLDivElement, StatsSkeletonProps>(
	({ className, showTrend = false, ...props }, ref) => (
		<StatsContainer ref={ref} className={className} {...props}>
			<StatsHeader
				title=""
				icon={<div className="h-4 w-4 animate-pulse rounded bg-muted" />}
				action={<div className="h-4 w-16 animate-pulse rounded bg-muted" />}
			/>
			<div className="mt-4 space-y-2">
				<div className="h-8 w-20 animate-pulse rounded bg-muted" />
				<div className="h-4 w-32 animate-pulse rounded bg-muted" />
				{showTrend && (
					<div className="h-6 w-16 animate-pulse rounded-full bg-muted" />
				)}
			</div>
		</StatsContainer>
	)
)
StatsSkeleton.displayName = 'StatsSkeleton'

// ============================================================================
// EXPORTS - Clean interface
// ============================================================================

export {
	// Base components
	StatsContainer,
	StatsHeader, 
	StatsIcon,
	StatsValue,
	StatsTrend,
	StatsDescription,
	
	// Composition helpers
	StatsGrid,
	StatsSkeleton
}

// Convenience alias for the main container
export const Stats = StatsContainer