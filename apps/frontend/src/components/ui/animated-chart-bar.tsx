'use client'

import { cn } from '#lib/utils'
import { useEffect, useState } from 'react'

interface AnimatedChartBarProps {
	/** Value as percentage (0-100) */
	value: number
	/** Animation delay in ms */
	delay?: number
	/** Custom class name */
	className?: string
	/** Color variant */
	variant?: 'primary' | 'success' | 'warning' | 'info' | 'destructive'
	/** Height of the bar container */
	height?: number
	/** Show value label */
	showLabel?: boolean
}

const variantClasses = {
	primary: 'bg-primary',
	success: 'bg-success',
	warning: 'bg-warning',
	info: 'bg-info',
	destructive: 'bg-destructive'
}

/**
 * AnimatedChartBar - A chart bar that animates from 0 to its value
 * Used for mini-charts and visualizations in property cards and dashboards
 */
export function AnimatedChartBar({
	value,
	delay = 0,
	className,
	variant = 'primary',
	height = 40,
	showLabel = false
}: AnimatedChartBarProps) {
	const [animatedValue, setAnimatedValue] = useState(0)

	useEffect(() => {
		const timer = setTimeout(() => {
			setAnimatedValue(Math.min(100, Math.max(0, value)))
		}, delay)

		return () => clearTimeout(timer)
	}, [value, delay])

	return (
		<div
			className={cn('relative flex items-end', className)}
			style={{ height }}
		>
			<div
				className={cn(
					'w-full rounded-t-sm transition-all duration-500 ease-out',
					variantClasses[variant]
				)}
				style={{
					height: `${animatedValue}%`,
					transitionDelay: `${delay}ms`
				}}
				role="progressbar"
				aria-valuenow={value}
				aria-valuemin={0}
				aria-valuemax={100}
			/>
			{showLabel && animatedValue > 0 && (
				<span
					className={cn(
						'absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-medium',
						'animate-in fade-in duration-300'
					)}
					style={{ animationDelay: `${delay + 300}ms` }}
				>
					{value.toFixed(0)}%
				</span>
			)}
		</div>
	)
}

interface AnimatedChartBarGroupProps {
	/** Array of values (0-100) */
	values: number[]
	/** Base animation delay in ms */
	baseDelay?: number
	/** Stagger delay between bars in ms */
	staggerDelay?: number
	/** Custom class name */
	className?: string
	/** Color variant */
	variant?: 'primary' | 'success' | 'warning' | 'info' | 'destructive'
	/** Height of the bar container */
	height?: number
	/** Gap between bars */
	gap?: number
}

/**
 * AnimatedChartBarGroup - A group of animated chart bars with staggered animation
 */
export function AnimatedChartBarGroup({
	values,
	baseDelay = 0,
	staggerDelay = 50,
	className,
	variant = 'primary',
	height = 40,
	gap = 2
}: AnimatedChartBarGroupProps) {
	return (
		<div className={cn('flex items-end', className)} style={{ gap, height }}>
			{values.map((value, index) => (
				<AnimatedChartBar
					key={index}
					value={value}
					delay={baseDelay + index * staggerDelay}
					variant={variant}
					height={height}
					className="flex-1"
				/>
			))}
		</div>
	)
}
