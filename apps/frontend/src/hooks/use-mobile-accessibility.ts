'use client'

import { useCallback, useEffect, useState } from 'react'

const HIGH_CONTRAST_QUERY = '(prefers-contrast: more), (prefers-contrast: high)'
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

export function useMobileAccessibility() {
	const [isScreenReaderMode, setIsScreenReaderMode] = useState(false)
	const [isHighContrast, setIsHighContrast] = useState(false)

	useEffect(() => {
		if (typeof window === 'undefined') {
			return
		}

		const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY)
		const highContrast = window.matchMedia(HIGH_CONTRAST_QUERY)

		const handleReducedMotion = (query: MediaQueryList | MediaQueryListEvent) => {
			setIsScreenReaderMode(query.matches)
		}

		const handleHighContrast = (query: MediaQueryList | MediaQueryListEvent) => {
			setIsHighContrast(query.matches)
		}

		handleReducedMotion(reducedMotion)
		handleHighContrast(highContrast)

		const reducedMotionListener = (event: MediaQueryListEvent) => handleReducedMotion(event)
		const highContrastListener = (event: MediaQueryListEvent) => handleHighContrast(event)

		reducedMotion.addEventListener('change', reducedMotionListener)
		highContrast.addEventListener('change', highContrastListener)

		return () => {
			reducedMotion.removeEventListener('change', reducedMotionListener)
			highContrast.removeEventListener('change', highContrastListener)
		}
	}, [])

	const applyAccessibilityStyles = useCallback((element: HTMLElement | null) => {
		if (!element) return
		element.setAttribute('data-mobile-focus', 'true')
		element.classList.add('outline-none')
		element.style.outline = '2px solid var(--primary)'
		element.style.outlineOffset = '2px'
	}, [])

	return {
		isScreenReader: isScreenReaderMode,
		isHighContrast,
		applyAccessibilityStyles
	}
}
