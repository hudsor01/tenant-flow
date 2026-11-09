/**
 * The billing emails say what the app does (66.2-39 fix round 4, Part 8n).
 *
 * The emails the app sends are copy the app shows (main session, standing
 * rule). Two stated what happens to an owner's access and features:
 *
 * - `invoice.payment_failed` said that if the charge kept failing "your
 *   subscription will be canceled and premium features will be disabled".
 *   Stripe's failed-payment setting decides whether its retries end in
 *   `unpaid` or `canceled`, and the proxy closes every page but Settings for
 *   both; and the paid features do not wait for that: the tier gates admit
 *   only `active` and `trialing`, so they stop while the subscription is past
 *   due. The email now says what is true either way, and what stops now.
 * - `customer.subscription.trial_will_end` told every owner to "Add a payment
 *   method now ... otherwise your subscription will be canceled". Stripe sends
 *   it whether or not a payment method is on file, and the event names the
 *   customer by id only, so the email now states both outcomes.
 *
 * WHY THE SOURCES ARE READ FROM DISK: the handlers are Deno modules (explicit
 * `.ts` imports, `Deno.env`, `npm:` packages), which Vitest cannot import, so
 * the template literal is read as text, as `premium-report-gate.test.ts` reads
 * the edge functions. The list of what stops is held to the code it names:
 * the gates' admitted statuses, the e-sign gate's one action, and the premium
 * report types with their page titles.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { REPORTS_HUB_ENTRIES } from "#app/(owner)/reports/reports-hub-entries";
import { PREMIUM_REPORT_SLUGS } from "#lib/reports/premium-report-slugs";

function readRepoSource(relativePath: string): string {
	return readFileSync(
		fileURLToPath(new URL(relativePath, import.meta.url)),
		"utf8",
	);
}

/** The `html:` template literal's text, its whitespace runs collapsed. */
function emailHtml(source: string): string {
	const html = source.match(/html:\s*`([\s\S]*?)`,/);
	if (!html?.[1]) throw new Error("no html template literal");
	return html[1].replace(/\s+/g, " ").trim();
}

/** The quoted members of `const <name> ... = new Set([ ... ])`. */
function setMembers(source: string, name: string): string[] {
	const declaration = source.match(
		new RegExp(`const ${name}\\b[^=]*=\\s*new Set\\(\\[([\\s\\S]*?)\\]\\)`),
	);
	return declaration?.[1]?.match(/"[a-z_-]+"/g) ?? [];
}

const PAYMENT_FAILED = readRepoSource(
	"../stripe-webhooks/handlers/invoice-payment-failed.ts",
);
const TRIAL_WILL_END = readRepoSource(
	"../stripe-webhooks/handlers/customer-subscription-trial-will-end.ts",
);

describe("the failed-payment email", () => {
	const html = emailHtml(PAYMENT_FAILED);

	it("says what is true whether the retries end in unpaid or canceled, and what stops now", () => {
		expect(html).toContain(
			"<p>Your TenantFlow subscription payment failed. Update your payment method to keep access.</p>",
		);
		expect(html).toContain(
			"<p>Until the payment goes through, Growth and Max plans can't send new e-signature requests, export the Year-End, Tax Documents or Financial Analytics reports, or send renewal reminder emails. If the payment isn't made, every page except Settings closes until your subscription is active again.</p>",
		);
		expect(html).toContain(
			'/settings?tab=billing">Update Payment Method</a></p>',
		);
	});

	it("no longer ties the lock to a cancellation or the features to the end of the retries", () => {
		expect(html).not.toMatch(/will be cancell?ed/i);
		expect(html).not.toMatch(/premium features will be disabled/i);
		expect(html).not.toMatch(/keep retrying/i);
	});

	it("names only what the gates stop while past due", () => {
		const gate = readRepoSource("../_shared/tier-gate.ts");
		const reminders = readRepoSource("../send-lease-reminders/index.ts");
		const esign = readRepoSource("../lease-signature/index.ts");
		// Both gates admit active and trialing only, so past_due is refused.
		expect(setMembers(gate, "ACTIVE_SUB_STATUSES")).toEqual([
			'"active"',
			'"trialing"',
		]);
		expect(setMembers(reminders, "ACTIVE_SUB_STATUSES")).toEqual([
			'"active"',
			'"trialing"',
		]);
		// The e-sign gate runs for `send` (a new request) and no other action.
		const gateCalls = [...esign.matchAll(/checkTierEntitlement\(/g)];
		expect(gateCalls).toHaveLength(1);
		const before = esign.slice(0, gateCalls[0]?.index ?? 0);
		expect(
			before.match(
				/if \(action === "(\w+)"\) \{\s*const entitlementBlock = await\s*$/,
			)?.[1],
		).toBe("send");
		// The premium report types, by the names the app gives their pages.
		const names: Record<string, string> = {
			"year-end": "Year-End",
			financial: "Tax Documents",
			"financial-analytics": "Financial Analytics",
		};
		expect(Object.keys(names).sort()).toEqual([...PREMIUM_REPORT_SLUGS].sort());
		for (const entry of REPORTS_HUB_ENTRIES) {
			if (entry.gatedReportType !== null) {
				expect(entry.title).toBe(names[entry.gatedReportType]);
			}
		}
		expect(
			readRepoSource(
				"../../../src/app/(owner)/analytics/financial/layout.tsx",
			),
		).toContain('ownerPageMetadata("Financial Analytics")');
		for (const name of Object.values(names)) expect(html).toContain(name);
	});
});

describe("the trial-ending email", () => {
	const html = emailHtml(TRIAL_WILL_END);

	it("states both outcomes, since Stripe sends it whether or not a payment method is on file", () => {
		expect(html).toContain(
			"<p>Your TenantFlow trial ends on ${escapeHtml(trialEndDate)}.</p>",
		);
		expect(html).toContain(
			"<p>If you've added a payment method, your plan continues when the trial ends and is billed to it.</p>",
		);
		expect(html).toContain(
			"<p>If you haven't, add one in Billing Settings before then. Without one, your subscription is canceled when the trial ends, and every page except Settings closes until you choose a plan.</p>",
		);
		expect(html).toContain(
			'/settings?tab=billing">Open Billing Settings</a></p>',
		);
	});

	it("no longer tells every owner to add a payment method", () => {
		expect(html).not.toMatch(/otherwise your subscription will be cancell?ed/i);
		expect(html).not.toMatch(/Add a payment method now/i);
		expect(html).not.toMatch(/>Add a payment method</i);
	});

	it("rests on the carry-over trial's cancel-without-a-card setting", () => {
		expect(readRepoSource("../stripe-checkout/index.ts")).toMatch(
			/end_behavior: \{ missing_payment_method: "cancel" as const \}/,
		);
	});
});
