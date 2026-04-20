import { test, expect } from '@playwright/test'
import { ROUTES } from '../constants/routes'

/**
 * v2.0 Phase 46 — Premium reports paywall (REQ-46-04)
 *
 * Verifies the wire-up: Free-tier owners hitting export-report with a premium
 * report type get a 402 with an `upgrade_url` body that deep-links to
 * `/billing/plans?source=reports_gate`, and the pricing page accepts + forwards
 * the source tag so Stripe Checkout metadata records the attribution.
 *
 * Mirrors esign-gate.spec.ts (Phase 45) — both gates share the same
 * `_shared/tier-gate.ts` helper, so the tests differ only in endpoint +
 * expected upgrade_url.
 *
 * Uses owner.json storageState. Skips cleanly if the seeded owner is on
 * Growth or Max (gate returns 200 on paid tier — exercised by the normal
 * report download flow elsewhere).
 */
test.describe('v2.0 Phase 46 — Reports paywall wire-up', () => {
	test('export-report returns 402 with upgrade_url on Free tier', async ({
		page,
		request,
		baseURL
	}) => {
		const storage = await page.context().storageState()
		const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
		test.skip(
			!supabaseUrl,
			'NEXT_PUBLIC_SUPABASE_URL not set — Edge Function URL cannot be resolved'
		)

		// Extract Supabase session access_token from storageState (set by
		// auth-api.setup.ts). Matches the pattern in esign-gate.spec.ts.
		const origin = storage.origins.find(o =>
			o.origin.startsWith(baseURL ?? 'http://localhost:3050')
		)
		const accessTokenEntry = origin?.localStorage?.find(entry =>
			entry.name.startsWith('sb-') && entry.name.endsWith('-auth-token')
		)
		test.skip(
			!accessTokenEntry,
			'No Supabase auth-token in storageState — run the auth setup project first'
		)

		// auth-api.setup.ts writes localStorage as plain JSON (unlike the
		// `base64-`-prefixed cookie payload @supabase/ssr expects). Parse
		// directly — any base64 decode here would corrupt the JSON.
		const decoded = JSON.parse(accessTokenEntry!.value) as {
			access_token?: string
		}
		const accessToken = decoded.access_token
		test.skip(!accessToken, 'Could not extract access_token from storageState')

		// Hit export-report with `type=year-end` — one of the five gated types
		// (year-end | 1099 | financial | income-statement | cash-flow). The tier
		// gate runs BEFORE the RPC is called, so we get either:
		//   402 → Free tier (what this test proves)
		//   200 → Growth/Max tier (skip: paywall not reachable)
		const resp = await request.get(
			`${supabaseUrl}/functions/v1/export-report?type=year-end&format=csv&year=2026`,
			{
				headers: { Authorization: `Bearer ${accessToken}` }
			}
		)

		test.skip(
			resp.status() === 200,
			'Seeded owner is on Growth/Max — paywall is not reachable. Use a Free-tier fixture to run this spec.'
		)

		expect(resp.status()).toBe(402)

		const body = (await resp.json()) as {
			error?: string
			upgrade_required?: boolean
			upgrade_url?: string
			current_plan?: string | null
		}
		expect(body.upgrade_required).toBe(true)
		expect(body.upgrade_url).toBe('/billing/plans?source=reports_gate')
	})

	test('pricing page preserves ?source=reports_gate query param on load', async ({
		page
	}) => {
		await page.goto(`${ROUTES.HOME}billing/plans?source=reports_gate`)

		// After client-side hydration the source param should still be on the URL
		// — the checkout hook forwards it into Stripe session metadata so admin
		// conversion analytics can attribute the upgrade back to this gate.
		await expect(page).toHaveURL(/source=reports_gate/)
	})
})
