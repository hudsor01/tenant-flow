/**
 * Test Subscription Setup Utility
 *
 * Directly updates test user subscription status in the database using service role.
 * This is the recommended approach for integration tests per Supabase best practices.
 *
 * For production Stripe integration, use proper Stripe API calls.
 * For tests, we set the subscription_status directly to avoid Stripe API dependencies.
 */

import { createClient } from '@supabase/supabase-js'
import { createLogger } from '@repo/shared/lib/frontend-logger'

const logger = createLogger({ component: 'SetupTestSubscription' })

interface TestUser {
	email: string
	password: string
}

/**
 * Sets up test user with trial subscription status
 * Uses service role client to bypass RLS for test setup
 */
export async function setupTestUserWithTrial(user: TestUser): Promise<void> {
	const serviceRoleKey = process.env.SUPABASE_SECRET_KEY
	if (!serviceRoleKey) {
		throw new Error('SUPABASE_SECRET_KEY not found - required for test setup')
	}

	// Create admin client with service role
	const adminClient = createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		serviceRoleKey,
		{
			auth: {
				autoRefreshToken: false,
				persistSession: false
			}
		}
	)

	// Get user by email
	const { data: users, error: userError } = await adminClient
		.from('users')
		.select('id, email, subscription_status, stripeCustomerId')
		.eq('email', user.email)
		.limit(1)

	if (userError) {
		throw new Error(`Failed to fetch user ${user.email}: ${userError.message}`)
	}

	if (!users || users.length === 0) {
		throw new Error(`User ${user.email} not found in database`)
	}

	const userData = users[0]

	// Check if already set up
	if (
		userData.subscription_status === 'trialing' ||
		userData.subscription_status === 'active'
	) {
		logger.info('Test user already has subscription status', {
			metadata: {
				email: user.email,
				status: userData.subscription_status
			}
		})
		return
	}

	// Generate a test Stripe customer ID
	const testCustomerId = `cus_test_${userData.id.replace(/-/g, '').substring(0, 24)}`

	// Update user with trial subscription
	// Note: Using only fields that exist in the users table (subscriptionTier, subscription_status, stripeCustomerId)
	const { error: updateError } = await adminClient
		.from('users')
		.update({
			subscriptionTier: 'STARTER',
			subscription_status: 'trialing',
			stripeCustomerId: testCustomerId
		})
		.eq('id', userData.id)

	if (updateError) {
		throw new Error(
			`Failed to update user subscription: ${updateError.message}`
		)
	}

	logger.info('Set up trial subscription for test user', {
		metadata: { email: user.email }
	})
}

/**
 * Global test setup function
 * Sets up all test users with trial subscriptions
 */
export async function setupIntegrationTestUsers(): Promise<void> {
	if (process.env.RUN_INTEGRATION_TESTS !== 'true') {
		return
	}

	// Test users for integration tests - MUST be set via environment variables
	const requiredEnvVars = ['E2E_OWNER_EMAIL', 'E2E_OWNER_PASSWORD']
	const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName])

	if (missingEnvVars.length > 0) {
		throw new Error(
			`Missing required environment variables for subscription tests:\n  - ${missingEnvVars.join('\n  - ')}\n\nPlease set these variables before running integration tests.`
		)
	}

	const testUsers: TestUser[] = [
		{
			email: process.env.E2E_OWNER_EMAIL!,
			password: process.env.E2E_OWNER_PASSWORD!
		}
	]

	for (const user of testUsers) {
		try {
			await setupTestUserWithTrial(user)
		} catch (error) {
			logger.error(`Failed to set up test user ${user.email}`, {
				metadata: { error: error instanceof Error ? error.message : String(error) }
			})
			throw error
		}
	}
}
