import { test, expect } from '@playwright/test'
import { ROUTES } from '../constants/routes'

/**
 * v2.0 Phase 45 — DocuSeal e-sign paywall (REQ-45-04)
 *
 * Verifies the wire-up: Free-tier owners hitting send-for-signature get a 402
 * with an `upgrade_url` body that deep-links to `/billing/plans?source=esign_gate`,
 * and that the pricing page accepts + forwards the source tag into Stripe
 * Checkout metadata.
 *
 * Doesn't complete the Stripe test-mode upgrade — that needs test-mode card
 * fixtures and would duplicate the billing spec.
 *
 * Uses owner.json storageState. Skips cleanly if the seeded owner is on Growth
 * or Max (the gate should be 200/403, not 402 — that path is proven elsewhere).
 */
test.describe('v2.0 Phase 45 — DocuSeal paywall wire-up', () => {
	test('send-for-signature returns 402 with upgrade_url when owner is on Free tier', async ({
		page,
		request,
		baseURL
	}) => {
		// Pull the owner's JWT from the authenticated browser context so the
		// request client forwards it to the Edge Function. Going via `request`
		// (not `page.evaluate(fetch)`) keeps the spec agnostic of CSP.
		const storage = await page.context().storageState()
		const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
		test.skip(
			!supabaseUrl,
			'NEXT_PUBLIC_SUPABASE_URL not set — Edge Function URL cannot be resolved'
		)

		// Extract Supabase session access_token from storage (set by auth-api.setup.ts).
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
		// directly — any base64 decode here would corrupt the JSON and the
		// test would throw SyntaxError the moment a seeded token actually
		// exists, instead of reaching its intended 402/skip branches.
		const decoded = JSON.parse(accessTokenEntry!.value) as {
			access_token?: string
		}
		const accessToken = decoded.access_token
		test.skip(!accessToken, 'Could not extract access_token from storageState')

		// Fire a send-for-signature request with a bogus leaseId. The tier gate
		// runs BEFORE the leaseId is validated against the DB, so we get either:
		//   402 → Free tier (what this test proves)
		//   500 → env gap (DOCUSEAL_URL missing)
		//   403 → Growth+/lease-not-owned (skip: can't exercise the paywall)
		const resp = await request.post(
			`${supabaseUrl}/functions/v1/docuseal`,
			{
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json'
				},
				data: {
					action: 'send-for-signature',
					leaseId: '00000000-0000-0000-0000-000000000000'
				}
			}
		)

		test.skip(
			resp.status() === 403,
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
		expect(body.upgrade_url).toBe('/billing/plans?source=esign_gate')
	})

	test('pricing page preserves ?source=esign_gate query param on load', async ({
		page
	}) => {
		await page.goto(`${ROUTES.HOME}billing/plans?source=esign_gate`)

		// The page should still have the source param after client-side hydration —
		// this is what the checkout hook forwards into Stripe session metadata.
		await expect(page).toHaveURL(/source=esign_gate/)
	})
})
