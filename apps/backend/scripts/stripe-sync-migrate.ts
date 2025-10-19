#!/usr/bin/env tsx
/**
 * Stripe Sync Engine Migration Script
 *
 * Purpose: Run Stripe Sync Engine database migrations to create the stripe schema
 *
 * Usage:
 *   tsx scripts/stripe-sync-migrate.ts
 *
 * Requirements:
 *   - DATABASE_DIRECT_URL or DATABASE_URL environment variable
 *   - Run this BEFORE starting your backend application
 *   - Run this after dropping/recreating the stripe schema
 *
 * What this does:
 *   - Creates the stripe schema if it doesn't exist
 *   - Creates all Stripe entity tables (customers, subscriptions, prices, etc.)
 *   - Sets up proper indexes and relationships
 *   - Ensures schema is compatible with current Stripe API version
 *
 * Official Docs: https://supabase.com/blog/stripe-engine-as-sync-library
 */

import { runMigrations } from '@supabase/stripe-sync-engine'

async function main() {
	console.log('🔧 Starting Stripe Sync Engine migrations...\n')

	const databaseUrl =
		process.env.DATABASE_DIRECT_URL || process.env.DATABASE_URL

	if (!databaseUrl) {
		console.error(
			'❌ Error: DATABASE_DIRECT_URL or DATABASE_URL environment variable is required'
		)
		process.exit(1)
	}

	try {
		await runMigrations({
			databaseUrl,
			schema: 'stripe',
			logger: console
		})

		console.log('\n✅ Stripe Sync Engine migrations completed successfully!')
		console.log('ℹ️  The stripe schema and tables are now ready')
		console.log('ℹ️  You can now start your backend application')

		process.exit(0)
	} catch (error) {
		console.error('\n❌ Migration failed:', error)
		process.exit(1)
	}
}

main()
