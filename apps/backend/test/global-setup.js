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
	// The config schema expects SUPABASE_URL but Doppler provides NEXT_PUBLIC_SUPABASE_URL
	// Set SUPABASE_URL = NEXT_PUBLIC_SUPABASE_URL if not already set
	if (!process.env.SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL) {
		process.env.SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
		console.log(`✓ Global setup: Using NEXT_PUBLIC_SUPABASE_URL for SUPABASE_URL`)
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

	console.log(
		`✓ Jest global setup complete (SUPABASE_URL: ${process.env.SUPABASE_URL?.slice(0, 30)}...)`
	)
}
