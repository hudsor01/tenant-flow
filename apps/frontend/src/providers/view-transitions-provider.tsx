'use client'

import { safeDocumentEvents } from '#lib/dom-utils'
import { useRouter } from 'next/navigation'
import { useEffect, useTransition, type ReactNode } from 'react'

interface ViewTransitionsProviderProps {
	children: ReactNode
}

export function ViewTransitionsProvider({
	children
}: ViewTransitionsProviderProps) {
	const [isPending, startTransition] = useTransition()

	// Wrap navigation with view transitions
	useEffect(() => {
		if (typeof window === 'undefined') return undefined

		const handleClick = (event: MouseEvent) => {
			// Only handle internal navigation links
			const target = event.target as HTMLElement | null
			const link = target?.closest('a')

			if (!link || !link.href || link.target === '_blank') return

			const url = new URL(link.href)
			if (url.origin !== window.location.origin) return

			// Prevent default navigation
			event.preventDefault()

			// Start view transition if supported
			const navigate = () => {
				window.location.href = link.href
			}

			const { startViewTransition } = document
			if (typeof startViewTransition === 'function') {
				startTransition(() => {
					startViewTransition.call(document, navigate)
				})
			} else {
				startTransition(navigate)
			}
		}

		safeDocumentEvents.addEventListener('click', handleClick)
		return () => safeDocumentEvents.removeEventListener('click', handleClick)
	}, [startTransition])

	return (
		<>
			{children}
			<ViewTransitionStyles />
			{isPending && (
				<div
					className="fixed inset-0 pointer-events-none z-[9999]"
					style={{
						background:
							'linear-gradient(90deg, transparent, rgba(var(--color-primary-brand-rgb), 0.1), transparent)',
						animation: 'shimmer 1s ease-in-out infinite'
					}}
				/>
			)}
		</>
	)
}

// Hook to use view transitions programmatically
export function useViewTransition() {
	const router = useRouter()
	const [, startTransition] = useTransition()

	const navigate = (href: string) => {
		const doc = typeof document === 'undefined' ? undefined : document
		const performNavigation = () => {
			router.push(href)
		}

		if (doc && typeof doc.startViewTransition === 'function') {
			const { startViewTransition } = doc
			startTransition(() => {
				startViewTransition.call(doc, performNavigation)
			})
		} else {
			startTransition(performNavigation)
		}
	}

	return { navigate }
}

function ViewTransitionStyles() {
	return (
		<style>{`
		::view-transition-old(root),
		::view-transition-new(root) {
			animation-duration: 0.25s;
			animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
		}

		::view-transition-old(root) {
			animation-name: fade-out;
		}

		::view-transition-new(root) {
			animation-name: fade-in;
		}

		@keyframes fade-out {
			from { opacity: 1; }
			to { opacity: 0; }
		}

		@keyframes fade-in {
			from { opacity: 0; }
			to { opacity: 1; }
		}

		.dashboard-stats {
			view-transition-name: dashboard-stats;
		}

		.dashboard-activity {
			view-transition-name: dashboard-activity;
		}

		::view-transition-old(dashboard-stats),
		::view-transition-new(dashboard-stats),
		::view-transition-old(dashboard-activity),
		::view-transition-new(dashboard-activity) {
			animation-duration: 0.3s;
			animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
		}
		`}</style>
	)
}
