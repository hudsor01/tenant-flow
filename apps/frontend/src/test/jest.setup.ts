/**
 * Jest setup file for frontend tests
 * Runs before each test file
 */

// Import testing library matchers
import '@testing-library/jest-dom'

// Mock Next.js environment
process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:3001'
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

// Suppress console errors in tests unless needed
const noop = () => undefined

global.console = {
	...console,
	error: noop,
	warn: noop
}

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: jest.fn().mockImplementation(query => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: jest.fn(),
		removeListener: jest.fn(),
		addEventListener: jest.fn(),
		removeEventListener: jest.fn(),
		dispatchEvent: jest.fn()
	}))
})

// Mock IntersectionObserver with proper interface
global.IntersectionObserver = class IntersectionObserver {
	readonly root: Element | null = null
	readonly rootMargin: string = ''
	readonly thresholds: ReadonlyArray<number> = []

	constructor() {}
	disconnect() {}
	observe() {}
	takeRecords(): IntersectionObserverEntry[] {
		return []
	}
	unobserve() {}
} as unknown as typeof IntersectionObserver

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
	constructor() {}
	disconnect() {}
	observe() {}
	unobserve() {}
} as unknown as typeof ResizeObserver

// Polyfill pointer capture methods used by some UI libraries (Radix)
if (typeof Element !== 'undefined' && !Element.prototype.hasPointerCapture) {
	// jsdom doesn't implement pointer capture - provide no-op implementations
	// to avoid runtime errors in tests that use pointer events.
	// These functions are safe no-ops for unit tests.

	// @ts-ignore - augmenting prototype for tests
	Element.prototype.hasPointerCapture = function (pointerId: number) {
		void pointerId
		return false
	}

	// @ts-ignore
	Element.prototype.setPointerCapture = function (pointerId: number) {
		void pointerId
		// no-op
	}

	// @ts-ignore
	Element.prototype.releasePointerCapture = function (pointerId: number) {
		void pointerId
		// no-op
	}
}

// Provide scrollIntoView no-op used by some UI libs (Radix, etc.)
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
	// @ts-ignore
	Element.prototype.scrollIntoView = function () {
		// no-op for jsdom environment
	}
}
