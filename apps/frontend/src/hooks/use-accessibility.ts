/**
 * Accessibility hooks for improved UX
 * Stub implementation to maintain compatibility
 */
import { useCallback } from 'react'

export function useA11yId() {
	return useCallback((prefix = 'a11y') => {
		return `${prefix}-${Math.random().toString(36).substr(2, 9)}`
	}, [])
}

export function useFocusManagement() {
	const focusFirst = useCallback((container: HTMLElement | null) => {
		if (!container) return
		const focusable = container.querySelector(
			'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
		) as HTMLElement
		focusable?.focus()
	}, [])

	const focusLast = useCallback((container: HTMLElement | null) => {
		if (!container) return
		const focusable = Array.from(
			container.querySelectorAll(
				'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
			)
		) as HTMLElement[]
		focusable[focusable.length - 1]?.focus()
	}, [])

	return { focusFirst, focusLast }
}

export function useAnnounce() {
	return useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
		const announcer = document.createElement('div')
		announcer.setAttribute('aria-live', priority)
		announcer.setAttribute('aria-atomic', 'true')
		announcer.setAttribute('class', 'sr-only')
		announcer.textContent = message
		document.body.appendChild(announcer)
		setTimeout(() => document.body.removeChild(announcer), 1000)
	}, [])
}