/**
 * Integration Test Setup
 *
 * Sets up environment for integration tests that call real APIs
 * Uses REAL Supabase authentication with session persistence
 */

import { beforeAll, vi } from 'vitest'
import { createBrowserClient } from '@supabase/ssr'
import '@testing-library/jest-dom/vitest'
import { createLogger } from '@repo/shared/lib/frontend-logger'

// Create logger instance for structured logging
const logger = createLogger({ component: 'TestSetup' })

// SECURITY: Load all credentials from environment variables
// Never hardcode secrets in source code!
// See E2E_TESTING_GUIDE.md for setup instructions

// Check if we're running unit tests or integration tests
// Integration tests run via vitest.integration.config.js
const isIntegrationTest = process.env.VITEST_INTEGRATION === 'true'

// Validate required environment variables only for integration tests
if (isIntegrationTest) {
	const requiredEnvVars = [
		'NEXT_PUBLIC_SUPABASE_URL',
		'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
		'E2E_OWNER_EMAIL',
		'E2E_OWNER_PASSWORD'
	] as const

	for (const envVar of requiredEnvVars) {
		if (!process.env[envVar]) {
			throw new Error(
				`Missing required environment variable: ${envVar}
` +
					`Please create a .env.test.local file with test credentials.
` +
					`See E2E_TESTING_GUIDE.md for setup instructions.`
			)
		}
	}
} else {
	// For unit tests, provide mock environment variables
	process.env.NEXT_PUBLIC_SUPABASE_URL =
		process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
	process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
		process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'mock-key'
}

// Set API base URL to local backend (defaults to localhost:4600)
process.env.NEXT_PUBLIC_API_BASE_URL =
	process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4600'

// Test credentials loaded from environment (for integration tests)
const E2E_OWNER_EMAIL = process.env.E2E_OWNER_EMAIL || 'test@example.com'
const E2E_OWNER_PASSWORD = process.env.E2E_OWNER_PASSWORD || 'test-password'

// Store the authenticated session in a way that mocks can properly access
const sessionStore = vi.hoisted(() => ({
	session: null as { access_token: string; expires_at?: number } | null,
	user: null as { id: string; email?: string } | null,
	backendAvailable: false
}))

// Check if backend is available before running integration tests
beforeAll(async () => {
	try {
		const controller = new AbortController()
		const timeoutId = setTimeout(() => controller.abort(), 5000)

		const response = await fetch('http://localhost:4600/health', {
			signal: controller.signal
		})
		clearTimeout(timeoutId)

		if (!response.ok) {
			throw new Error('Backend health check failed')
		}

		// Backend is available, proceed with authentication
		sessionStore.backendAvailable = true

		const supabase = createBrowserClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL!,
			process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
		)

		// Sign in with test credentials
		const { data, error } = await supabase.auth.signInWithPassword({
			email: E2E_OWNER_EMAIL,
			password: E2E_OWNER_PASSWORD
		})

		if (error) {
			throw new Error(
				`Failed to authenticate for integration tests: ${error.message}`
			)
		}

		if (!data.session) {
			throw new Error('No session returned from Supabase auth')
		}

		// Store session in hoisted store
		sessionStore.session = data.session
		sessionStore.user = data.user

		// SECURITY: Do not log PII (email) or token details
		logger.info('Integration tests authenticated', {
			userId: data.user?.id
		})
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown error'
		logger.warn('Backend not available, integration tests will be skipped', {
			error: errorMessage
		})
		sessionStore.backendAvailable = false
		// Don't throw - let individual tests check backendAvailable flag
	}
})

// Mock Next.js router hooks
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

// Mock the Supabase client to return our authenticated session
vi.mock('#lib/supabase/client', () => ({
	createClient: () => ({
		auth: {
			getSession: vi.fn().mockImplementation(async () => {
				if (!sessionStore.session) {
					throw new Error(
						'Session not initialized - beforeAll may not have run'
					)
				}
				return {
					data: {
						session: sessionStore.session
					},
					error: null
				}
			}),
			getUser: vi.fn().mockImplementation(async () => {
				if (!sessionStore.user) {
					throw new Error('User not initialized - beforeAll may not have run')
				}
				return {
					data: {
						user: sessionStore.user
					},
					error: null
				}
			})
		}
	})
}))

// Export sessionStore for tests to check backend availability
export { sessionStore }
