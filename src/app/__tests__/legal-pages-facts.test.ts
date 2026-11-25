/**
 * The Terms and Privacy Policy state facts about how the product works
 * (2026-11-24 SEO audit, roadmap PR 1d: TM1-TM3, PV1, PV2, PV5, SP1). Each
 * assertion reads the page and the code the sentence describes, so the two
 * fail together when one changes.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PRICING_PLANS } from "#config/pricing";

/** Collapse JSX line wrapping, so a sentence matches as one string. */
const flat = (source: string) => source.replace(/\s+/g, " ");

const TERMS = flat(readFileSync("src/app/terms/page.tsx", "utf8"));
const PRIVACY = flat(readFileSync("src/app/privacy/page.tsx", "utf8"));
const SECURITY_POLICY = flat(
	readFileSync("src/app/security-policy/page.tsx", "utf8"),
);
const CHECKOUT = readFileSync(
	"supabase/functions/stripe-checkout/index.ts",
	"utf8",
);
const TRIAL_REMINDER = readFileSync(
	"supabase/functions/stripe-webhooks/handlers/customer-subscription-trial-will-end.ts",
	"utf8",
);
const ROOT_LAYOUT = readFileSync("src/app/layout.tsx", "utf8");
const GOOGLE_SIGN_IN = readFileSync(
	"src/app/(auth)/login/login-oauth.tsx",
	"utf8",
);
const SECURITY_TXT = readFileSync("public/.well-known/security.txt", "utf8");

describe("Terms of Service", () => {
	it("states the trial length the product grants (TM1)", () => {
		const trial = PRICING_PLANS.FREETRIAL?.trial;
		const days = typeof trial === "object" ? trial.trialPeriodDays : null;
		expect(days).toBe(14);
		expect(TERMS).toContain(`start with a ${days}-day free trial`);
		expect(TERMS).toContain('id="free-trial"');
	});

	it("matches the checkout's carry-over rule and reminder (TM1)", () => {
		expect(CHECKOUT).toMatch(/MIN_TRIAL_CARRYOVER_MS = 48 \* 60 \* 60 \* 1000/);
		expect(TERMS).toContain(
			"If fewer than two days of the trial remain when you choose a plan, you are charged when you subscribe",
		);
		expect(TRIAL_REMINDER).toContain("sendEmail");
		expect(TERMS).toContain("Before that first charge, we email you");
	});

	it("discloses tax, which checkout calculates (TM2)", () => {
		expect(CHECKOUT).toContain("automatic_tax: { enabled: true }");
		expect(TERMS).toContain("exclude sales and use taxes");
	});

	it("states the plan-change rule the billing portal applies (TM3)", () => {
		expect(TERMS).toContain("Plan changes take effect immediately");
		expect(TERMS).toContain('id="cancellation"');
	});
});

describe("Privacy Policy", () => {
	it("names every service the site sends data to (PV1)", () => {
		expect(ROOT_LAYOUT).toContain("@vercel/analytics/next");
		expect(GOOGLE_SIGN_IN).toContain('provider: "google"');
		for (const name of [
			"Supabase",
			"Stripe",
			"Vercel",
			"Resend",
			"Sentry",
			"Google",
		])
			expect(PRIVACY).toContain(`<strong>${name}:</strong>`);
		expect(PRIVACY).toContain("We also run n8n");
	});

	it("does not claim analytics cookies (PV2)", () => {
		expect(PRIVACY).not.toContain("Analytics Cookies");
		expect(PRIVACY).toContain("do not use cookies");
	});

	it("discloses the first-party funnel events and their retention (PV2, T1)", () => {
		const migration = flat(
			readFileSync(
				"supabase/migrations/20261125172716_analytics_events.sql",
				"utf8",
			),
		);
		expect(migration).toContain("interval '180 days'");
		expect(migration).toContain(
			"update public.analytics_events set user_id = null",
		);
		expect(PRIVACY).toContain("session storage until you close the tab");
		expect(PRIVACY).toContain("are deleted after 180 days");
		expect(PRIVACY).toContain("unlinked from your account when it is deleted");
	});

	it("states the retention windows the sweeps use (PV5)", () => {
		expect(PRIVACY).toContain("90 days after you read them");
		expect(PRIVACY).toContain("180 days after they arrive if unread");
		expect(PRIVACY).toContain("anonymized 730 days after");
	});
});

describe("security.txt", () => {
	it("agrees with the policy that there is no paid bounty (SP1)", () => {
		expect(SECURITY_TXT).toContain("No monetary bug bounty");
		expect(SECURITY_POLICY).toContain(
			"do not currently offer monetary bounties",
		);
	});
});
