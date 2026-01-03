import type { ReactNode } from 'react'
import { cn } from '#lib/utils'

interface GlowingEffectProps {
	children: ReactNode
	className?: string
	glowColor?: string
	glowOpacity?: number
}

export function GlowingEffect({
	children,
	className,
	glowColor = 'var(--color-primary)',
	glowOpacity = 0.4
}: GlowingEffectProps) {
	return (
		<div data-tokens="applied" className={cn('relative', className)}>
			<div
				className="glowing-effect-blur"
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
