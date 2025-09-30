import { cn } from '@/lib/utils'
import React from 'react'

export function GridBackground({
	children,
	className
}: {
	children?: React.ReactNode
	className?: string
}) {
	return (
		<div
			className={cn(
				'relative flex w-full h-full items-center justify-center bg-white dark:bg-background',
				className
			)}
		>
			{/* Subtle grid pattern - visible but not distracting */}
			<div
				className="absolute inset-0"
				style={{
					backgroundImage: `linear-gradient(to right, color-mix(in srgb, var(--color-label-quinary) 40%, transparent) 1px, transparent 1px),
					                   linear-gradient(to bottom, color-mix(in srgb, var(--color-label-quinary) 40%, transparent) 1px, transparent 1px)`,
					backgroundSize: '40px 40px'
				}}
			/>
			{children && <div className="relative z-20">{children}</div>}
		</div>
	)
}
