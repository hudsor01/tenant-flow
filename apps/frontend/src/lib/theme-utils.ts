import type { TailwindColorName, TailwindRadiusValue } from '@repo/shared'

export function getSavedThemeColor(): TailwindColorName {
	if (typeof window === 'undefined') return 'blue'
	return (localStorage.getItem('themeColor') as TailwindColorName) || 'blue'
}

export function getSavedThemeRadius(): TailwindRadiusValue {
	if (typeof window === 'undefined') return 0.65
	return parseFloat(
		localStorage.getItem('themeRadius') || '0.65'
	) as TailwindRadiusValue
}

// Single global design system: tokens live in globals.css (:root and .dark).
// No dynamic color preset swapping at runtime.

export function updateThemeMode(value: 'light' | 'dark') {
	if (typeof window === 'undefined' || typeof window.document === 'undefined')
		return
	const root = window.document.documentElement
	if (value === 'dark') {
		root.classList.add('dark')
	} else {
		root.classList.remove('dark')
	}
	root.setAttribute('data-theme-mode', value)
}
