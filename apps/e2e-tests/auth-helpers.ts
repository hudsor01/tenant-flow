/**
 * E2E Authentication Helpers - API-Based Authentication
 *
 * ARCHITECTURE: Uses Supabase REST API for authentication instead of UI login
 *
 * WHY API-BASED:
 * 1. Playwright 1.53+ has fill() regressions with React controlled inputs
 * 2. UI login is fragile due to React hydration timing
 * 3. API login is 10x faster (~200ms vs ~3s)
 * 4. More reliable - no DOM interaction issues
 *
 * HOW IT WORKS:
 * 1. Call Supabase /auth/v1/token endpoint directly
 * 2. Get access_token, refresh_token, user data
 * 3. Set cookies AND localStorage in browser context
 * 4. Navigate to protected pages
 *
 * REFERENCES:
 * - https://playwright.dev/docs/auth
 * - https://mokkapps.de/blog/login-at-supabase-via-rest-api-in-playwright-e2e-test
 * - https://supabase.com/docs/guides/auth/sessions
 */

import { type Page, type BrowserContext } from '@playwright/test'

// Supabase project reference extracted from URL
const SUPABASE_PROJECT_REF = 'bshjmbshupiibfiewpxb'
const SUPABASE_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co`
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''

// Worker-level session cache (isolated per worker process)
const sessionCache = new Map<string, SupabaseSession>()

// Debug logging helper
const debugLog = (...args: string[]) => {
	if (!process.env.DEBUG) return
	const [message, ...rest] = args
	if (rest.length > 0) {
		console.log(message, ...rest)
	} else {
		console.log(message)
	}
}

interface SupabaseSession {
	access_token: string
	refresh_token: string
	expires_in: number
	expires_at: number
	token_type: string
	user: {
		id: string
		email: string
		app_metadata: Record<string, unknown>
		user_metadata: Record<string, unknown>
	}
}

interface LoginOptions {
	email?: string
	password?: string
	forceLogin?: boolean // Skip cache, force fresh login
}

/**
 * Authenticate via Supabase REST API
 *
 * Calls the /auth/v1/token endpoint directly to get session tokens.
 * This is much faster and more reliable than UI-based login.
 */
async function authenticateViaAPI(
	email: string,
	password: string
): Promise<SupabaseSession> {
	const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'apikey': SUPABASE_ANON_KEY,
			'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
		},
		body: JSON.stringify({ email, password })
	})

	if (!response.ok) {
		const error = await response.json()
		throw new Error(`Supabase auth failed: ${error.error_description || error.message || response.statusText}`)
	}

	return response.json()
}

/**
 * Inject session into browser context
 *
 * Sets up both cookies and localStorage to match what Supabase SSR expects.
 * This ensures the Next.js middleware can validate the session.
 */
async function injectSessionIntoBrowser(
	context: BrowserContext,
	session: SupabaseSession,
	baseUrl: string
): Promise<void> {
	const cookieName = `sb-${SUPABASE_PROJECT_REF}-auth-token`
	const cookieValue = JSON.stringify(session)

	// Parse base URL to get domain
	const url = new URL(baseUrl)
	const domain = url.hostname

	// Set the auth cookie - this is what Supabase SSR reads
	await context.addCookies([
		{
			name: cookieName,
			value: cookieValue,
			domain: domain,
			path: '/',
			httpOnly: false, // Supabase browser client needs to read this
			secure: url.protocol === 'https:',
			sameSite: 'Lax',
			expires: session.expires_at
		}
	])

	debugLog(` Cookie set: ${cookieName}`)

	// Also set in localStorage for browser client
	// This ensures the Supabase browser client can read the session
	await context.addInitScript(
		({ cookieName, session }) => {
			localStorage.setItem(cookieName, JSON.stringify(session))
		},
		{ cookieName, session }
	)

	debugLog(' Session injected into localStorage')
}

/**
 * Login as property owner via API
 *
 * @param page - Playwright Page instance
 * @param options - Login credentials and cache control
 *
 * Performance:
 * - First call: ~200ms (API call)
 * - Subsequent calls: ~50ms (cached session injection)
 */
export async function loginAsOwner(page: Page, options: LoginOptions = {}) {
	const email =
		options.email || process.env.E2E_OWNER_EMAIL || 'test-admin@tenantflow.app'
	const rawPassword =
		options.password ||
		process.env.E2E_OWNER_PASSWORD ||
		(() => { throw new Error('E2E_OWNER_PASSWORD environment variable is required') })()
	const password = rawPassword.replace(/\\!/g, '!')
	const cacheKey = `owner:${email}`

	const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
	const context = page.context()

	// Check cache first
	let session = sessionCache.get(cacheKey)

	if (!session || options.forceLogin) {
		debugLog(` Authenticating via API: ${email}`)

		try {
			session = await authenticateViaAPI(email, password)
			sessionCache.set(cacheKey, session)
			debugLog(` API authentication successful`)
		} catch (error) {
			debugLog(` API authentication failed: ${error}`)
			throw error
		}
	} else {
		debugLog(` Using cached session for: ${email}`)
	}

	// Inject session into browser context
	await injectSessionIntoBrowser(context, session, baseUrl)

	// Navigate to dashboard - session should be valid
	await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'domcontentloaded' })

	// Wait for auth to stabilize
	await page.waitForLoadState('networkidle', { timeout: 15000 })

	// Verify we're on the dashboard, not redirected to login
	const currentUrl = page.url()
	if (currentUrl.includes('/login')) {
		throw new Error(`Login failed: Redirected to login page. Session may be invalid.`)
	}

	debugLog(` Logged in as owner (${email})`)
}

/**
 * Login as tenant via API
 *
 * @param page - Playwright Page instance
 * @param options - Login credentials and cache control
 */
export async function loginAsTenant(page: Page, options: LoginOptions = {}) {
	const email =
		options.email ||
		process.env.E2E_TENANT_EMAIL ||
		'test-tenant@tenantflow.app'
	const rawPassword =
		options.password ||
		process.env.E2E_TENANT_PASSWORD ||
		(() => { throw new Error('E2E_TENANT_PASSWORD environment variable is required') })()
	const password = rawPassword.replace(/\\!/g, '!')
	const cacheKey = `tenant:${email}`

	const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
	const context = page.context()

	// Check cache first
	let session = sessionCache.get(cacheKey)

	if (!session || options.forceLogin) {
		debugLog(` Authenticating tenant via API: ${email}`)

		try {
			session = await authenticateViaAPI(email, password)
			sessionCache.set(cacheKey, session)
			debugLog(` Tenant API authentication successful`)
		} catch (error) {
			debugLog(` Tenant API authentication failed: ${error}`)
			throw error
		}
	} else {
		debugLog(` Using cached tenant session for: ${email}`)
	}

	// Inject session into browser context
	await injectSessionIntoBrowser(context, session, baseUrl)

	// Navigate to tenant portal - session should be valid
	await page.goto(`${baseUrl}/tenant`, { waitUntil: 'domcontentloaded' })

	// Wait for auth to stabilize
	await page.waitForLoadState('networkidle', { timeout: 15000 })

	// Verify we're on the tenant page, not redirected to login
	const currentUrl = page.url()
	if (currentUrl.includes('/login')) {
		throw new Error(`Tenant login failed: Redirected to login page. Session may be invalid.`)
	}

	debugLog(` Logged in as tenant (${email})`)
}

/**
 * Clear session cache (for logout testing or forced re-login)
 */
export function clearSessionCache() {
	sessionCache.clear()
	debugLog(' Session cache cleared')
}
