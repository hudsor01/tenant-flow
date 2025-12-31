import { test as setup } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'
import { createLogger } from '@repo/shared/lib/frontend-logger'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const authFile = path.join(__dirname, '../playwright/.auth/owner.json')
const logger = createLogger({ component: 'AuthApiSetup' })

/**
 * API-based authentication setup for Playwright tests
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
setup('authenticate as owner via API', async ({ request }) => {
	// Environment variables
	const supabaseUrl =
		process.env.TEST_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
	const supabaseKey =
		process.env.TEST_SUPABASE_PUBLISHABLE_KEY ||
		process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
	const email = process.env.E2E_OWNER_EMAIL
	const password = process.env.E2E_OWNER_PASSWORD

	// Validation
	if (!supabaseUrl || !supabaseKey) {
		throw new Error(
			'Missing Supabase configuration: TEST_SUPABASE_URL and TEST_SUPABASE_PUBLISHABLE_KEY required'
		)
	}
	if (!email || !password) {
		throw new Error(
			'Missing E2E credentials: E2E_OWNER_EMAIL and E2E_OWNER_PASSWORD required'
		)
	}

	// Authenticate via Supabase Auth API
	// Using password grant type for direct email/password authentication
	const authResponse = await request.post(
		`${supabaseUrl}/auth/v1/token?grant_type=password`,
		{
			headers: {
				apikey: supabaseKey,
				'Content-Type': 'application/json'
			},
			data: {
				email,
				password
			}
		}
	)

	if (!authResponse.ok()) {
		const errorBody = await authResponse.text()
		throw new Error(
			`Authentication failed (${authResponse.status()}): ${errorBody}`
		)
	}

	const authData = await authResponse.json()

	// Extract tokens from response
	const accessToken = authData.access_token
	const refreshToken = authData.refresh_token
	const expiresAt =
		authData.expires_at || Math.floor(Date.now() / 1000) + authData.expires_in

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
	//
	// IMPORTANT: @supabase/ssr cookie format (from official source code):
	// - src/cookies.ts: Uses BASE64_PREFIX = "base64-" + stringToBase64URL(value)
	// - src/utils/base64url.ts: Base64URL alphabet replaces +→- and /→_, omits padding =
	// - src/utils/chunker.ts: MAX_CHUNK_SIZE = 3180 bytes per chunk
	// @see https://github.com/supabase/ssr/blob/main/src/cookies.ts
	// @see https://github.com/supabase/ssr/blob/main/src/utils/base64url.ts
	const sessionData = {
		access_token: accessToken,
		refresh_token: refreshToken,
		expires_at: expiresAt,
		expires_in: authData.expires_in,
		token_type: 'bearer',
		user: authData.user
	}

	// Base64URL encode per RFC 4648: +→-, /→_, no padding
	// Then prefix with "base64-" as expected by @supabase/ssr
	const jsonSession = JSON.stringify(sessionData)
	const base64UrlSession = Buffer.from(jsonSession)
		.toString('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=/g, '')
	const encodedSession = `base64-${base64UrlSession}`

	// Supabase SSR chunks at 3180 bytes - create chunked cookies if needed
	const CHUNK_SIZE = 3180
	const cookies: Array<{
		name: string
		value: string
		domain: string
		path: string
		expires: number
		httpOnly: boolean
		secure: boolean
		sameSite: 'Lax'
	}> = []

	if (encodedSession.length <= CHUNK_SIZE) {
		// Single cookie fits within chunk size
		cookies.push({
			name: cookieName,
			value: encodedSession,
			domain: domain,
			path: '/',
			expires: expiresAt,
			httpOnly: false,
			secure: isSecure,
			sameSite: 'Lax' as const
		})
	} else {
		// Split into numbered chunks: cookieName.0, cookieName.1, etc.
		for (
			let i = 0, chunkIndex = 0;
			i < encodedSession.length;
			i += CHUNK_SIZE, chunkIndex++
		) {
			cookies.push({
				name: `${cookieName}.${chunkIndex}`,
				value: encodedSession.slice(i, i + CHUNK_SIZE),
				domain: domain,
				path: '/',
				expires: expiresAt,
				httpOnly: false,
				secure: isSecure,
				sameSite: 'Lax' as const
			})
		}
	}

	const storageState = {
		cookies,
		origins: [
			{
				origin: baseUrl,
				localStorage: [
					{
						name: cookieName,
						value: jsonSession
					}
				]
			}
		]
	}

	// Save storage state to file
	const fs = await import('fs/promises')
	await fs.mkdir(path.dirname(authFile), { recursive: true })
	await fs.writeFile(authFile, JSON.stringify(storageState, null, 2))

	logger.info(`✓ API authentication completed for ${email}`)
})
