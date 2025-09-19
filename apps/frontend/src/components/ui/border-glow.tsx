'use client'

import { cn } from '@/lib/utils'

interface BorderGlowProps {
	children: React.ReactNode
	className?: string
	duration?: string
	size?: number
	borderWidth?: number
	colorFrom?: string
	colorTo?: string
}

export function BorderGlow({
	children,
	className,
	duration = '15s',
	size: _size = 200,
	borderWidth = 1,
	colorFrom = 'hsl(var(--primary))', // primary color
	colorTo = 'hsl(var(--accent))' // accent color
}: BorderGlowProps) {
	return (
		<div
			className={cn(
				'relative overflow-hidden rounded-lg',
				className
			)}
		>
			{/* Animated border */}
			<div
				className="absolute inset-0 rounded-lg opacity-75"
				style={{
					background: `conic-gradient(from 0deg, transparent, ${colorFrom}, ${colorTo}, transparent)`,
					animation: `spin ${duration} linear infinite`,
					mask: `radial-gradient(farthest-side, transparent calc(100% - ${borderWidth}px), white calc(100% - ${borderWidth}px))`,
					WebkitMask: `radial-gradient(farthest-side, transparent calc(100% - ${borderWidth}px), white calc(100% - ${borderWidth}px))`
				}}
			/>

			{/* Content */}
			<div className="relative z-10 h-full w-full rounded-lg bg-background">
				{children}
			</div>
		</div>
	)
}