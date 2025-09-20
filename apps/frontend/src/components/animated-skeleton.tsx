import { Card } from '@/components/ui/card'
import { TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { animated, config, useSpring } from '@react-spring/web'
import * as React from 'react'

interface AnimatedSkeletonProps extends React.ComponentProps<'div'> {
	variant?: 'default' | 'text' | 'circle' | 'card' | 'metric'
	width?: string | number
	height?: string | number
	animate?: boolean
}

export const AnimatedSkeleton = React.forwardRef<
	HTMLDivElement,
	AnimatedSkeletonProps
>(
	(
		{ className, variant = 'default', width, height, animate = true, ...props },
		ref
	) => {
		// Shimmer animation using React Spring
		const shimmerSpring = useSpring({
			from: { backgroundPosition: '-100% 0' },
			to: { backgroundPosition: '100% 0' },
			loop: animate,
			config: { ...config.slow, duration: 1500 }
		})

		// Pulse animation for fallback
		const pulseSpring = useSpring({
			from: { opacity: 1 },
			to: { opacity: 0.4 },
			loop: animate ? { reverse: true } : false,
			config: config.slow
		})

		// Entrance animation
		const entranceSpring = useSpring({
			opacity: 1,
			transform: 'scale(1)',
			from: { opacity: 0, transform: 'scale(0.95)' },
			config: config.gentle
		})

		const baseClasses = 'bg-muted rounded-md'

		const variantClasses = {
			default: '',
			text: 'h-4 w-full',
			circle: 'rounded-full',
			card: 'h-32 w-full',
			metric: 'h-24 w-full rounded-lg'
		}

		const style = {
			width,
			height,
			background: `linear-gradient(
        90deg,
        var(--color-muted) 0%,
        color-mix(in oklab, var(--color-muted) 40%, white) 50%,
        var(--color-muted) 100%
      )`,
			backgroundSize: '200% 100%'
		}

		return (
			<animated.div
				ref={ref}
				style={{
					...entranceSpring,
					...style,
					...(animate ? shimmerSpring : pulseSpring)
				}}
				className={cn(baseClasses, variantClasses[variant], className)}
				{...props}
			/>
		)
	}
)
AnimatedSkeleton.displayName = 'AnimatedSkeleton'

// Specialized skeleton components
export const SkeletonMetricCard = ({ delay = 0 }: { delay?: number }) => {
	const cardSpring = useSpring({
		opacity: 1,
		transform: 'translateY(0px)',
		from: { opacity: 0, transform: 'translateY(10px)' },
		config: config.gentle,
		delay
	})

	return (
		<Card>
			<animated.div style={cardSpring} className="p-6 space-y-4">
				<AnimatedSkeleton variant="text" className="h-4 w-20" />
				<AnimatedSkeleton variant="text" className="h-8 w-24" />
				<div className="space-y-2">
					<AnimatedSkeleton variant="text" className="h-3 w-32" />
					<AnimatedSkeleton variant="text" className="h-3 w-40" />
				</div>
			</animated.div>
		</Card>
	)
}

export const SkeletonTableRow = ({ delay = 0 }: { delay?: number }) => {
	const rowSpring = useSpring({
		opacity: 1,
		from: { opacity: 0 },
		config: config.gentle,
		delay
	})

	return (
		<TableRow>
			<animated.div
				style={rowSpring}
				className="flex items-center space-x-4 p-4 border-b border-border"
			>
				<AnimatedSkeleton variant="circle" className="h-8 w-8" />
				<AnimatedSkeleton variant="text" className="h-4 flex-1" />
				<AnimatedSkeleton variant="text" className="h-4 w-20" />
				<AnimatedSkeleton variant="text" className="h-4 w-16" />
			</animated.div>
		</TableRow>
	)
}

export const SkeletonChart = ({ delay = 0 }: { delay?: number }) => {
	const chartSpring = useSpring({
		opacity: 1,
		transform: 'scale(1)',
		from: { opacity: 0, transform: 'scale(0.98)' },
		config: config.gentle,
		delay
	})

	return (
		<Card>
			<animated.div style={chartSpring} className="p-6 space-y-4">
				<div className="flex justify-between items-center">
					<AnimatedSkeleton variant="text" className="h-6 w-32" />
					<AnimatedSkeleton variant="text" className="h-4 w-20" />
				</div>
				<AnimatedSkeleton variant="default" className="h-64 w-full rounded" />
				<div className="flex justify-center space-x-4">
					<AnimatedSkeleton variant="text" className="h-3 w-16" />
					<AnimatedSkeleton variant="text" className="h-3 w-16" />
					<AnimatedSkeleton variant="text" className="h-3 w-16" />
				</div>
			</animated.div>
		</Card>
	)
}
