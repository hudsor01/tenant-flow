import type {
	TailwindColorName,
	TailwindRadiusValue
} from '@repo/shared/types/frontend'
import type { ThemeMode } from '@repo/shared/types/domain'

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

export const THEME_MODE_STORAGE_KEY = 'tenantflow-theme-mode' as const
export const THEME_MODE_COOKIE_NAME = 'tenantflow_theme_mode' as const
export const THEME_MODE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year
export const DEFAULT_THEME_MODE: ThemeMode = 'light'

const VALID_THEME_MODES: ThemeMode[] = ['light', 'dark', 'system']

const isThemeMode = (value: unknown): value is ThemeMode =>
	typeof value === 'string' && VALID_THEME_MODES.includes(value as ThemeMode)

export function parseThemeMode(value?: string | null): ThemeMode | null {
	if (!value) {
		return null
	}

	return isThemeMode(value) ? value : null
}

export function persistThemeMode(mode: ThemeMode) {
	if (typeof document === 'undefined') {
		return
	}

	try {
		if (typeof window !== 'undefined') {
			window.localStorage?.setItem(THEME_MODE_STORAGE_KEY, mode)
		}
	} catch {
		// Silently fail if localStorage is not available
	}

	const cookieSegments = [
		`${THEME_MODE_COOKIE_NAME}=${mode}`,
		'path=/',
		`max-age=${THEME_MODE_COOKIE_MAX_AGE}`,
		'SameSite=Lax'
	]

	if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
		cookieSegments.push('Secure')
	}

	document.cookie = cookieSegments.join('; ')
}

export function getStoredThemeMode(): ThemeMode | null {
	if (typeof document === 'undefined') {
		return null
	}

	try {
		if (typeof window !== 'undefined') {
			const stored = window.localStorage?.getItem(THEME_MODE_STORAGE_KEY)
			const parsed = parseThemeMode(stored)
			if (parsed) {
				return parsed
			}
		}
	} catch {
		// Silently fail if localStorage is not available
	}

	const cookie = document.cookie
		.split('; ')
		.find(entry => entry.startsWith(`${THEME_MODE_COOKIE_NAME}=`))

	if (cookie) {
		const [, value] = cookie.split('=', 2)
		return parseThemeMode(value)
	}

	return null
}
// Single global design system: tokens live in globals.css (:root and .dark).
// No dynamic color preset swapping at runtime.

export function updateThemeMode(
	theme: 'light' | 'dark',
	preference: ThemeMode = theme
) {
	if (typeof window === 'undefined' || typeof window.document === 'undefined')
		return
	const root = window.document.documentElement
	if (theme === 'dark') {
		root.classList.add('dark')
		root.classList.remove('light')
	} else {
		root.classList.add('light')
		root.classList.remove('dark')
	}
	root.setAttribute('data-theme', theme)
	root.setAttribute('data-theme-preference', preference)
}
