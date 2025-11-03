'use client'

import { useInView } from 'react-intersection-observer'
import type { ReactNode } from 'react'

interface LazySectionProps {
	children: ReactNode
	fallback?: ReactNode
	threshold?: number
	triggerOnce?: boolean
	minHeight?: number
	className?: string
}

/**
 * LazySection - Lazy loads content when it enters the viewport
 * Uses Intersection Observer API for progressive loading
 *
 * @param children - Content to lazy load
 * @param fallback - Optional loading skeleton/placeholder
 * @param threshold - Percentage of visibility required to trigger (0-1)
 * @param triggerOnce - Whether to trigger only once (default: true)
 * @param minHeight - Minimum height to reserve space (prevents layout shift)
 * @param className - Additional CSS classes
 */
export function LazySection({
	children,
	fallback,
	threshold = 0.1,
	triggerOnce = true,
	minHeight,
	className
}: LazySectionProps) {
	const { ref, inView } = useInView({
		threshold,
		triggerOnce
	})

	return (
		<div
			ref={ref}
			className={className}
			style={minHeight ? { minHeight: `${minHeight}px` } : undefined}
		>
			{inView ? children : fallback}
		</div>
	)
}
