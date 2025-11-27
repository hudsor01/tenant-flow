import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SERVICE_ROLE = process.env.SERVICE_ROLE!

if (!SUPABASE_URL || !SERVICE_ROLE) {
	// Allow tests to import the module even if env not set; runtime will throw when used.
}

export function createAdminClient() {
	return createClient(SUPABASE_URL, SERVICE_ROLE)
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

export async function deleteTestUser(user_id: string) {
	const admin = createAdminClient()
	await admin.auth.admin.deleteUser(user_id)
}
