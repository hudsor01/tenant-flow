/**
 * DOM Sanitization Utilities
 * Provides secure DOM manipulation methods to replace direct document access
 *
 * SECURITY: All DOM operations are validated and sanitized
 * COMPATIBILITY: Server-side rendering safe
 */

// This file centralizes safe DOM utilities to avoid direct document access elsewhere.

import { createLogger } from '@repo/shared/lib/frontend-logger'

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

/**
 * Safe class manipulation for document.documentElement
 */
export const safeDocumentElement = {
	getElement(): HTMLElement | null {
		if (typeof document === 'undefined') return null
		return document.documentElement
	},

	/**
	 * Add class to document element with validation
	 */
	addClass(className: string) {
		if (typeof document === 'undefined' || !className) return

		// Validate class name
		const sanitizedClassName = className.replace(/[^a-zA-Z0-9-_]/g, '')
		if (!sanitizedClassName) return

		document.documentElement.classList.add(sanitizedClassName)
	},

	/**
	 * Remove class from document element
	 */
	removeClass(className: string) {
		if (typeof document === 'undefined' || !className) return

		const sanitizedClassName = className.replace(/[^a-zA-Z0-9-_]/g, '')
		if (!sanitizedClassName) return

		document.documentElement.classList.remove(sanitizedClassName)
	},

	/**
	 * Set attribute on document element with validation
	 */
	setAttribute(name: string, value: string) {
		if (typeof document === 'undefined' || !name || !value) return

		// Validate attribute names
		const sanitizedName = name.replace(/[^a-zA-Z0-9-_]/g, '')
		if (!sanitizedName || /^on|javascript:/i.test(name)) {
			domLogger.warn('Rejected unsafe document element attribute', {
				metadata: { attribute: name }
			})
			return
		}

		document.documentElement.setAttribute(sanitizedName, value)
	},

	/**
	 * Get computed style safely
	 */
	getComputedStyle(): CSSStyleDeclaration | null {
		if (typeof window === 'undefined' || typeof document === 'undefined')
			return null

		try {
			return window.getComputedStyle(document.documentElement)
		} catch {
			domLogger.warn('Failed to read computed styles from documentElement')
			return null
		}
	}
}

/**
 * Safe script loading with validation
 */
export const safeScript = {
	/**
	 * Load external script with security validation
	 */
	async load(
		src: string,
		options: {
			async?: boolean
			defer?: boolean
			integrity?: string
			crossOrigin?: 'anonymous' | 'use-credentials'
		} = {}
	): Promise<boolean> {
		if (typeof document === 'undefined') return false
		if (!src) return false

		// Validate script source - only allow HTTPS and known trusted domains
		const allowedDomains = [
			'js.stripe.com',
			'cdn.jsdelivr.net',
			'unpkg.com',
			'cdnjs.cloudflare.com'
		]

		let isAllowed = false
		try {
			const url = new URL(src)

			// Must be HTTPS
			if (url.protocol !== 'https:') {
				domLogger.warn('Blocked non-HTTPS script source', {
					metadata: { src }
				})
				return false
			}

			// Check against allowed domains
			isAllowed = allowedDomains.some(domain => url.hostname === domain)

			if (!isAllowed) {
				domLogger.warn('Blocked script from disallowed domain', {
					metadata: { host: url.hostname, src }
				})
				return false
			}
		} catch {
			domLogger.warn('Invalid script URL', {
				metadata: { src }
			})
			return false
		}

		// Check if script already exists
		const existing = document.querySelector(`script[src="${src}"]`)
		if (existing) {
			return true
		}

		return new Promise<boolean>(resolve => {
			const script = document.createElement('script')
			script.src = src
			script.async = options.async ?? true
			script.defer = options.defer ?? false

			if (options.integrity) {
				script.integrity = options.integrity
			}

			if (options.crossOrigin) {
				script.crossOrigin = options.crossOrigin
			}

			script.onload = () => resolve(true)
			script.onerror = () => {
				domLogger.error('Failed to load script', {
					metadata: { src }
				})
				resolve(false)
			}

			document.head.appendChild(script)
		})
	}
}

/**
 * Safe event handling for document
 */
export const safeDocumentEvents = {
	/**
	 * Add event listener with validation
	 */
	addEventListener<K extends keyof DocumentEventMap>(
		type: K,
		listener: (this: Document, ev: DocumentEventMap[K]) => void,
		options?: boolean | AddEventListenerOptions
	) {
		if (typeof document === 'undefined') return

		// Whitelist allowed event types
		const allowedEvents = [
			'click',
			'keydown',
			'keyup',
			'scroll',
			'resize',
			'visibilitychange',
			'DOMContentLoaded',
			'load',
			'beforeunload',
			'unload',
			'focus',
			'blur',
			'mouseover',
			'mouseout',
			'touchstart',
			'touchend'
		]

		if (!allowedEvents.includes(type as string)) {
			domLogger.warn('Rejected unsafe document event type', {
				metadata: { type }
			})
			return
		}

		document.addEventListener(type, listener, options)
	},

	/**
	 * Remove event listener
	 */
	removeEventListener<K extends keyof DocumentEventMap>(
		type: K,
		listener: (this: Document, ev: DocumentEventMap[K]) => void,
		options?: boolean | EventListenerOptions
	) {
		if (typeof document === 'undefined') return

		document.removeEventListener(type, listener, options)
	}
}
