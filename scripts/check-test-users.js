import { createClient } from '@supabase/supabase-js'

async function checkTestUsers() {
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

	const testEmails = [
		'owner-a@test.tenantflow.local',
		'owner-b@test.tenantflow.local',
		'tenant-a@test.tenantflow.local',
		'tenant-b@test.tenantflow.local'
	]

	console.log('Checking test users...')
	try {
		const { data, error } = await supabase.auth.admin.listUsers()
		if (error) {
			console.error('Error listing users:', error)
			return
		}

		for (const email of testEmails) {
			const user = data.users.find(u => u.email === email)
			console.log(`${email}: ${user ? 'EXISTS' : 'MISSING'}`)
		}
	} catch (e) {
		console.error('Error:', e.message)
	}
}

checkTestUsers()
