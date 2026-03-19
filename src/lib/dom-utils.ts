/**
 * DOM Sanitization Utilities
 * Provides secure DOM manipulation methods to replace direct document access
 *
 * SECURITY: All DOM operations are validated and sanitized
 * COMPATIBILITY: Server-side rendering safe
 */

// This file centralizes safe DOM utilities to avoid direct document access elsewhere.

import { createLogger } from '#lib/frontend-logger'

const domLogger = createLogger({ component: 'DomUtils' })

/**
 * Cookie operations with security validation
 */
export const secureCookie = {
	/**
	 * Set a cookie with security validation
	 */
	set(
		name: string,
		value: string,
		options: {
			path?: string
			maxAge?: number
			sameSite?: 'Strict' | 'Lax' | 'None'
			secure?: boolean
		} = {}
	) {
		if (typeof document === 'undefined') return

		// Validate cookie name and value
		if (!name || !value) {
			throw new Error('Cookie name and value are required')
		}

		// Sanitize cookie name and value
		const sanitizedName = name.replace(/[^\w-]/g, '')
		const sanitizedValue = encodeURIComponent(value)

		const cookieSegments = [
			`${sanitizedName}=${sanitizedValue}`,
			`path=${options.path || '/'}`,
			...(options.maxAge ? [`max-age=${options.maxAge}`] : []),
			`SameSite=${options.sameSite || 'Lax'}`
		]

		// Auto-detect secure requirement for HTTPS
		const isSecure =
			options.secure ??
			(typeof window !== 'undefined' && window.location.protocol === 'https:')
		if (isSecure) {
			cookieSegments.push('Secure')
		}

		document.cookie = cookieSegments.join('; ')
	},

	/**
	 * Get a cookie with validation
	 */
	get(name: string): string | null {
		if (typeof document === 'undefined') return null
		if (!name) return null
		const sanitizedName = name.replace(/[^\w-]/g, '')
		const cookie = document.cookie
			.split('; ')
			.find(entry => entry.startsWith(`${sanitizedName}=`))

		if (cookie) {
			const [, value] = cookie.split('=', 2)
			return value ? decodeURIComponent(value) : null
		}

		return null
	}
}

/**
 * Safe DOM element creation and manipulation
 */
export const safeDom = {
	/**
	 * Create element with validation
	 */
	createElement<K extends keyof HTMLElementTagNameMap>(
		tagName: K,
		options: {
			attributes?: Record<string, string>
			textContent?: string
			className?: string
		} = {}
	): HTMLElementTagNameMap[K] | null {
		if (typeof document === 'undefined') return null

		// Whitelist allowed elements
		const allowedElements = [
			'div',
			'span',
			'p',
			'a',
			'button',
			'input',
			'label',
			'form',
			'h1',
			'h2',
			'h3',
			'h4',
			'h5',
			'h6',
			'section',
			'article',
			'nav',
			'header',
			'footer',
			'main',
			'aside',
			'ul',
			'ol',
			'li',
			'img',
			'video',
			'audio',
			'canvas',
			'svg',
			'style'
		] as const

		if (!(allowedElements as readonly string[]).includes(tagName as string)) {
			domLogger.warn('Attempted to create disallowed element', {
				metadata: { tag: tagName }
			})
			return null
		}

		const element = document.createElement(tagName)

		// Set safe attributes
		if (options.attributes) {
			Object.entries(options.attributes).forEach(([key, value]) => {
				// Validate attribute names (no script-related attributes)
				if (/^(on|javascript:|data:)/i.test(key)) {
					domLogger.warn('Rejected unsafe element attribute', {
						metadata: { attribute: key, tag: tagName }
					})
					return
				}
				element.setAttribute(key, value)
			})
		}

		if (options.textContent) {
			element.textContent = options.textContent
		}

		if (options.className) {
			element.className = options.className
		}

		return element
	},

	/**
	 * Append child to document body with validation
	 */
	appendToBody(element: HTMLElement): void {
		if (typeof document === 'undefined') return
		if (!element) return

		document.body.appendChild(element)
	},

	/**
	 * Remove element from document body
	 */
	removeFromBody(element: HTMLElement): void {
		if (typeof document === 'undefined') return
		if (!element) return

		if (element.parentNode === document.body) {
			document.body.removeChild(element)
		}
	},

	/**
	 * Query selector with validation
	 */
	querySelector(selector: string): Element | null {
		if (typeof document === 'undefined') return null
		if (!selector) return null

		// Basic selector validation - prevent script injection
		if (/javascript:|<script|<iframe|<object|<embed/i.test(selector)) {
			domLogger.warn('Rejected unsafe selector', {
				metadata: { selector }
			})
			return null
		}

		try {
			return document.querySelector(selector)
		} catch {
			domLogger.warn('Invalid selector query', {
				metadata: { selector }
			})
			return null
		}
	},

	/**
	 * Query all with validation
	 */
	querySelectorAll(selector: string): NodeListOf<Element> | null {
		if (typeof document === 'undefined') return null
		if (!selector) return null

		// Basic selector validation
		if (/javascript:|<script|<iframe|<object|<embed/i.test(selector)) {
			domLogger.warn('Rejected unsafe selector', {
				metadata: { selector }
			})
			return null
		}

		try {
			return document.querySelectorAll(selector)
		} catch {
			domLogger.warn('Invalid selector query', {
				metadata: { selector }
			})
			return null
		}
	}
}

