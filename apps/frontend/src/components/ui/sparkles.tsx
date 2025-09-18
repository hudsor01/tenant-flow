'use client'

import { useSpring, animated } from '@react-spring/web'
import { cn } from '@/lib/utils'

interface SparklesProps {
	className?: string
	size?: number
	minSize?: number
	density?: number
	speed?: number
	opacity?: number
	color?: string
	children?: React.ReactNode
}

function Sparkle({ 
	size, 
	minSize, 
	opacity, 
	color 
}: { 
	size: number
	minSize: number
	opacity: number
	color: string
}) {
	const sparkleSize = Math.random() * (size - minSize) + minSize
	const sparkleOpacity = opacity * (0.3 + Math.random() * 0.7)
	const delay = Math.random() * 2000

	const sparkleAnimation = useSpring({
		from: { scale: 0, rotate: 0, opacity: 0 },
		to: async (next) => {
			while (true) {
				await next({ scale: 1, rotate: 180, opacity: sparkleOpacity })
				await next({ scale: 0, rotate: 360, opacity: 0 })
			}
		},
		config: { tension: 200, friction: 20 },
		delay,
	})

	return (
		<animated.div
			className="absolute rounded-full"
			style={{
				background: color,
				width: sparkleSize + 'rem',
				height: sparkleSize + 'rem',
				top: Math.random() * 100 + '%',
				left: Math.random() * 100 + '%',
				...sparkleAnimation,
			}}
		/>
	)
}

export function Sparkles({
	className,
	size = 1.2,
	minSize = 0.4,
	density = 800,
	speed: _speed = 1.2,
	opacity = 1,
	color = 'hsl(var(--accent))',
	children
}: SparklesProps) {
	const sparkleCount = Math.floor(density / 100)

	return (
		<div className={cn('relative overflow-hidden', className)}>
			<div className="absolute inset-0 pointer-events-none">
				{Array.from({ length: sparkleCount }, (_, i) => (
					<Sparkle 
						key={i}
						size={size}
						minSize={minSize}
						opacity={opacity}
						color={color}
					/>
				))}
			</div>
			{children}
		</div>
	)
}