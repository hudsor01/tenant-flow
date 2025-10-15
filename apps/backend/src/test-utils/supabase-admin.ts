import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
	// Allow tests to import the module even if env not set; runtime will throw when used.
}

export function createAdminClient() {
	return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
}

export async function createTestUser(email: string, password: string) {
	const admin = createAdminClient()
	const res = await admin.auth.admin.createUser({
		email,
		password,
		email_confirm: true
	})
	return res.data.user
}

export async function deleteTestUser(userId: string) {
	const admin = createAdminClient()
	await admin.auth.admin.deleteUser(userId)
}
