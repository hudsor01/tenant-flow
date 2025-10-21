'use client'

import { cn } from '@/lib/utils'

interface BorderGlowProps {
	children: React.ReactNode
	className?: string
	duration?: string
	borderWidth?: number
	colorFrom?: string
	colorTo?: string
}

export function BorderGlow({
	children,
	className,
	duration = '15s',
	borderWidth = 1,
	colorFrom = 'oklch(var(--primary))', // primary color
	colorTo = 'oklch(var(--accent))' // accent color
}: BorderGlowProps) {
	return (
		<div
			data-tokens="applied"
			className={cn(
				'relative overflow-hidden rounded-[var(--radius-large)]',
				className
			)}
		>
			{/* Animated border */}
			<div
				className="absolute inset-0 rounded-[var(--radius-large)] opacity-75"
				style={{
					background: `conic-gradient(from 0deg, transparent, ${colorFrom}, ${colorTo}, transparent)`,
					animation: `spin ${duration} linear infinite`,
					mask: `radial-gradient(farthest-side, transparent calc(100% - ${borderWidth}px), white calc(100% - ${borderWidth}px))`,
					WebkitMask: `radial-gradient(farthest-side, transparent calc(100% - ${borderWidth}px), white calc(100% - ${borderWidth}px))`
				}}
			/>

			{/* Content */}
			<div className="relative z-10 h-full w-full rounded-[var(--radius-large)] bg-background">
				{children}
			</div>
		</div>
	)
}
