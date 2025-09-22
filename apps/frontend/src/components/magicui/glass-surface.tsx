import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

const glassSurfaceVariants = cva(
	[
		// Base glass material foundation
		'relative',
		'overflow-hidden',
		// Transitions using design tokens
		'transition-all',
		'duration-[var(--duration-standard)]',
		'ease-[var(--ease-smooth)]',
		// Transform optimization
		'transform-gpu'
	].join(' '),
	{
		variants: {
			variant: {
				default: [
					'bg-[var(--glass-material)]',
					'border-[var(--glass-border)]',
					'shadow-[var(--glass-shadow)]',
					'backdrop-blur-md',
					'-webkit-backdrop-filter: blur(12px)'
				].join(' '),
				strong: [
					'bg-[var(--color-primary-brand-15)]',
					'border',
					'border-[var(--color-primary-brand-25)]',
					'shadow-[var(--shadow-medium)]',
					'backdrop-blur-xl',
					'-webkit-backdrop-filter: blur(24px)'
				].join(' '),
				subtle: [
					'bg-[var(--color-fill-primary)]',
					'border',
					'border-[var(--color-fill-tertiary)]',
					'shadow-[var(--shadow-small)]',
					'backdrop-blur-sm',
					'-webkit-backdrop-filter: blur(4px)'
				].join(' '),
				frosted: [
					'bg-[var(--color-fill-secondary)]',
					'border',
					'border-[var(--color-separator)]',
					'shadow-[var(--shadow-medium)]',
					'backdrop-blur-lg',
					'-webkit-backdrop-filter: blur(16px)'
				].join(' '),
				vibrant: [
					'bg-[var(--color-primary-brand-10)]',
					'border',
					'border-[var(--color-primary-brand-15)]',
					'shadow-[var(--shadow-large)]',
					'backdrop-blur-xl',
					'-webkit-backdrop-filter: blur(24px)'
				].join(' ')
			},
			radius: {
				none: 'rounded-none',
				sm: 'rounded-[var(--radius-small)]',
				md: 'rounded-[var(--radius-medium)]',
				lg: 'rounded-[var(--radius-large)]',
				xl: 'rounded-[var(--radius-xlarge)]',
				full: 'rounded-full'
			},
			interactive: {
				none: '',
				hover: [
					'hover:scale-[1.02]',
					'hover:shadow-[var(--shadow-large)]',
					'active:scale-[0.98]',
					'cursor-pointer'
				].join(' '),
				lift: [
					'hover:-translate-y-1',
					'hover:shadow-[var(--shadow-large)]',
					'active:translate-y-0',
					'cursor-pointer'
				].join(' ')
			},
			padding: {
				none: 'p-0',
				sm: 'p-[var(--spacing-4)]',
				md: 'p-[var(--spacing-6)]',
				lg: 'p-[var(--spacing-8)]',
				xl: 'p-[var(--spacing-12)]'
			}
		},
		defaultVariants: {
			variant: 'default',
			radius: 'lg',
			interactive: 'none',
			padding: 'md'
		}
	}
)

export interface GlassSurfaceProps
	extends React.ComponentProps<'div'>,
		VariantProps<typeof glassSurfaceVariants> {
	/**
	 * Whether to add a subtle shimmer effect on hover
	 */
	shimmer?: boolean
}

function GlassSurface({
	className,
	variant,
	radius,
	interactive,
	padding,
	shimmer = false,
	children,
	...props
}: GlassSurfaceProps) {
	return (
		<div
			data-slot="glass-surface"
			data-tokens="applied"
			className={cn(
				glassSurfaceVariants({ variant, radius, interactive, padding }),
				// Shimmer effect
				shimmer && [
					'relative',
					'overflow-hidden',
					'before:absolute',
					'before:inset-0',
					'before:bg-gradient-to-r',
					'before:from-transparent',
					'before:via-[var(--color-fill-secondary)] before:opacity-70',
					'before:to-transparent',
					'before:translate-x-[-100%]',
					'before:transition-transform',
					'before:duration-1000',
					'hover:before:translate-x-[100%]'
				],
				className
			)}
			{...props}
		>
			{children}
		</div>
	)
}

// Glass Panel - specialized for navigation/menu panels
function GlassPanel({
	className,
	children,
	...props
}: Omit<GlassSurfaceProps, 'variant' | 'padding'>) {
	return (
		<GlassSurface
			variant="frosted"
			padding="sm"
			className={cn('border-0', className)}
			{...props}
		>
			{children}
		</GlassSurface>
	)
}

// Glass Modal - specialized for modal backdrops
function GlassModal({
	className,
	children,
	...props
}: Omit<GlassSurfaceProps, 'variant' | 'interactive'>) {
	return (
		<GlassSurface
			variant="strong"
			interactive="none"
			className={cn('border-0', className)}
			{...props}
		>
			{children}
		</GlassSurface>
	)
}

// Glass Card - specialized for content cards with glass material
function GlassCard({
	className,
	children,
	...props
}: Omit<GlassSurfaceProps, 'variant' | 'interactive'>) {
	return (
		<GlassSurface
			variant="default"
			interactive="hover"
			shimmer
			className={className}
			{...props}
		>
			{children}
		</GlassSurface>
	)
}

export { GlassCard, GlassModal, GlassPanel, GlassSurface, glassSurfaceVariants }
