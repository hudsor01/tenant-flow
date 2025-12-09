/**
 * Integration Test Setup
 *
 * Sets up environment for integration tests with MSW mocking
 * Uses REAL Supabase authentication - no mocking of the Supabase client
 * Uses MSW to mock backend API responses
 *
 * The global setup (tests/integration/setup.ts) authenticates once and stores
 * session tokens in a temp file. This file restores those tokens in each test
 * file's VM context.
 */

import { beforeAll, afterAll, afterEach, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { createClient } from '#utils/supabase/client'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { server } from '../../tests/integration/mocks/server'

// Set up required environment variables for tests
process.env.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
process.env.NEXT_PUBLIC_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4600'
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'mock-key'
process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_mock'
process.env.NEXT_PUBLIC_JWT_ALGORITHM = process.env.NEXT_PUBLIC_JWT_ALGORITHM || 'ES256'

// Additional environment variables for server-side validation (optional in tests)
process.env.STRIPE_STARTER_MONTHLY_PRICE_ID = process.env.STRIPE_STARTER_MONTHLY_PRICE_ID || 'price_starter_monthly'
process.env.STRIPE_STARTER_ANNUAL_PRICE_ID = process.env.STRIPE_STARTER_ANNUAL_PRICE_ID || 'price_starter_annual'
process.env.STRIPE_GROWTH_MONTHLY_PRICE_ID = process.env.STRIPE_GROWTH_MONTHLY_PRICE_ID || 'price_growth_monthly'
process.env.STRIPE_GROWTH_ANNUAL_PRICE_ID = process.env.STRIPE_GROWTH_ANNUAL_PRICE_ID || 'price_growth_annual'
process.env.STRIPE_MAX_MONTHLY_PRICE_ID = process.env.STRIPE_MAX_MONTHLY_PRICE_ID || 'price_max_monthly'
process.env.STRIPE_MAX_ANNUAL_PRICE_ID = process.env.STRIPE_MAX_ANNUAL_PRICE_ID || 'price_max_annual'

const logger = createLogger({ component: 'TestSetup' })

// Check if we're running integration tests
const isIntegrationTest = process.env.RUN_INTEGRATION_TESTS === 'true'

// Temp file path (must match global setup)
const SESSION_FILE = join(process.cwd(), '.vitest-session.json')

// Track test state
export const testState = {
	backendAvailable: false,
	authenticated: false
}

// Global setup for integration tests
beforeAll(async () => {
	if (!isIntegrationTest) {
		testState.backendAvailable = false
		process.env.SKIP_INTEGRATION_TESTS = 'true'
		return
	}

	// Read session tokens from temp file created by global setup
	if (!existsSync(SESSION_FILE)) {
		logger.warn('No session file from global setup - skipping integration tests')
		process.env.SKIP_INTEGRATION_TESTS = 'true'
		return
	}

	try {
		const sessionData = JSON.parse(readFileSync(SESSION_FILE, 'utf-8'))
		const { access_token, refresh_token } = sessionData

		if (!access_token || !refresh_token) {
			throw new Error('Invalid session data in temp file')
		}

		// Get the singleton Supabase client
		const supabase = createClient()

		// Restore the session from tokens stored in temp file
		const { data, error } = await supabase.auth.setSession({
			access_token,
			refresh_token
		})

		if (error) {
			throw new Error(`Failed to restore session: ${error.message}`)
		}

		if (!data.session) {
			throw new Error('No session after restoring tokens')
		}

		testState.backendAvailable = true
		testState.authenticated = true
		process.env.SKIP_INTEGRATION_TESTS = 'false'
		logger.info('Integration test session restored', { user_id: data.user?.id || 'unknown' })
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error'
		logger.warn('Integration test setup failed', { error: errorMessage })
		testState.backendAvailable = false
		process.env.SKIP_INTEGRATION_TESTS = 'true'
	}
})

// Mock Next.js router hooks (still needed for component rendering)
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

// MSW server lifecycle - mock backend API responses
beforeAll(() => {
	server.listen({ onUnhandledRequest: 'bypass' })
})

afterEach(() => {
	server.resetHandlers()
})

afterAll(() => {
	server.close()
})
