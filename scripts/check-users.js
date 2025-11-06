import { createClient } from '@supabase/supabase-js'

async function checkUsers() {
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

	const { data, error } = await supabase.auth.admin.listUsers()
	console.log('Total users:', data?.users?.length || 0)
	console.log('Error:', error?.message)

	if (data?.users) {
		const testUsers = data.users.filter(user =>
			user.email?.includes('@test.tenantflow.local')
		)
		console.log('Test users found:', testUsers.length)
		testUsers.forEach(user => console.log(' -', user.email))
	}
}

checkUsers().catch(console.error)
