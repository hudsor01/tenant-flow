/**
 * Integration Test Setup
 *
 * Sets up environment for integration tests that call real APIs
 * Uses REAL Supabase authentication with session persistence
 */

import { beforeAll, vi } from 'vitest'
import { createBrowserClient } from '@supabase/ssr'

// Set Supabase environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://bshjmbshupiibfiewpxb.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
	'sb_publishable_YYaHlF11DF7tVIpF9-PVMQ_BynUAN8e'

// Set API base URL to local backend
process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:4600'

// Test credentials (must match E2E_TESTING_GUIDE.md)
const E2E_OWNER_EMAIL = 'rhudsontspr@gmail.com'
const E2E_OWNER_PASSWORD = 'COmmos@69%'

// Store the authenticated session globally
let globalSession: any = null
let globalUser: any = null

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

	// Store session globally
	globalSession = data.session
	globalUser = data.user

	console.log('✅ Integration tests authenticated as:', data.user?.email)
	console.log('✅ Session access token:', data.session.access_token.substring(0, 20) + '...')
})

// Mock the Supabase client to return our authenticated session
vi.mock('#lib/supabase/client', () => ({
	createClient: () => ({
		auth: {
			getSession: vi.fn().mockImplementation(async () => ({
				data: {
					session: globalSession
				},
				error: null
			})),
			getUser: vi.fn().mockImplementation(async () => ({
				data: {
					user: globalUser
				},
				error: null
			}))
		}
	})
}))
