'use client'

import { Activity, Suspense, useRef, useState, useEffect, type ReactNode } from 'react'

interface DeferredSectionProps {
	children: ReactNode
	fallback: ReactNode
	/** If true, always render visible (for above-the-fold content) */
	priority?: boolean
	/** Root margin for intersection observer (default: '100px' - preload 100px before visible) */
	rootMargin?: string
	/** Minimum time to show loading state (prevents flicker) */
	minLoadingMs?: number
}

/**
 * DeferredSection - React 19.2 Activity + Intersection Observer
 *
 * For priority content (above-the-fold): renders immediately with Suspense
 * For deferred content (below-fold): uses Activity mode='hidden' until in viewport
 *
 * Benefits:
 * - Hidden content pre-renders but doesn't block visible content
 * - Effects are unmounted when hidden (no wasted network/CPU)
 * - State is preserved when scrolling back
 * - Smooth reveal with Suspense batching
 */
export function DeferredSection({
	children,
	fallback,
	priority = false,
	rootMargin = '100px',
	minLoadingMs: _minLoadingMs = 0
}: DeferredSectionProps) {
	const ref = useRef<HTMLDivElement>(null)
	const [isVisible, setIsVisible] = useState(priority)
	const [hasBeenVisible, setHasBeenVisible] = useState(priority)

	useEffect(() => {
		if (priority) return // Priority content is always visible

		const element = ref.current
		if (!element) return

		const observer = new IntersectionObserver(
			(entries) => {
				const entry = entries[0]
				if (!entry) return
				if (entry.isIntersecting) {
					setIsVisible(true)
					setHasBeenVisible(true)
				} else if (hasBeenVisible) {
					// Keep visible once loaded to preserve state
					// Activity mode='hidden' will handle deferring updates
					setIsVisible(false)
				}
			},
			{ rootMargin, threshold: 0 }
		)

		observer.observe(element)
		return () => observer.disconnect()
	}, [priority, rootMargin, hasBeenVisible])

	// Priority content: Just Suspense, no Activity wrapper
	if (priority) {
		return (
			<Suspense fallback={fallback}>
				{children}
			</Suspense>
		)
	}

	// Deferred content: Activity + Suspense
	return (
		<div ref={ref}>
			<Activity mode={isVisible ? 'visible' : 'hidden'}>
				<Suspense fallback={fallback}>
					{hasBeenVisible ? children : fallback}
				</Suspense>
			</Activity>
		</div>
	)
}

/**
 * useInViewport - Hook for viewport detection
 */
export function useInViewport(
	rootMargin = '100px'
): [React.RefObject<HTMLDivElement | null>, boolean] {
	const ref = useRef<HTMLDivElement>(null)
	const [isInViewport, setIsInViewport] = useState(false)

	useEffect(() => {
		const element = ref.current
		if (!element) return

		const observer = new IntersectionObserver(
			(entries) => {
				const entry = entries[0]
				if (entry) setIsInViewport(entry.isIntersecting)
			},
			{ rootMargin, threshold: 0 }
		)

		observer.observe(element)
		return () => observer.disconnect()
	}, [rootMargin])

	return [ref, isInViewport]
}
