/**
 * The billing emails say what the app does (66.2-39 fix round 4, Part 8n).
 *
 * The emails the app sends are copy the app shows (main session, standing
 * rule). Two stated what happens to an owner's access and features:
 *
 * - `invoice.payment_failed` said that if the charge kept failing "your
 *   subscription will be canceled and premium features will be disabled".
 *   The paid features do not wait for a cancellation: the tier gates admit
 *   only `active` and `trialing`, so they stop while the subscription is past
 *   due. Stripe's Revenue recovery settings are known since (owner,
 *   2026-11-09, from the Stripe Dashboard): a failed renewal leaves the
 *   subscription past due, card payments are retried, and when every retry
 *   fails the subscription is canceled. The email says that (Part 8o), with
 *   no retry count or duration and nothing of the invoice, and the terms'
 *   "Failed Payments" passage says the same.
 * - `customer.subscription.trial_will_end` told every owner to "Add a payment
 *   method now ... otherwise your subscription will be canceled". Stripe sends
 *   it whether or not a payment method is on file, and the event names the
 *   customer by id only, so the email now states both outcomes. Its subject
 *   said "ends in 3 days", false for a send with less time left; its date was
 *   worked out in UTC without saying so; with no `trial_end` it read "ends on
 *   in 3 days" (main session, Part 8o: `_shared/trial-end-text.ts`).
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
import {
	trialEndCopy,
	trialIsStillRunning,
} from "../_shared/trial-end-text";

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

	it("says what Stripe's Revenue recovery settings and the gates do: retried, paused, canceled if every retry fails", () => {
		expect(html).toContain(
			"<p>Your TenantFlow subscription payment failed. Update your payment method to keep access.</p>",
		);
		expect(html).toContain(
			"<p>We'll retry the payment. Until it goes through, Growth and Max plans can't send new e-signature requests, export the Year-End, Tax Documents or Financial Analytics reports, or send renewal reminder emails.</p>",
		);
		expect(html).toContain(
			"<p>If every retry fails, your subscription is canceled, and every page except Settings closes until you choose a plan again.</p>",
		);
		expect(html).toContain(
			'/settings?tab=billing">Update Payment Method</a></p>',
		);
	});

	it("ties the features to the first failure, not the cancellation, and names no retry count, duration or invoice", () => {
		expect(html).not.toMatch(/will be cancell?ed/i);
		expect(html).not.toMatch(/premium features will be disabled/i);
		expect(html).not.toMatch(/active again/i);
		expect(html).not.toMatch(/\binvoice\b/i);
		expect(html).not.toMatch(/\b\d+\s*(?:times|days?|hours?|weeks?|attempts?|retries)\b/i);
		expect(html).not.toMatch(/\b(?:one|two|three|four|five|six|seven|eight)\s+(?:times|days?|weeks?|attempts?|retries)\b/i);
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
		expect(html).toContain("<p>${escapeHtml(copy.lead)}</p>");
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

	// Main session, Part 8o: Stripe sends the event three days before the
	// trial ends, at once when less time is left (a carry-over trial can start
	// with 48 to 72 hours left), and at once when a trial is ended early.
	it("takes its subject and first line from the trial-end leaf, and sends nothing for a trial that is over", () => {
		// The subject and the date were literals and a UTC date: "ends in 3
		// days", and `: "in 3 days"` with no `trial_end`.
		expect(TRIAL_WILL_END).not.toMatch(/subject: ["'`]/);
		expect(TRIAL_WILL_END).not.toMatch(/: "in 3 days"/);
		expect(TRIAL_WILL_END).not.toMatch(/toLocale(?:Date)?String/);
		expect(TRIAL_WILL_END).toMatch(/subject: copy\.subject,/);
		expect(TRIAL_WILL_END).toMatch(
			/const copy = trialEndCopy\(sub\.trial_end \?\? null\);/,
		);
		const guard = TRIAL_WILL_END.indexOf(
			"if (!trialIsStillRunning(sub.status, sub.trial_end ?? null, Date.now())) {",
		);
		expect(guard).toBeGreaterThan(-1);
		expect(guard).toBeLessThan(TRIAL_WILL_END.indexOf("await sendEmail("));
		expect(
			TRIAL_WILL_END.slice(guard, TRIAL_WILL_END.indexOf("await sendEmail(")),
		).toMatch(/\n\t\treturn;\n\t\}/);
	});
});

describe("the trial end, named so no reader misreads the day", () => {
	// 2026-11-13 02:13 UTC is the evening of November 12 in every US zone: a
	// date alone, worked out in UTC, named the day after the owner's.
	const evening = Date.UTC(2026, 10, 13, 2, 13) / 1000;

	it("names the date and time in UTC, with the zone written out", () => {
		const lead = (end: number) => trialEndCopy(end).lead;
		expect(lead(evening)).toBe(
			"Your TenantFlow trial ends on November 13, 2026, at 2:13 AM UTC.",
		);
		expect(lead(Date.UTC(2026, 0, 1, 0, 0) / 1000)).toBe(
			"Your TenantFlow trial ends on January 1, 2026, at 12:00 AM UTC.",
		);
		expect(lead(Date.UTC(2026, 11, 31, 12, 5) / 1000)).toBe(
			"Your TenantFlow trial ends on December 31, 2026, at 12:05 PM UTC.",
		);
		expect(lead(Date.UTC(2026, 6, 4, 23, 59) / 1000)).toBe(
			"Your TenantFlow trial ends on July 4, 2026, at 11:59 PM UTC.",
		);
	});

	it("puts the end in the subject and the first line, and reads 'is ending' with no date", () => {
		expect(trialEndCopy(evening)).toEqual({
			subject: "Your TenantFlow trial ends on November 13, 2026, at 2:13 AM UTC",
			lead: "Your TenantFlow trial ends on November 13, 2026, at 2:13 AM UTC.",
		});
		expect(trialEndCopy(null)).toEqual({
			subject: "Your TenantFlow trial is ending",
			lead: "Your TenantFlow trial is ending.",
		});
		for (const copy of [trialEndCopy(evening), trialEndCopy(null)]) {
			expect(`${copy.subject} ${copy.lead}`).not.toMatch(/in 3 days|on in/);
		}
	});

	it("warns only while the trial is still running", () => {
		const end = evening * 1000;
		expect(trialIsStillRunning("trialing", evening, end - 60_000)).toBe(true);
		expect(trialIsStillRunning("trialing", null, end)).toBe(true);
		// Ended early (trial_end=now, a portal plan change) or delivered late.
		expect(trialIsStillRunning("trialing", evening, end)).toBe(false);
		expect(trialIsStillRunning("active", evening, end - 60_000)).toBe(false);
		expect(trialIsStillRunning("canceled", null, end)).toBe(false);
	});
});

describe("the terms' Failed Payments passage", () => {
	const terms = readRepoSource("../../../src/app/terms/page.tsx")
		.replace(/&apos;/g, "'")
		.replace(/\s+/g, " ");

	it("says what the email says: retried, the paid features paused at once, canceled if every attempt fails", () => {
		expect(terms).toContain(
			"<strong>Failed Payments:</strong> If a payment fails, we will attempt to collect payment again. Until it is collected, the Growth and Max plans' e-signature requests, Year-End, Tax Documents and Financial Analytics report exports, and lease renewal reminder emails are paused. If every attempt fails, your subscription is canceled, and the Service, other than your account settings, is unavailable until you subscribe again",
		);
		expect(terms).not.toMatch(/continued payment failure/i);
	});
});
