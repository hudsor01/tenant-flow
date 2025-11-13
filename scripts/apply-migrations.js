import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'
import { createLogger } from '@repo/shared/lib/frontend-logger'

const logger = createLogger({ component: 'ApplyMigrationsScript' })

async function applyMigrations() {
	// Validate environment variables
	const supabaseUrl = process.env.SUPABASE_URL
	const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY

	if (!supabaseUrl || !supabaseSecretKey) {
		logger.error('Missing Supabase configuration', {
			metadata: {
				hasUrl: Boolean(supabaseUrl),
				hasSecret: Boolean(supabaseSecretKey)
			}
		})
		process.exit(1)
	}

	const supabase = createClient(supabaseUrl, supabaseSecretKey)

	// Read and apply RLS migrations
	const migrations = [
		'20251105142400_add_rent_payment_rls.sql',
		'20251105142401_add_tenant_payment_method_rls.sql',
		'20251105142402_add_notification_preferences_rls.sql',
		'20251113101000_add_lease_rls_policies.sql'
	]

	for (const migration of migrations) {
		logger.info(`Applying ${migration}...`)
		const sql = readFileSync(join('supabase', 'migrations', migration), 'utf8')

		const { error } = await supabase.rpc('exec_sql', { sql })
		if (error) {
			logger.error(`Failed to apply ${migration}`, {
				metadata: { error: error.message }
			})
		} else {
			logger.info(` Applied ${migration}`)
		}
	}
}

applyMigrations().catch(error => {
	logger.error('Migration script failed', {
		metadata: {
			error: error instanceof Error ? error.message : String(error)
		}
	})
	process.exit(1)
})
