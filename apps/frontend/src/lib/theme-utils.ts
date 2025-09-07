import type { ThemeColors, ThemeRadius } from '@repo/shared'

export function getSavedThemeColor(): ThemeColors {
	if (typeof window === 'undefined') return 'blue'
	return (localStorage.getItem('themeColor') as ThemeColors) || 'blue'
}

export function getSavedThemeRadius(): ThemeRadius {
	if (typeof window === 'undefined') return 0.65
	return parseFloat(
		localStorage.getItem('themeRadius') || '0.65'
	) as ThemeRadius
}

// Single global design system: tokens live in globals.css (:root and .dark).
// No dynamic color preset swapping at runtime.

export function updateThemeMode(value: 'light' | 'dark') {
	if (typeof document === 'undefined') return
	const root = document.documentElement
	if (value === 'dark') {
		root.classList.add('dark')
	} else {
		root.classList.remove('dark')
	}
	root.setAttribute('data-theme-mode', value)
}
