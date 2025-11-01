/**
 * Vitest Setup File
 *
 * Runs before all tests to configure the test environment
 */

import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { createElement, type ReactNode } from 'react'

// Mock HEIC conversion library to avoid native browser dependencies during tests
vi.mock('heic2any', () => ({
	default: vi.fn(async ({ blob }) => blob)
}))

// Cleanup after each test
afterEach(() => {
	cleanup()
})

// Mock Next.js router
vi.mock('next/navigation', () => ({
	useRouter: () => ({
		push: vi.fn(),
		replace: vi.fn(),
		prefetch: vi.fn(),
		back: vi.fn(),
		pathname: '/',
		query: {},
		asPath: '/'
	}),
	useSearchParams: () => new URLSearchParams(),
	usePathname: () => '/',
	useParams: () => ({}),
	notFound: vi.fn()
}))

// Mock Next.js Image component
vi.mock('next/image', () => ({
	default: (props: Record<string, unknown>) => {
		return createElement('img', props)
	}
}))

// Mock Next.js Link component
vi.mock('next/link', () => ({
	default: ({ children, href, ...props }: { children: ReactNode; href: string; [key: string]: unknown }) => {
		return createElement('a', { href, ...props }, children)
	}
}))

// Mock environment variables
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:4600'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-key'

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: vi.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(), // deprecated
		removeListener: vi.fn(), // deprecated
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn()
	}))
})

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn()
})) as unknown as typeof IntersectionObserver

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn()
})) as unknown as typeof ResizeObserver

// Mock Web Worker (used by libraries like heic2any during tests)
if (typeof globalThis.Worker === 'undefined') {
	class MockWorker {
		onmessage: ((this: Worker, ev: MessageEvent) => unknown) | null = null
		onerror: ((this: Worker, ev: ErrorEvent) => unknown) | null = null

		 
		constructor() {}

		 
		postMessage(): void {}

		 
		terminate(): void {}

		 
		addEventListener(): void {}

		 
		removeEventListener(): void {}

		dispatchEvent(): boolean {
			return false
		}
	}

	;(globalThis as unknown as { Worker: typeof Worker }).Worker = MockWorker as unknown as typeof Worker
}

// Suppress console errors in tests (optional)
if (process.env.VITEST_SUPPRESS_CONSOLE) {
	global.console = {
		...console,
		error: vi.fn(),
		warn: vi.fn()
	}
}
