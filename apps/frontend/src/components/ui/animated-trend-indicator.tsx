'use client'

import { cn } from '#lib/utils'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'

interface AnimatedTrendIndicatorProps {
	/** The change value (positive, negative, or zero) */
	value: number
	/** Format as percentage */
	showPercentage?: boolean
	/** Animation delay in ms */
	delay?: number
	/** Custom class name */
	className?: string
	/** Size variant */
	size?: 'sm' | 'md' | 'lg'
	/** Show the numeric value */
	showValue?: boolean
}

const sizeClasses = {
	sm: {
		icon: 'size-3',
		text: 'text-xs'
	},
	md: {
		icon: 'size-4',
		text: 'text-sm'
	},
	lg: {
		icon: 'size-5',
		text: 'text-base'
	}
}

/**
 * AnimatedTrendIndicator - Shows trend direction with animated arrow and optional value
 * Used for revenue changes, occupancy trends, and other metrics
 */
export function AnimatedTrendIndicator({
	value,
	showPercentage = true,
	delay = 0,
	className,
	size = 'sm',
	showValue = true
}: AnimatedTrendIndicatorProps) {
	const isPositive = value > 0
	const isNegative = value < 0

	const { icon: iconSize, text: textSize } = sizeClasses[size]

	const Icon = isPositive ? ArrowUpRight : isNegative ? ArrowDownRight : Minus

	const colorClass = isPositive
		? 'text-success'
		: isNegative
			? 'text-destructive'
			: 'text-muted-foreground'

	const animationClass = isPositive
		? 'animate-in slide-in-from-bottom-1'
		: isNegative
			? 'animate-in slide-in-from-top-1'
			: 'animate-in fade-in'

	const formattedValue = showPercentage
		? `${Math.abs(value).toFixed(1)}%`
		: Math.abs(value).toLocaleString()

	return (
		<span
			className={cn(
				'inline-flex items-center gap-0.5 font-medium transition-all duration-300',
				colorClass,
				animationClass,
				textSize,
				className
			)}
			style={{ animationDelay: `${delay}ms` }}
			aria-label={`${isPositive ? 'Increased' : isNegative ? 'Decreased' : 'No change'} by ${formattedValue}`}
		>
			<Icon className={cn(iconSize, 'shrink-0')} />
			{showValue && <span>{formattedValue}</span>}
		</span>
	)
}
