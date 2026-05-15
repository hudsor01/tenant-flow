import { test as setup, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const authFile = path.join(__dirname, '../playwright/.auth/owner.json')

/**
 * UI-based authentication setup.
 *
 * Replaces the prior API-based setup (auth-api.setup.ts) which hand-rolled
 * the @supabase/ssr cookie chunking + base64url encoding format. That
 * worked locally but produced cookies the production Next.js build did
 * not always accept — the smoke-authenticated tests on the first CI run
 * landed on /login (or /pricing) instead of /dashboard because the
 * server-side @supabase/ssr handler rejected the synthetic cookie payload.
 *
 * The canonical Playwright auth pattern uses a real browser context to do
 * one UI login, then persists the browser's own cookies + localStorage
 * via `page.context().storageState({ path })`. The session is whatever
 * @supabase/ssr actually wrote — no format guessing.
 *
 * Cost: ~6-12s per CI run for the single UI login. That's still 80% less
 * than 5 inline UI logins (the pattern this whole work is replacing) and
 * cleanly under Supabase Auth's ~45 sign-ins/minute rate limit.
 *
 * @see https://playwright.dev/docs/auth#authenticate-with-a-setup-project
 */
setup('authenticate as owner via UI', async ({ page }) => {
	const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3050'
	const email = process.env.E2E_OWNER_EMAIL
	const password = process.env.E2E_OWNER_PASSWORD

	if (!email || !password) {
		throw new Error(
			'Missing E2E credentials: E2E_OWNER_EMAIL and E2E_OWNER_PASSWORD required'
		)
	}

	await page.goto(`${baseUrl}/login`)

	const emailInput = page.locator('input#email')
	const passwordInput = page.locator('input#password')
	const submitButton = page.locator('button[type="submit"]')

	await expect(emailInput).toBeVisible({ timeout: 15000 })
	await expect(emailInput).toBeEnabled({ timeout: 5000 })

	await emailInput.click()
	await emailInput.fill(email)
	await passwordInput.click()
	await passwordInput.fill(password)

	await expect(emailInput).toHaveValue(email)
	await expect(passwordInput).toHaveValue(password)

	await submitButton.click()

	// Wait for navigation away from /login (server-side redirect to dashboard
	// or wherever subscription_status sends the user).
	await page.waitForURL(url => !url.pathname.includes('/login'), {
		timeout: 20000
	})

	// Force navigation to /dashboard and wait until the page actually loads
	// authenticated content. This guarantees the @supabase/ssr middleware
	// has written all auth cookies (access + refresh + chunk0/1) to the
	// browser jar before storageState reads it. Without this step, the
	// initial post-login redirect may set only a subset of cookies (the
	// ones that triggered the redirect), missing the chunked session cookie
	// the dashboard needs.
	await page.goto(`${baseUrl}/dashboard`)
	await page.waitForLoadState('networkidle', { timeout: 30000 })

	// Sanity check: confirm we're actually on /dashboard, not bounced back
	// to /login or to /pricing (subscription gate). If we get bounced, the
	// stored session won't be useful and dependent tests will fail with
	// confusing "dashboard element not found" errors.
	const finalUrl = page.url()
	if (finalUrl.includes('/login')) {
		throw new Error(
			`setup-owner: session cookies invalid — landed on /login after login. URL: ${finalUrl}`
		)
	}
	if (finalUrl.includes('/pricing')) {
		throw new Error(
			`setup-owner: subscription gate kicked us to /pricing. ` +
				`Check synthetic account subscription_status. URL: ${finalUrl}`
		)
	}

	const cookies = await page.context().cookies()
	const authCookies = cookies.filter(c => c.name.startsWith('sb-'))
	console.log(
		`[setup-owner] Saving ${cookies.length} cookies (${authCookies.length} auth), ` +
			`final URL: ${finalUrl}`
	)

	// Persist the real browser session (cookies + localStorage) so dependent
	// projects can replay it without re-logging.
	await page.context().storageState({ path: authFile })
})
