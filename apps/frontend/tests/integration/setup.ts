/**
 * Global test setup for integration tests
 * This runs once BEFORE all integration tests (in main process)
 *
 * Authenticates with Supabase and stores session tokens in a temp file
 * so each test file's VM can restore the session.
 *
 * Uses MSW to mock backend API responses - no running backend required.
 */

import { createClient } from '@supabase/supabase-js'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import type { Database } from '@repo/shared/types/supabase'
import { writeFileSync, unlinkSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const logger = createLogger({ component: 'IntegrationTestSetup' })

// Temp file to store session tokens (shared between global setup and test files)
const SESSION_FILE = join(process.cwd(), '.vitest-session.json')

export async function setup() {
	if (process.env.RUN_INTEGRATION_TESTS !== 'true') {
		logger.info('Skipping integration test setup (RUN_INTEGRATION_TESTS != true)')
		return
	}

	logger.info('Starting integration test global setup with MSW...')

	// Note: Backend health check removed - using MSW for API mocking

	// Get test credentials
	const e2eOwnerEmail = process.env.E2E_OWNER_EMAIL
	const e2eOwnerPassword = process.env.E2E_OWNER_PASSWORD
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
	const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

	if (!e2eOwnerEmail || !e2eOwnerPassword) {
		throw new Error('Missing E2E_OWNER_EMAIL and/or E2E_OWNER_PASSWORD')
	}

	if (!supabaseUrl || !supabaseKey) {
		throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
	}

	// Authenticate with Supabase
	// Use standard createClient (not SSR) since we're in Node context
	const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
		auth: {
			persistSession: false,
			autoRefreshToken: false
		}
	})

	const { data, error } = await supabase.auth.signInWithPassword({
		email: e2eOwnerEmail,
		password: e2eOwnerPassword
	})

	if (error) {
		throw new Error(`Failed to authenticate: ${error.message}`)
	}

	if (!data.session) {
		throw new Error('No session returned from Supabase auth')
	}

	// Write session tokens to temp file for test files to read
	writeFileSync(
		SESSION_FILE,
		JSON.stringify({
			access_token: data.session.access_token,
			refresh_token: data.session.refresh_token
		}),
		'utf-8'
	)

	logger.info('Integration test global setup complete', { user_id: data.user?.id })
}

export async function teardown() {
	// Clean up temp session file
	if (existsSync(SESSION_FILE)) {
		unlinkSync(SESSION_FILE)
	}

	logger.info('Integration test global teardown complete')
}
