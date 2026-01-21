/**
 * Jest Global Setup - Runs BEFORE any test files are loaded
 *
 * This file configures environment variables that are needed by NestJS
 * during module initialization. It runs before any TypeScript files are
 * compiled or loaded.
 *
 * CRITICAL: This must be a .js file (not .ts) because it runs before
 * ts-jest compilation.
 */

module.exports = async () => {
	// CRITICAL FIX: Ensure SUPABASE_URL is set for config validation
	// The config schema expects SUPABASE_URL
	// Set SUPABASE_URL = NEXT_PUBLIC_SUPABASE_URL if not already set
	if (!process.env.SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL) {
		process.env.SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
		console.log(
			`✓ Global setup: Using NEXT_PUBLIC_SUPABASE_URL for SUPABASE_URL`
		)
	}

	// Similarly, ensure SUPABASE_PUBLISHABLE_KEY is set
	if (
		!process.env.SUPABASE_PUBLISHABLE_KEY &&
		process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
	) {
		process.env.SUPABASE_PUBLISHABLE_KEY =
			process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
		console.log(
			`✓ Global setup: Using NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY for SUPABASE_PUBLISHABLE_KEY`
		)
	}

	// Ensure SUPABASE_SERVICE_ROLE_KEY is set
	if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
		const fallbackServiceKey =
			process.env.SB_SECRET_KEY ||
			process.env.SECRET_KEY_SUPABASE ||
			process.env.SUPABASE_SECRET_KEY

		if (fallbackServiceKey) {
			process.env.SUPABASE_SERVICE_ROLE_KEY = fallbackServiceKey
			console.log(
				`✓ Global setup: Using fallback secret key for SUPABASE_SERVICE_ROLE_KEY`
			)
		}
	}

	// Set default test values for required config variables if not already set
	// This handles CI environments that don't have real secrets
	const requiredTestVars = {
		SUPABASE_URL: 'http://127.0.0.1:54321',
		SUPABASE_PUBLISHABLE_KEY: 'test-publishable-key',
		NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
		DATABASE_URL: 'postgresql://test:test@localhost:5432/test_db',
		JWT_SECRET: 'test_jwt_secret_min_32_characters_long_for_testing_only',
		SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_test_key_for_unit_tests_not_real',
		STRIPE_SECRET_KEY: 'sk_test_mock_stripe_key_for_testing_not_real',
		STRIPE_WEBHOOK_SECRET: 'whsec_test_webhook_secret_for_testing',
		SUPPORT_EMAIL: 'support@test.local',
		RESEND_API_KEY: 're_test_mock_resend_api_key_for_testing',
		IDEMPOTENCY_KEY_SECRET:
			'test_idempotency_secret_min_32_chars_long_for_testing'
	}

	for (const [key, value] of Object.entries(requiredTestVars)) {
		if (!process.env[key]) {
			process.env[key] = value
		}
	}

	console.log(
		`✓ Jest global setup complete (SUPABASE_URL: ${process.env.SUPABASE_URL?.slice(0, 30)}...)`
	)
}
