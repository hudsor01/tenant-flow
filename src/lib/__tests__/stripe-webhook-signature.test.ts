/**
 * CISEC-01 — Stripe-webhook signature accept/reject contract gate.
 *
 * Guards the verification contract relied on by the Edge Function at
 * `supabase/functions/stripe-webhooks/index.ts:73`, where every webhook
 * delivery is authenticated via `stripe.webhooks.constructEventAsync(...)`.
 * That function owns no hand-rolled crypto — it delegates 100% of signature
 * verification to the Stripe SDK. This unit test pins the exact security
 * contract (a valid signature is accepted; tampered/wrong-secret/stale
 * signatures are rejected) inside the already-green `checks` gate, with no
 * server, no prod secret, and no `supabase functions serve`.
 *
 * Async vs sync note: the Edge Function uses `constructEventAsync` because the
 * Deno runtime requires the async Web-Crypto variant. The Node SDK here uses
 * the synchronous `constructEvent` — both implement the identical signed-header
 * scheme (an HMAC-SHA256 over the timestamp-and-payload, carried in the
 * Stripe-Signature header). Do NOT "fix" this test to call the async variant to
 * match the Edge Function; the synchronous path is the correct Node-side mirror
 * of the same contract.
 *
 * `generateTestHeaderString` is a real SDK method that mints a genuine HMAC —
 * it is NOT a mock. Never hand-roll the Stripe-Signature header string here;
 * doing so re-introduces the exact bug class this test guards against.
 */
import Stripe from "stripe";
import { describe, expect, it } from "vitest";

// Throwaway, non-secret values — never a real key or signing secret. The
// signing secret only has to be internally consistent between minting the
// header and verifying it; its byte length matches the `whsec_` + 24-char
// shape Stripe emits so the test exercises a realistic secret size.
const SECRET = `whsec_test_${"x".repeat(24)}`;
const WRONG_SECRET = `whsec_wrong_${"y".repeat(24)}`;
const stripe = new Stripe("sk_test_x");

// Minimal but well-formed event envelope; only `id` / `type` round-trip is
// asserted on the accept path.
const PAYLOAD = JSON.stringify({
	id: "evt_test_cisec01",
	type: "checkout.session.completed",
});

describe("Stripe webhook signature verification contract (CISEC-01)", () => {
	it("accepts a correctly-signed payload and round-trips the event", () => {
		const header = stripe.webhooks.generateTestHeaderString({
			payload: PAYLOAD,
			secret: SECRET,
		});

		const event: Stripe.Event = stripe.webhooks.constructEvent(
			PAYLOAD,
			header,
			SECRET,
		);

		expect(event.id).toBe("evt_test_cisec01");
		expect(event.type).toBe("checkout.session.completed");
	});

	it("rejects a tampered body (payload mutated after signing)", () => {
		const header = stripe.webhooks.generateTestHeaderString({
			payload: PAYLOAD,
			secret: SECRET,
		});

		expect(() =>
			stripe.webhooks.constructEvent(`${PAYLOAD} `, header, SECRET),
		).toThrow();
	});

	it("rejects a signature minted with the wrong secret", () => {
		const header = stripe.webhooks.generateTestHeaderString({
			payload: PAYLOAD,
			secret: SECRET,
		});

		expect(() =>
			stripe.webhooks.constructEvent(PAYLOAD, header, WRONG_SECRET),
		).toThrow();
	});

	it("rejects a stale timestamp outside the tolerance window", () => {
		const tolerance = 300; // seconds — same order as Stripe's default.
		const staleTimestamp = Math.floor(Date.now() / 1000) - 10_000;
		const header = stripe.webhooks.generateTestHeaderString({
			payload: PAYLOAD,
			secret: SECRET,
			timestamp: staleTimestamp,
		});

		expect(() =>
			stripe.webhooks.constructEvent(PAYLOAD, header, SECRET, tolerance),
		).toThrow();
	});
});
