import { cn } from '#lib/utils'

interface SectionSkeletonProps {
	height?: number
	className?: string
	variant?: 'default' | 'card' | 'grid'
}

/**
 * SectionSkeleton - Loading placeholder for lazy-loaded sections
 * Prevents layout shift by reserving space
 */
export function SectionSkeleton({
	height = 400,
	className,
	variant = 'default'
}: SectionSkeletonProps) {
	if (variant === 'grid') {
		return (
			<div className={cn('py-16 px-6 lg:px-8', className)}>
				<div className="max-w-7xl mx-auto">
					<div className="grid md:grid-cols-3 gap-8">
						{[1, 2, 3].map(i => (
							<div
								key={i}
								className="bg-muted/50 rounded-2xl animate-pulse"
								style={{ height: '300px' }}
							/>
						))}
					</div>
				</div>
			</div>
		)
	}

	if (variant === 'card') {
		return (
			<div className={cn('py-16 px-6 lg:px-8', className)}>
				<div className="max-w-7xl mx-auto">
					<div className="bg-muted/50 rounded-3xl animate-pulse" style={{ height }} />
				</div>
			</div>
		)
	}

	return (
		<div
			className={cn('bg-muted/30 animate-pulse', className)}
			style={{ height }}
			aria-label="Loading content..."
		/>
	)
}
