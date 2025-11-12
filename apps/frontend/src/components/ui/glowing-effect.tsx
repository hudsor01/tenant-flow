import { cn } from '#lib/utils'
import React from 'react'

interface GlowingEffectProps {
	children: React.ReactNode
	className?: string
	glowColor?: string
	glowOpacity?: number
}

export function GlowingEffect({
	children,
	className,
	glowColor = 'var(--primary)',
	glowOpacity = 0.4
}: GlowingEffectProps) {
	return (
		<div data-tokens="applied" className={cn('relative', className)}>
			<div
				className="absolute inset-0 rounded-[inherit] blur-xl"
				style={{
					background: glowColor,
					opacity: glowOpacity,
					transform: `scale(1.1)`
				}}
			/>
			<div className="relative">{children}</div>
		</div>
	)
}
