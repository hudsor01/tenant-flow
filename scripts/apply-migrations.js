import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

async function applyMigrations() {
	// Validate environment variables
	const supabaseUrl = process.env.SUPABASE_URL
	const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY

	if (!supabaseUrl) {
		console.error('Error: SUPABASE_URL environment variable is required')
		process.exit(1)
	}

	if (!supabaseSecretKey) {
		console.error('Error: SUPABASE_SECRET_KEY environment variable is required')
		process.exit(1)
	}

	const supabase = createClient(supabaseUrl, supabaseSecretKey)

	// Read and apply RLS migrations
	const migrations = [
		'20251105142400_add_rent_payment_rls.sql',
		'20251105142401_add_tenant_payment_method_rls.sql',
		'20251105142402_add_notification_preferences_rls.sql'
	]

	for (const migration of migrations) {
		console.log(`Applying ${migration}...`)
		const sql = readFileSync(join('supabase', 'migrations', migration), 'utf8')

		const { error } = await supabase.rpc('exec_sql', { sql })
		if (error) {
			console.error(`Error applying ${migration}:`, error)
		} else {
			console.log(`✅ Applied ${migration}`)
		}
	}
}

applyMigrations().catch(console.error)
