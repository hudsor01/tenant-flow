import { createClient } from '@supabase/supabase-js'
import { createLogger } from '@repo/shared/lib/frontend-logger'

const logger = createLogger({ component: 'CheckTestUsersScript' })

async function checkTestUsers() {
	// Validate environment variables
	const supabaseUrl = process.env.SUPABASE_URL
	const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY

	if (!supabaseUrl || !supabaseSecretKey) {
		logger.error('Missing Supabase admin credentials')
		process.exit(1)
	}

	const supabase = createClient(supabaseUrl, supabaseSecretKey)

	const testEmails = [
		'owner-a@test.tenantflow.local',
		'owner-b@test.tenantflow.local',
		'tenant-a@test.tenantflow.local',
		'tenant-b@test.tenantflow.local'
	]

	logger.info('Checking test users...')
	try {
		const { data, error } = await supabase.auth.admin.listUsers()
		if (error) {
			logger.error('Error listing users', { metadata: { error: error.message } })
			return
		}

		for (const email of testEmails) {
			const user = data.users.find(u => u.email === email)
			logger.info(`${email}: ${user ? 'EXISTS' : 'MISSING'}`)
		}
	} catch (e) {
		logger.error('Failed to verify test users', {
			metadata: { error: e instanceof Error ? e.message : String(e) }
		})
	}
}

checkTestUsers().catch(error => {
	logger.error('Unexpected failure while checking test users', {
		metadata: { error: error instanceof Error ? error.message : String(error) }
	})
	process.exit(1)
})
