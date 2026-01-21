/**
 * Jest Global Teardown for Stripe Test Fixtures
 *
 * This file is registered in jest.config.ts as globalTeardown.
 * It ensures all Stripe test resources are cleaned up after tests complete,
 * even if tests fail.
 */

import { StripeTestFixtures } from './fixtures/stripe-test-fixtures'

/**
 * Global teardown function called by Jest after all tests complete.
 * Cleans up all Stripe resources created during the test run.
 */
export default async function globalTeardown(): Promise<void> {
	// Only attempt cleanup if Stripe is configured
	const secretKey = process.env.STRIPE_SECRET_KEY
	if (!secretKey || !secretKey.startsWith('sk_test_')) {
		return
	}

	const normalized = secretKey.toLowerCase()
	if (
		normalized.includes('mock') ||
		normalized.includes('placeholder') ||
		normalized.includes('not_real')
	) {
		return
	}

	try {
		const fixtures = StripeTestFixtures.getInstance()
		const stats = fixtures.getStats()

		// Calculate total resources to clean
		const totalResources = Object.values(stats).reduce(
			(sum, count) => sum + count,
			0
		)

		if (totalResources === 0) {
			return
		}

		console.log('\n🧹 Cleaning up Stripe test resources...')
		console.log(`   Resources to clean: ${totalResources}`)

		const { deleted, errors } = await fixtures.cleanup()

		console.log(`   ✅ Deleted: ${deleted}`)

		if (errors > 0) {
			console.log(`   ⚠️  Errors: ${errors} (resources may not exist)`)
		}

		console.log('   Stripe cleanup complete.\n')
	} catch (error) {
		// Don't fail test run due to cleanup errors
		console.error(
			'⚠️  Stripe cleanup error (non-fatal):',
			error instanceof Error ? error.message : error
		)
	}
}
