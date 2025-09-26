'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useTransition, type ReactNode } from 'react'

interface ViewTransitionsProviderProps {
	children: ReactNode
}

// Extend the Document interface for View Transitions API support
// Using module augmentation to avoid conflicts with existing types

export function ViewTransitionsProvider({ children }: ViewTransitionsProviderProps) {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const pathname = usePathname()
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const [isPending, startTransition] = useTransition()

	useEffect(() => {
		// Add CSS for view transitions if supported
		// Type cast to any to avoid TypeScript conflicts with existing Document types
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const doc = document as any

		if (typeof document !== 'undefined' && 'startViewTransition' in doc) {
			// Add view transition styles
			const style = document.createElement('style')
			style.textContent = `
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

				/* Dashboard-specific transitions */
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
			`
			document.head.appendChild(style)

			return () => {
				if (style.parentNode) {
					document.head.removeChild(style)
				}
			}
		}
		return undefined
	}, [])

	// Wrap navigation with view transitions
	useEffect(() => {
		if (typeof window === 'undefined') return

		const handleClick = (e: MouseEvent) => {
			// Only handle internal navigation links
			const target = e.target as HTMLElement
			const link = target.closest('a')

			if (!link || !link.href || link.target === '_blank') return

			const url = new URL(link.href)
			if (url.origin !== window.location.origin) return

			// Prevent default navigation
			e.preventDefault()

			// Start view transition if supported
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const doc = document as any
			if ('startViewTransition' in doc) {
				doc.startViewTransition(() => {
					window.location.href = link.href
				})
			} else {
				// Fallback to normal navigation
				window.location.href = link.href
			}
		}

		document.addEventListener('click', handleClick)
		return () => document.removeEventListener('click', handleClick)
	}, [])

	return (
		<>
			{children}
			{isPending && (
				<div
					className="fixed inset-0 pointer-events-none z-[9999]"
					style={{
						background: 'linear-gradient(90deg, transparent, rgba(var(--color-primary-brand-rgb), 0.1), transparent)',
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

	const navigate = (href: string) => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const doc = document as any
		if ('startViewTransition' in doc) {
			doc.startViewTransition(() => {
				router.push(href)
			})
		} else {
			router.push(href)
		}
	}

	return { navigate }
}