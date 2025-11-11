import { createClient } from '@supabase/supabase-js'
import { createLogger } from '@repo/shared/lib/frontend-logger'

const logger = createLogger({ component: 'CheckUsersScript' })

async function checkUsers() {
	// Validate environment variables
	const supabaseUrl = process.env.SUPABASE_URL
	const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY

	if (!supabaseUrl || !supabaseSecretKey) {
		logger.error('Missing Supabase admin credentials')
		process.exit(1)
	}

	const supabase = createClient(supabaseUrl, supabaseSecretKey)

	const { data, error } = await supabase.auth.admin.listUsers()
	if (error) {
		logger.error('Error fetching users', { metadata: { error: error.message } })
		process.exit(1)
	}
	logger.info('Total users loaded', {
		metadata: { count: data?.users?.length || 0 }
	})

	if (data?.users) {
		const testUsers = data.users.filter(user =>
			user.email?.includes('@test.tenantflow.local')
		)
		logger.info('Test users found', { metadata: { count: testUsers.length } })
		testUsers.forEach(user => logger.info('TenantFlow test user', { metadata: { email: user.email } }))
	}
}

checkUsers().catch(error => {
	logger.error('Unexpected error while checking users', {
		metadata: { error: error instanceof Error ? error.message : String(error) }
	})
	process.exit(1)
})
