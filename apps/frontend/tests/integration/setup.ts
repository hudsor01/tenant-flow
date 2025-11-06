/**
 * Global test setup for integration tests
 * This runs once before all integration tests
 */

import { setupIntegrationTestUsers } from './setup-test-subscription'

export async function setup() {
	console.log('🔧 Setting up integration test environment...')

	try {
		// Ensure test users have valid subscriptions
		await setupIntegrationTestUsers()
		console.log('✅ Integration test environment ready')
	} catch (error) {
		console.error('❌ Failed to set up integration test environment:', error)
		throw error
	}
}
