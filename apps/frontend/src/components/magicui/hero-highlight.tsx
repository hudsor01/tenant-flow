'use client'
import { ANIMATION_DURATIONS, cn, containerClasses } from '@/lib/design-system'
import type { ComponentSize } from '@repo/shared'
import React from 'react'

interface HeroHighlightProps {
	children: React.ReactNode
	className?: string
	containerClassName?: string
	variant?: 'default' | 'modern' | 'gradient'
	size?: ComponentSize
	pattern?: 'grid' | 'dots' | 'none'
}

export const HeroHighlight = ({
	children,
	className,
	containerClassName,
	variant = 'default',
	size = 'default',
	pattern = 'grid'
}: HeroHighlightProps) => {
	// Height configurations based on ComponentSize
	const heights: Record<ComponentSize, string> = {
		xs: 'h-[25rem]',
		sm: 'h-[30rem]',
		default: 'h-[35rem]',
		lg: 'h-[40rem]',
		xl: 'h-[50rem]'
	}

	// Background patterns
	const patterns = {
		grid: 'bg-grid-small-black/[0.02] dark:bg-grid-small-white/[0.02]',
		dots: 'bg-dot-black/[0.2] dark:bg-dot-white/[0.2]',
		none: ''
	}

	// Variant styles with design system integration
	const variants = {
		default: 'bg-background',
		modern: 'bg-gradient-to-br from-background via-accent/5 to-background',
		gradient: 'bg-gradient-to-br from-primary/5 via-background to-secondary/5'
	}

	return (
		<section
			className={cn(
				'group relative flex w-full items-center justify-center',
				heights[size],
				variants[variant],
				containerClassName
			)}
			role="banner"
			aria-label="Hero section"
		>
			{/* Background pattern with accessibility consideration */}
			{pattern !== 'none' && (
				<div
					className={cn(
						'pointer-events-none absolute inset-0',
						patterns[pattern]
					)}
					aria-hidden="true"
				/>
			)}

			{/* Enhanced content container */}
			<div
				className={cn(
					containerClasses('xl'),
					'relative z-20 text-center px-4 sm:px-6 lg:px-8',
					className
				)}
			>
				{children}
			</div>

			{/* Subtle animation overlay */}
			<div
				className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none bg-gradient-to-t from-transparent via-primary/[0.01] to-transparent"
				style={{
					transition: `opacity ${ANIMATION_DURATIONS.slow} ease-out`
				}}
				aria-hidden="true"
			/>
		</section>
	)
}

interface HighlightProps {
	children: React.ReactNode
	className?: string
	variant?: 'primary' | 'secondary' | 'accent' | 'gradient'
	delay?: number
	duration?: number
}

export const Highlight = ({
	children,
	className,
	variant = 'primary',
	delay = 0.5,
	duration = 2
}: HighlightProps) => {
	// Enhanced variant configurations with design system colors
	const variants = {
		primary:
			'bg-gradient-to-r from-primary/30 to-primary/20 dark:from-primary/50 dark:to-primary/30',
		secondary:
			'bg-gradient-to-r from-secondary/30 to-secondary/20 dark:from-secondary/50 dark:to-secondary/30',
		accent:
			'bg-gradient-to-r from-accent/30 to-accent/20 dark:from-accent/50 dark:to-accent/30',
		gradient:
			'bg-gradient-to-r from-primary/30 to-accent/30 dark:from-primary/50 dark:to-accent/30'
	}

	return (
		<span
			className={cn(
				'relative inline-block rounded-lg px-2 py-0.5 font-medium animate-highlight',
				variants[variant],
				className
			)}
			style={{
				backgroundRepeat: 'no-repeat',
				backgroundPosition: 'left center',
				display: 'inline-block',
				animationDuration: `${duration}s`,
				animationDelay: `${delay}s`,
				animationFillMode: 'forwards',
				animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
			}}
		>
			<span className="relative z-10">{children}</span>
		</span>
	)
}
