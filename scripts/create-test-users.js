import { createClient } from '@supabase/supabase-js'

async function createTestUsers() {
	// Safety guard for production
	if (process.env.NODE_ENV === 'production') {
		console.error('Error: This script cannot be run in production environment')
		process.exit(1)
	}

	// Validate environment variables
	const supabaseUrl = process.env.SUPABASE_URL
	const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY

	if (!supabaseUrl) {
		console.error('Error: SUPABASE_URL environment variable is required')
		process.exit(1)
	}

	if (!supabasePublishableKey) {
		console.error(
			'Error: SUPABASE_PUBLISHABLE_KEY environment variable is required'
		)
		process.exit(1)
	}

	// Use anon key for signUp (modern approach, no admin API needed)
	const supabase = createClient(supabaseUrl, supabasePublishableKey)

	// Test users with environment-configurable passwords
	// Note: These credentials are test-only and should not be used in production
	const testUsers = [
		{
			email: 'owner-a@test.tenantflow.local',
			password: process.env.TEST_USER_PASSWORD
		},
		{
			email: 'owner-b@test.tenantflow.local',
			password: process.env.TEST_USER_PASSWORD
		},
		{
			email: 'tenant-a@test.tenantflow.local',
			password: process.env.TEST_USER_PASSWORD
		},
		{
			email: 'tenant-b@test.tenantflow.local',
			password: process.env.TEST_USER_PASSWORD
		}
	]

	if (!testUsers[0].password) {
		console.error('Error: TEST_USER_PASSWORD environment variable is required')
		process.exit(1)
	}

	console.log('Creating test users via signUp (no admin API)...')
	for (const user of testUsers) {
		try {
			const { data, error } = await supabase.auth.signUp({
				email: user.email,
				password: user.password,
				options: {
					emailRedirectTo: undefined, // No email confirmation for test users
					data: {}
				}
			})
			if (error) {
				if (
					error.message.includes('already registered') ||
					error.message.includes('User already registered')
				) {
					console.log(`✅ ${user.email} already exists`)
				} else {
					console.error(`❌ Error creating ${user.email}:`, error.message)
				}
			} else {
				console.log(`✅ Created ${user.email} (ID: ${data.user?.id})`)
			}
		} catch (e) {
			console.error(`❌ Error creating ${user.email}:`, e.message)
		}
	}
}

createTestUsers()
