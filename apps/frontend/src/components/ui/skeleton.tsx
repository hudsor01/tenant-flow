<<<<<<< HEAD
/**
 * Enhanced Skeleton Loading Component
 * Provides smooth loading states with multiple animation options
 */

import { cn } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
	variant?: 'default' | 'text' | 'circular' | 'rectangular'
	animation?: 'pulse' | 'wave' | 'none'
	lines?: number
=======
import { cn } from '@/lib/utils'

function Skeleton({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn('bg-muted animate-pulse rounded-md', className)}
			{...props}
		/>
	)
>>>>>>> origin/main
}

function Skeleton({
	className,
	variant = 'default',
	animation = 'pulse',
	lines = 1,
	...props
}: SkeletonProps) {
	const baseClasses = cn(
		'bg-muted',
		// Animation variants
		animation === 'pulse' && 'animate-pulse',
		animation === 'wave' &&
			'animate-shimmer bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%]',
		// Shape variants
		variant === 'circular' && 'rounded-full',
		variant === 'rectangular' && 'rounded-md',
		variant === 'text' && 'rounded-sm',
		variant === 'default' && 'rounded-md',
		className
	)

	// For multiple text lines
	if (variant === 'text' && lines > 1) {
		return (
			<div className="space-y-2" {...props}>
				{Array.from({ length: lines }, (_, i) => (
					<div
						key={i}
						className={cn(
							baseClasses,
							'h-4',
							// Last line is typically shorter
							i === lines - 1 && lines > 1 && 'w-3/4'
						)}
					/>
				))}
			</div>
		)
	}

	return <div className={baseClasses} {...props} />
}

// Common skeleton patterns for better UX
const SkeletonCard = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn('bg-card rounded-lg border p-6 shadow-sm', className)}
		{...props}
	>
		<div className="space-y-4">
			<Skeleton className="h-4 w-3/4" />
			<Skeleton variant="text" lines={2} />
			<div className="flex space-x-2">
				<Skeleton className="h-8 w-16" />
				<Skeleton className="h-8 w-16" />
			</div>
		</div>
	</div>
)

const SkeletonForm = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div className={cn('space-y-6', className)} {...props}>
		<div className="space-y-2">
			<Skeleton className="h-4 w-20" />
			<Skeleton className="h-11 w-full" />
		</div>
		<div className="space-y-2">
			<Skeleton className="h-4 w-24" />
			<Skeleton className="h-11 w-full" />
		</div>
		<div className="space-y-2">
			<Skeleton className="h-4 w-16" />
			<Skeleton className="h-20 w-full" />
		</div>
		<Skeleton className="h-11 w-full" />
	</div>
)

const SkeletonContactForm = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div className={cn('space-y-6', className)} {...props}>
		{/* Inquiry type selection skeleton */}
		<div className="space-y-3">
			<Skeleton className="h-4 w-32" />
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
				{Array.from({ length: 4 }, (_, i) => (
					<Skeleton key={i} className="h-20 w-full rounded-lg" />
				))}
			</div>
		</div>

		{/* Name and Email row */}
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<div className="space-y-2">
				<Skeleton className="h-4 w-16" />
				<Skeleton className="h-11 w-full" />
			</div>
			<div className="space-y-2">
				<Skeleton className="h-4 w-20" />
				<Skeleton className="h-11 w-full" />
			</div>
		</div>

		{/* Company and Phone row */}
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<div className="space-y-2">
				<Skeleton className="w-18 h-4" />
				<Skeleton className="h-11 w-full" />
			</div>
			<div className="space-y-2">
				<Skeleton className="w-22 h-4" />
				<Skeleton className="h-11 w-full" />
			</div>
		</div>

		{/* Message field */}
		<div className="space-y-2">
			<Skeleton className="h-4 w-16" />
			<Skeleton className="h-24 w-full" />
		</div>

		{/* Submit button */}
		<Skeleton className="h-12 w-full" />

		{/* Trust indicators */}
		<div className="border-t pt-4">
			<div className="flex justify-center gap-4">
				<Skeleton className="h-4 w-20" />
				<Skeleton className="h-4 w-24" />
				<Skeleton className="w-22 h-4" />
			</div>
		</div>
	</div>
)

const SkeletonAvatar = ({
	size = 'default',
	className,
	...props
}: {
	size?: 'sm' | 'default' | 'lg'
} & React.HTMLAttributes<HTMLDivElement>) => {
	const sizeClasses = {
		sm: 'h-8 w-8',
		default: 'h-10 w-10',
		lg: 'h-12 w-12'
	}

	return (
		<Skeleton
			variant="circular"
			className={cn(sizeClasses[size], className)}
			{...props}
		/>
	)
}

export {
	Skeleton,
	SkeletonCard,
	SkeletonForm,
	SkeletonContactForm,
	SkeletonAvatar
}
