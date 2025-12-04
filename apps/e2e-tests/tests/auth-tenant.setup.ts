import { test as setup } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'
import { createLogger } from '@repo/shared/lib/frontend-logger'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const authFile = path.join(__dirname, '../playwright/.auth/tenant.json')
const logger = createLogger({ component: 'AuthTenantSetup' })

/**
 * API-based authentication setup for tenant tests
 *
 * This implementation follows Playwright best practices for authentication:
 * @see https://playwright.dev/docs/auth#api-based-authentication
 *
 * Benefits over UI-based login:
 * - 10x faster: ~500ms vs 6-16s
 * - More reliable: No UI flakiness
 * - Better parallel execution: No DOM interactions
 *
 * Uses Supabase Auth API directly to obtain session tokens
 * @see https://supabase.com/docs/reference/javascript/auth-signinwithpassword
 */
setup('authenticate as tenant via API', async ({ request }) => {
	// Environment variables
	const supabaseUrl = process.env.TEST_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
	const supabaseKey = process.env.TEST_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
	const email = process.env.E2E_TENANT_EMAIL
	const password = process.env.E2E_TENANT_PASSWORD

	// Validation
	if (!supabaseUrl || !supabaseKey) {
		throw new Error('Missing Supabase configuration: TEST_SUPABASE_URL and TEST_SUPABASE_PUBLISHABLE_KEY required')
	}
	if (!email || !password) {
		throw new Error('Missing E2E tenant credentials: E2E_TENANT_EMAIL and E2E_TENANT_PASSWORD required')
	}

	// Authenticate via Supabase Auth API
	// Using password grant type for direct email/password authentication
	const authResponse = await request.post(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
		headers: {
			'apikey': supabaseKey,
			'Content-Type': 'application/json',
		},
		data: {
			email,
			password,
		},
	})

	if (!authResponse.ok()) {
		const errorBody = await authResponse.text()
		throw new Error(`Tenant authentication failed (${authResponse.status()}): ${errorBody}`)
	}

	const authData = await authResponse.json()

	// Extract tokens from response
	const accessToken = authData.access_token
	const refreshToken = authData.refresh_token
	const expiresAt = authData.expires_at || Math.floor(Date.now() / 1000) + authData.expires_in

	if (!accessToken || !refreshToken) {
		throw new Error('Authentication response missing required tokens')
	}

	// Extract Supabase project ref from URL for dynamic cookie name
	// Format: https://{project-ref}.supabase.co
	const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
	const cookieName = `sb-${projectRef}-auth-token`

	// Get base URL - must match playwright.config.ts TEST_FRONTEND_PORT
	const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3050'
	const parsedUrl = new URL(baseUrl)
	const domain = parsedUrl.hostname
	const isSecure = parsedUrl.protocol === 'https:'

	// Create storage state matching Supabase client format
	// This mimics what @supabase/ssr sets in cookies
	// IMPORTANT: Supabase SSR expects JSON-stringified session (NOT base64)
	const sessionData = {
		access_token: accessToken,
		refresh_token: refreshToken,
		expires_at: expiresAt,
		expires_in: authData.expires_in,
		token_type: 'bearer',
		user: authData.user,
	}

	// JSON stringify the session data (Supabase SSR format)
	const jsonSession = JSON.stringify(sessionData)

	const storageState = {
		cookies: [
			{
				name: cookieName,
				value: jsonSession,
				domain: domain,
				path: '/',
				expires: expiresAt,
				httpOnly: false,
				secure: isSecure,
				sameSite: 'Lax' as const,
			},
		],
		origins: [
			{
				origin: baseUrl,
				localStorage: [
					{
						name: cookieName,
						value: JSON.stringify(sessionData),
					},
				],
			},
		],
	}

	// Save storage state to file
	const fs = await import('fs/promises')
	await fs.mkdir(path.dirname(authFile), { recursive: true })
	await fs.writeFile(authFile, JSON.stringify(storageState, null, 2))

	logger.info(`Tenant API authentication completed for ${email}`)
})
