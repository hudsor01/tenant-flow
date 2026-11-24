/**
 * The trial lifecycle emails: who gets which one, when, and that what they
 * say is true.
 *
 * `_shared/trial-lifecycle.ts` is a dependency-free leaf, so the rules and the
 * copy run here directly. The Edge Function and the migration are Deno and SQL,
 * read from disk as text (as `billing-email-claims.test.ts` reads the billing
 * handlers) to pin the parts no unit can reach: the kill switch, the
 * suppression layers, the exactly-once key.
 *
 * Every claim in the copy is held to the code it describes: the trial's length
 * and limits to PRICING_PLANS.FREETRIAL, the links to routes that exist, and
 * "only Settings and the plans page stay open" to the proxy's exemptions.
 */

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PRICING_PLANS } from "#config/pricing";
import { BLOG_BANLIST } from "../_shared/blog-banlist";
import {
	dueTrialEmail,
	ENDED_WINDOW_MS,
	isUndeliverableTestAddress,
	TRIAL_EMAIL_KINDS,
	type TrialEmailKind,
	type TrialOwnerState,
	trialEmailCopy,
} from "../_shared/trial-lifecycle";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const NOW = Date.UTC(2026, 10, 24, 18, 0, 0);
const LAUNCH = NOW - 30 * DAY;

// The rules' values, stated here so a change to one is a change to this test.
const TRIAL_DAYS = 14; // set_trial_on_signup: now() + 14 days
const WELCOME_WINDOW_DAYS = 2;
const NUDGE_FROM_DAY = 2;
const NUDGE_UNTIL_DAY = 7;
const ENDING_WINDOW_DAYS = 3;
const MIN_GAP_MS = 20 * HOUR;
const ADD_PROPERTY_PATH = "/properties/new";
const CHOOSE_PLAN_PATH = "/billing/plans";

function repo(relativePath: string): string {
	// Built first and passed as a variable: Vite rewrites a template literal
	// inside `new URL(…, import.meta.url)` as a static asset import.
	const fromHere = "../../../" + relativePath;
	return fileURLToPath(new URL(fromHere, import.meta.url));
}
function read(relativePath: string): string {
	return readFileSync(repo(relativePath), "utf8");
}

/** An owner `daysIn` days into a fresh 14-day trial, signed up at its start. */
function owner(daysIn: number, over: Partial<TrialOwnerState> = {}): TrialOwnerState {
	const start = NOW - daysIn * DAY;
	return {
		status: "trialing",
		subscriptionId: null,
		createdAtMs: start,
		trialEndsAtMs: start + TRIAL_DAYS * DAY,
		hasProperty: false,
		sent: new Set<TrialEmailKind>(),
		lastSentAtMs: null,
		...over,
	};
}

describe("who is due which email", () => {
	it("welcomes a new signup, once", () => {
		expect(dueTrialEmail(owner(0.01), NOW, LAUNCH)).toBe("welcome");
		expect(
			dueTrialEmail(owner(0.01, { sent: new Set(["welcome"]) }), NOW, LAUNCH),
		).toBeNull();
	});

	it("never welcomes an owner who signed up before launch, or too long ago", () => {
		expect(dueTrialEmail(owner(0.01), NOW, NOW)).toBeNull();
		expect(
			dueTrialEmail(owner(WELCOME_WINDOW_DAYS + 0.1, { hasProperty: true }), NOW, LAUNCH),
		).toBeNull();
	});

	it("nudges an owner with no property from day 2 to day 7 of the trial, not after", () => {
		const welcomed = new Set<TrialEmailKind>(["welcome"]);
		expect(dueTrialEmail(owner(1, { sent: welcomed }), NOW, LAUNCH)).toBeNull();
		expect(
			dueTrialEmail(owner(NUDGE_FROM_DAY, { sent: welcomed }), NOW, LAUNCH),
		).toBe("add_first_property");
		expect(
			dueTrialEmail(owner(NUDGE_UNTIL_DAY + 0.5, { sent: welcomed }), NOW, LAUNCH),
		).toBeNull();
		expect(
			dueTrialEmail(owner(3, { sent: welcomed, hasProperty: true }), NOW, LAUNCH),
		).toBeNull();
	});

	it("nudges an extended trial from its new start, not the original signup", () => {
		// The 2026-11-24 extensions: signed up months ago, trial restarted today.
		const extended = owner(3, { createdAtMs: NOW - 120 * DAY });
		expect(dueTrialEmail(extended, NOW, LAUNCH)).toBe("add_first_property");
	});

	it("warns in the last three days, and only once", () => {
		const ending = owner(TRIAL_DAYS - ENDING_WINDOW_DAYS + 0.5, {
			sent: new Set(["welcome", "add_first_property"]),
		});
		expect(dueTrialEmail(ending, NOW, LAUNCH)).toBe("trial_ending");
		expect(
			dueTrialEmail(
				{ ...ending, sent: new Set([...ending.sent, "trial_ending"]) },
				NOW,
				LAUNCH,
			),
		).toBeNull();
	});

	it("says the trial ended, within a week of the end, whether or not the nightly job has expired it yet", () => {
		expect(dueTrialEmail(owner(TRIAL_DAYS + 1, { status: "expired" }), NOW, LAUNCH)).toBe(
			"trial_ended",
		);
		expect(dueTrialEmail(owner(TRIAL_DAYS + 0.1), NOW, LAUNCH)).toBe("trial_ended");
		expect(
			dueTrialEmail(
				owner(TRIAL_DAYS + ENDED_WINDOW_MS / DAY + 0.5, { status: "expired" }),
				NOW,
				LAUNCH,
			),
		).toBeNull();
	});

	it("leaves Stripe-managed trials and paying owners alone", () => {
		expect(dueTrialEmail(owner(0.01, { subscriptionId: "sub_123" }), NOW, LAUNCH)).toBeNull();
		for (const status of ["active", "past_due", "canceled", null]) {
			expect(dueTrialEmail(owner(0.01, { status }), NOW, LAUNCH)).toBeNull();
		}
	});

	it("never sends two emails within the minimum gap", () => {
		const ending = owner(TRIAL_DAYS - 1, {
			sent: new Set(["welcome"]),
			lastSentAtMs: NOW - MIN_GAP_MS + HOUR,
		});
		expect(dueTrialEmail(ending, NOW, LAUNCH)).toBeNull();
		expect(dueTrialEmail({ ...ending, lastSentAtMs: NOW - MIN_GAP_MS }, NOW, LAUNCH)).toBe(
			"trial_ending",
		);
	});
});

describe("addresses that are never emailed", () => {
	it("skips the reserved test domains and the app's own synthetic owners", () => {
		for (const email of [
			"happy@example.com",
			"a@sub.example.org",
			"x@foo.test",
			"x@test.tenantflow.local",
			"x@host.invalid",
			"e2e-owner-a@tenantflow.app",
		]) {
			expect(isUndeliverableTestAddress(email)).toBe(true);
		}
	});
	it("emails real domains, Resend's test inbox included", () => {
		for (const email of ["owner@gmail.com", "delivered+x@resend.dev", "a@examples.com"]) {
			expect(isUndeliverableTestAddress(email)).toBe(false);
		}
	});
});

describe("what the emails say is true", () => {
	const all = TRIAL_EMAIL_KINDS.map((kind) => ({
		kind,
		copy: trialEmailCopy(kind, "Sam", "December 8, 2026, at 7:52 PM UTC"),
	}));
	const text = (c: (typeof all)[number]["copy"]) =>
		[c.subject, c.preheader, c.heading, ...c.paragraphs, c.note ?? ""].join(" ");

	it("states the trial length and limits PRICING_PLANS.FREETRIAL holds", () => {
		const trial = PRICING_PLANS["FREETRIAL"];
		expect(trial?.limits.properties).toBe(1);
		expect(trial?.limits.units).toBe(5);
		expect(trial?.description).toContain(`${TRIAL_DAYS} days`);
		const welcome = all.find((a) => a.kind === "welcome")?.copy;
		expect(welcome && text(welcome)).toContain(`${TRIAL_DAYS}-day free trial`);
		for (const { kind, copy } of all) {
			if (kind === "welcome" || kind === "add_first_property") {
				expect(copy.note).toContain("one property with up to five units");
			}
		}
	});

	it("links to a route that exists, and the plans link stays open to a lapsed owner", () => {
		expect(existsSync(repo(`src/app/(owner)${ADD_PROPERTY_PATH}/page.tsx`))).toBe(true);
		expect(existsSync(repo(`src/app/(owner)${CHOOSE_PLAN_PATH}/page.tsx`))).toBe(true);
		const proxy = read("src/proxy.ts");
		expect(proxy).toMatch(/SUBSCRIPTION_ALLOWLIST_PREFIXES = \[[^\]]*"\/billing\/plans"/);
	});

	it("says only Settings and the plans page stay open after the trial, as the proxy does", () => {
		const proxy = read("src/proxy.ts");
		expect(proxy).toContain('const SUBSCRIPTION_EXEMPT_PREFIXES = ["/settings"] as const;');
		for (const kind of ["trial_ending", "trial_ended"] as const) {
			const copy = all.find((a) => a.kind === kind)?.copy;
			expect(copy && text(copy)).toMatch(/only Settings and the plans page/);
			expect(copy?.ctaPath).toBe(CHOOSE_PLAN_PATH);
		}
	});

	it("uses no phrase the blog's banlist bans, and no em dash", () => {
		for (const { copy } of all) {
			const lower = text(copy).toLowerCase();
			for (const phrase of BLOG_BANLIST) expect(lower).not.toContain(phrase);
			expect(text(copy)).not.toContain("—");
		}
	});

	it("greets by first name, or 'there' without one", () => {
		expect(trialEmailCopy("welcome", "Sam", "x").paragraphs[0]).toBe("Hi Sam,");
		expect(trialEmailCopy("welcome", null, "x").paragraphs[0]).toBe("Hi there,");
		expect(trialEmailCopy("welcome", "  ", "x").paragraphs[0]).toBe("Hi there,");
	});
});

describe("the function and the migration around it", () => {
	const fn = read("supabase/functions/trial-lifecycle/index.ts");
	const migration = read("supabase/migrations/20261124195901_trial_lifecycle_emails.sql");

	it("ships switched off, and the invoker does nothing until the switch is on", () => {
		expect(migration).toMatch(/\('trial_lifecycle\.enabled', 'false'\)/);
		expect(migration).toMatch(/if v_enabled is distinct from 'true' then\s+return;/);
		expect(fn).toMatch(/readConfig\(supabase, "trial_lifecycle\.enabled"\)\) !== "true"/);
	});

	it("checks the Bearer against the database's secret before anything else, and admits nobody when it is unset", () => {
		const auth = fn.indexOf('readConfig(supabase, "trial_lifecycle.secret")');
		expect(auth).toBeGreaterThan(-1);
		expect(fn.indexOf('readConfig(supabase, "trial_lifecycle.enabled")')).toBeGreaterThan(auth);
		expect(fn).toContain("if (!secret || !timingSafeEqualStr(authHeader, `Bearer ${secret}`))");
		expect(migration).toContain("encode(extensions.gen_random_bytes(32), 'hex')");
	});

	it("fails closed on every suppression layer", () => {
		for (const layer of [
			'"is_notification_suppressed"',
			'.from("email_suppressions")',
			'.from("notification_settings")',
			"isUndeliverableTestAddress(owner.email)",
		]) {
			expect(fn).toContain(layer);
		}
		expect(fn).toContain("ns.email === false || ns.general === false");
	});

	it("claims each owner-and-kind once, and sends with the claim as the idempotency key", () => {
		expect(migration).toContain("unique (owner_user_id, kind)");
		expect(fn).toContain("idempotencyKey: `trial-lifecycle-${claimId}`");
		expect(migration).toMatch(/revoke all on table public\.trial_lifecycle_emails from anon, authenticated;/);
		expect(migration).toMatch(/for all to service_role using \(true\) with check \(true\)/);
		expect(migration).toMatch(
			/revoke all on function public\.invoke_trial_lifecycle\(\) from public, anon, authenticated;/,
		);
	});

	it("tells the reader how to stop the emails, with a link to the toggle", () => {
		expect(fn).toContain("/settings?tab=notifications");
		expect(fn).toContain("turn off General notifications");
	});
});
