/**
 * Global test setup for integration tests
 * This runs once before all integration tests
 */

import { setupIntegrationTestUsers } from './setup-test-subscription'
import { createLogger } from '@repo/shared/lib/frontend-logger'

const logger = createLogger({ component: 'IntegrationTestSetup' })

export async function setup() {
	if (process.env.RUN_INTEGRATION_TESTS !== 'true') {
		logger.info('Skipping integration test setup (RUN_INTEGRATION_TESTS != true)')
		return
	}

	logger.info('🔧 Setting up integration test environment...')

	try {
		// Ensure test users have valid subscriptions
		await setupIntegrationTestUsers()
		logger.info('✅ Integration test environment ready')
	} catch (error) {
		logger.error('❌ Failed to set up integration test environment', {
			metadata: { error: error instanceof Error ? error.message : String(error) }
		})
		throw error
	}
}
