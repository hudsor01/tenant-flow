import React from 'react'
import { cn } from '@/lib/utils'

interface OAuthLoadingSkeletonProps {
	provider?: string
	className?: string
}

export function OAuthLoadingSkeleton({
	provider = 'OAuth',
	className
}: OAuthLoadingSkeletonProps) {
	return (
		<div className={cn('w-full', className)}>
			{/* Loading button skeleton */}
			<div className="flex h-11 w-full animate-pulse items-center justify-center rounded-md border border-gray-200 bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100">
				<div className="flex items-center gap-3">
					{/* Icon skeleton */}
					<div className="h-4 w-4 animate-pulse rounded bg-gray-300" />

					{/* Text skeleton with shimmer effect */}
					<div className="relative h-4 w-32 overflow-hidden rounded bg-gray-300">
						<div className="animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent" />
					</div>
				</div>
			</div>

			{/* Optional loading message */}
			<div className="mt-2 text-center">
				<div className="text-muted-foreground inline-flex items-center gap-2 text-sm">
					<div className="bg-primary h-1 w-1 animate-bounce rounded-full [animation-delay:-0.3s]" />
					<div className="bg-primary h-1 w-1 animate-bounce rounded-full [animation-delay:-0.15s]" />
					<div className="bg-primary h-1 w-1 animate-bounce rounded-full" />
					<span className="ml-1">Connecting to {provider}...</span>
				</div>
			</div>
		</div>
	)
}

// Add shimmer animation to global CSS or Tailwind config
// @keyframes shimmer {
//   0% { transform: translateX(-100%); }
//   100% { transform: translateX(100%); }
// }
// .animate-shimmer { animation: shimmer 1.5s infinite; }
