/**
 * Integration Test Setup
 *
 * Sets up environment for integration tests that call real APIs
 * Uses REAL Supabase authentication with session persistence
 */

import { beforeAll, vi } from 'vitest'
import { createBrowserClient } from '@supabase/ssr'
import '@testing-library/jest-dom/vitest'

// Set Supabase environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://bshjmbshupiibfiewpxb.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
	'sb_publishable_YYaHlF11DF7tVIpF9-PVMQ_BynUAN8e'

// Set API base URL to local backend
process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:4600'

// Test credentials (must match E2E_TESTING_GUIDE.md)
const E2E_OWNER_EMAIL = 'rhudsontspr@gmail.com'
const E2E_OWNER_PASSWORD = 'COmmos@69%'

// Store the authenticated session in a way that mocks can properly access
const sessionStore = vi.hoisted(() => ({
	session: null as { access_token: string; expires_at?: number } | null,
	user: null as { id: string; email?: string } | null
}))

// Login to Supabase before all tests and store session
beforeAll(async () => {
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

	console.info('✅ Integration tests authenticated as:', data.user?.email)
	console.info('✅ Session access token:', data.session.access_token.substring(0, 20) + '...')
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
					throw new Error('Session not initialized - beforeAll may not have run')
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
