/**
 * Unit Test Setup
 *
 * Minimal setup for unit tests - no MSW or integration features.
 * Used for component tests, store tests, and pure utility tests.
 */

import { vi, afterEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { configure } from '@testing-library/react'

// Configure React Testing Library for better async handling
configure({
	// Increase default async timeout for property-based tests
	asyncUtilTimeout: 5000
})

// Skip @t3-oss/env-nextjs validation in tests
// This must be set BEFORE any env.ts imports
process.env.SKIP_ENV_VALIDATION = 'true'

// Set up required environment variables for tests
process.env.NEXT_PUBLIC_APP_URL =
	process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
process.env.NEXT_PUBLIC_API_BASE_URL =
	process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4600'
process.env.NEXT_PUBLIC_SUPABASE_URL =
	process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
	process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'mock-key'
process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY =
	process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_mock'
process.env.NEXT_PUBLIC_JWT_ALGORITHM =
	process.env.NEXT_PUBLIC_JWT_ALGORITHM || 'ES256'

// Additional environment variables for server-side validation (optional in tests)
process.env.STRIPE_STARTER_MONTHLY_PRICE_ID =
	process.env.STRIPE_STARTER_MONTHLY_PRICE_ID || 'price_starter_monthly'
process.env.STRIPE_STARTER_ANNUAL_PRICE_ID =
	process.env.STRIPE_STARTER_ANNUAL_PRICE_ID || 'price_starter_annual'
process.env.STRIPE_GROWTH_MONTHLY_PRICE_ID =
	process.env.STRIPE_GROWTH_MONTHLY_PRICE_ID || 'price_growth_monthly'
process.env.STRIPE_GROWTH_ANNUAL_PRICE_ID =
	process.env.STRIPE_GROWTH_ANNUAL_PRICE_ID || 'price_growth_annual'
process.env.STRIPE_MAX_MONTHLY_PRICE_ID =
	process.env.STRIPE_MAX_MONTHLY_PRICE_ID || 'price_max_monthly'
process.env.STRIPE_MAX_ANNUAL_PRICE_ID =
	process.env.STRIPE_MAX_ANNUAL_PRICE_ID || 'price_max_annual'

// Mark as unit test mode
process.env.SKIP_INTEGRATION_TESTS = 'true'

// Mock CSS custom properties for theme layer testing
const mockCSSVariables = `
	:root {
		--spacing-1: 0.25rem;
		--spacing-4: 1rem;
		--color-primary: oklch(0.54 0.23 257);
		--color-foreground: oklch(0.2 0.02 245);
		--color-background: oklch(0.985 0.002 240);
		--color-ring: oklch(0.5 0.2 257);
		--focus-ring-width: 2px;
		--focus-ring-color: oklch(0.5 0.2 257);
		--layout-container-padding-x: clamp(1.5rem, 4vw, 3rem);
	}
`

// Inject mock CSS variables into document head
const style = document.createElement('style')
style.textContent = mockCSSVariables
document.head.appendChild(style)

// Mock window.matchMedia for components that use media queries (BlurFade, etc.)
Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: vi.fn().mockImplementation((query: string) => ({
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

// Mock ResizeObserver for components that use it
class ResizeObserverMock {
	observe = vi.fn()
	unobserve = vi.fn()
	disconnect = vi.fn()
}
Object.defineProperty(window, 'ResizeObserver', {
	writable: true,
	value: ResizeObserverMock
})

// Mock IntersectionObserver for components that use it (blur-fade, lazy loading, etc.)
class IntersectionObserverMock implements IntersectionObserver {
	readonly root: Element | null = null
	readonly rootMargin: string = ''
	readonly thresholds: ReadonlyArray<number> = []

	constructor(
		private callback: IntersectionObserverCallback,
		_options?: IntersectionObserverInit
	) {}

	observe = vi.fn((target: Element) => {
		// Immediately trigger the callback with isIntersecting: true
		// This ensures components render as if they're in view
		this.callback(
			[
				{
					target,
					isIntersecting: true,
					intersectionRatio: 1,
					boundingClientRect: target.getBoundingClientRect(),
					intersectionRect: target.getBoundingClientRect(),
					rootBounds: null,
					time: Date.now()
				}
			] as IntersectionObserverEntry[],
			this
		)
	})
	unobserve = vi.fn()
	disconnect = vi.fn()
	takeRecords = vi.fn(() => [])
}
Object.defineProperty(window, 'IntersectionObserver', {
	writable: true,
	value: IntersectionObserverMock
})

// Mock Next.js router hooks (needed for component rendering)
vi.mock('next/navigation', () => ({
	useRouter: () => ({
		push: vi.fn(),
		replace: vi.fn(),
		prefetch: vi.fn(),
		back: vi.fn(),
		forward: vi.fn(),
		refresh: vi.fn()
	}),
	usePathname: () => '/',
	useSearchParams: () => new URLSearchParams(),
	useParams: () => ({})
}))

// Mock nuqs hooks to avoid Next.js app router dependency in tests
// Returns test-friendly values without requiring Next.js app router context
vi.mock('nuqs', async () => {
	const actual = await vi.importActual<typeof import('nuqs')>('nuqs')
	return {
		...actual,
		useQueryState: () => [null, vi.fn()],
		useQueryStates: (keys: Record<string, unknown>) => {
			const state = Object.keys(keys).reduce(
				(acc, key) => ({ ...acc, [key]: null }),
				{}
			)
			return [state, vi.fn()]
		}
	}
})

/**
 * Create a mock fetch Response with proper text() and json() methods
 * Required because apiRequest uses res.text() not res.json()
 */
export function createMockResponse<T>(
	data: T,
	ok = true,
	status = 200
): Response {
	const body = JSON.stringify(data)
	return {
		ok,
		status,
		statusText: ok ? 'OK' : 'Error',
		headers: new Headers({ 'Content-Type': 'application/json' }),
		text: () => Promise.resolve(body),
		json: () => Promise.resolve(data),
		clone: function () {
			return createMockResponse(data, ok, status)
		},
		body: null,
		bodyUsed: false,
		arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
		blob: () => Promise.resolve(new Blob()),
		formData: () => Promise.resolve(new FormData()),
		redirected: false,
		type: 'basic' as ResponseType,
		url: ''
	} as Response
}

/**
 * Global cleanup after each test.
 * Ensures React Testing Library cleans up properly.
 * Individual tests can call cleanup() manually if needed for iteration.
 */
afterEach(() => {
	cleanup()
})
