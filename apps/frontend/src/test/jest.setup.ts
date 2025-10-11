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
