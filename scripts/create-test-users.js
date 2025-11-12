import { createClient } from '@supabase/supabase-js'
import { createLogger } from '@repo/shared/lib/frontend-logger'

const logger = createLogger({ component: 'CreateTestUsersScript' })

async function createTestUsers() {
	// Safety guard for production
	if (process.env.NODE_ENV === 'production') {
		logger.error('This script cannot be run in production environment')
		process.exit(1)
	}

	// Validate environment variables
	const supabaseUrl = process.env.SUPABASE_URL
	const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY

	if (!supabaseUrl || !supabasePublishableKey) {
		logger.error('Missing Supabase URL or publishable key')
		process.exit(1)
	}

	// Use publishable key for signUp (modern approach, no admin API needed)
	const supabase = createClient(supabaseUrl, supabasePublishableKey)

	// Validate TEST_USER_PASSWORD is provided
	const testUserPassword = process.env.TEST_USER_PASSWORD
	if (!testUserPassword) {
		logger.error('TEST_USER_PASSWORD environment variable is required')
		process.exit(1)
	}

	// Test users with environment-configurable passwords
	// Note: These credentials are test-only and should not be used in production
	const testUsers = [
		{
			email: 'owner-a@test.tenantflow.local',
			password: testUserPassword
		},
		{
			email: 'owner-b@test.tenantflow.local',
			password: testUserPassword
		},
		{
			email: 'tenant-a@test.tenantflow.local',
			password: testUserPassword
		},
		{
			email: 'tenant-b@test.tenantflow.local',
			password: testUserPassword
		}
	]

	logger.info('Creating test users via signUp (no admin API)...')
	let failureCount = 0
	for (const user of testUsers) {
		try {
			const { data, error } = await supabase.auth.signUp({
				email: user.email,
				password: user.password,
				options: {}
			})
			if (error) {
				if (
					error.message.includes('already registered') ||
					error.message.includes('User already registered')
				) {
					logger.info(` ${user.email} already exists`)
				} else {
					logger.error(` Error creating ${user.email}`, {
						metadata: { error: error.message }
					})
					failureCount++
				}
			} else {
				logger.info(` Created ${user.email} (ID: ${data.user?.id})`)
			}
		} catch (e) {
			logger.error(` Error creating ${user.email}`, {
				metadata: { error: e instanceof Error ? e.message : String(e) }
			})
			failureCount++
		}
	}

	if (failureCount > 0) {
		logger.error(`Failed to create ${failureCount} user(s)`)
		process.exit(1)
	} else {
		logger.info(' All test users created or already exist')
	}
}

createTestUsers().catch(error => {
	logger.error('Unexpected failure while creating test users', {
		metadata: { error: error instanceof Error ? error.message : String(error) }
	})
	process.exit(1)
})
