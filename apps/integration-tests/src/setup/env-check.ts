interface EnvCheckResult {
	supabaseConfigured: boolean
	authConfigured: boolean
	stripeConfigured: boolean
	webhookConfigured: boolean
	missing: string[]
}

export function checkEnv(): EnvCheckResult {
	const supabaseVars = {
		NEXT_PUBLIC_SUPABASE_URL: process.env['NEXT_PUBLIC_SUPABASE_URL'],
		NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'],
	}

	const authVars = {
		E2E_OWNER_EMAIL: process.env['E2E_OWNER_EMAIL'],
		E2E_OWNER_PASSWORD: process.env['E2E_OWNER_PASSWORD'],
		E2E_OWNER_B_EMAIL: process.env['E2E_OWNER_B_EMAIL'],
		E2E_OWNER_B_PASSWORD: process.env['E2E_OWNER_B_PASSWORD'],
	}

	const stripeVars = {
		STRIPE_SECRET_KEY: process.env['STRIPE_SECRET_KEY'],
		SUPABASE_SECRET_KEY: process.env['SUPABASE_SECRET_KEY'],
	}

	const webhookVars = {
		STRIPE_WEBHOOK_SECRET: process.env['STRIPE_WEBHOOK_SECRET'],
	}

	const all = { ...supabaseVars, ...authVars, ...stripeVars, ...webhookVars }
	const missing = Object.entries(all)
		.filter(([, v]) => !v)
		.map(([k]) => k)

	return {
		supabaseConfigured: Object.values(supabaseVars).every(Boolean),
		authConfigured: Object.values(authVars).every(Boolean),
		stripeConfigured: Object.values(stripeVars).every(Boolean),
		webhookConfigured: Object.values(webhookVars).every(Boolean),
		missing,
	}
}
