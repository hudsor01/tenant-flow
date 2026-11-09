/**
 * The tier gate's refusal (66.2-39 fix round 4, Part 8n).
 *
 * WHAT THIS FILE PROVES BY EXECUTION. Section 1 imports
 * `../_shared/tier-gate-decision` (extension-less, as `rate-limit.test.ts`
 * imports its leaf) and runs the real decision: an owner on Growth or Max whose
 * subscription the gate does not admit (`past_due` reaches it in the app) is
 * refused with Billing Settings and the subscription named, never "requires a
 * Growth or Max subscription" and the plans page, which told them to upgrade a
 * plan they have.
 *
 * WHAT IT PROVES ONLY STRUCTURALLY. `_shared/tier-gate.ts` reads the owner's
 * row and writes `gate_events` through Deno modules Vitest cannot import, so
 * section 2 reads it off disk: its 402 body is the leaf's refusal, and its
 * admitted set is `active` and `trialing`. The in-process Deno test
 * `tests/export-report-test.ts` runs the whole gate for a past-due Growth owner.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
	TIER_GATE_REFUSAL_REASONS,
	tierGateRefusal,
} from "../_shared/tier-gate-decision";

const SOURCE = "reports_gate";
const BILLING_SETTINGS_PATH = "/settings?tab=billing";
const PAST_DUE_MESSAGE =
	"Your plan includes this, but it is paused while your subscription payment is past due. Update your payment method in Billing Settings.";
const SUBSCRIPTION_INACTIVE_MESSAGE =
	"Your plan includes this, but your subscription is not active. Check it in Billing Settings.";
const PLAN_REQUIRED_MESSAGE =
	"This feature requires a Growth or Max subscription.";

describe("tierGateRefusal", () => {
	it("admits an entitled plan whose subscription the gate admits", () => {
		expect(
			tierGateRefusal({
				onEntitledPlan: true,
				hasActiveSub: true,
				status: "active",
				upgradeSource: SOURCE,
			}),
		).toBeNull();
	});

	it("refuses a past-due Growth or Max owner with Billing Settings, not an upgrade", () => {
		expect(
			tierGateRefusal({
				onEntitledPlan: true,
				hasActiveSub: false,
				status: "past_due",
				upgradeSource: SOURCE,
			}),
		).toEqual({
			error: PAST_DUE_MESSAGE,
			reason: "subscription_inactive",
			upgrade_required: false,
			upgrade_url: BILLING_SETTINGS_PATH,
		});
	});

	it("names the subscription, not the plan, for every other status an entitled plan is refused with", () => {
		for (const status of [
			"unpaid",
			"canceled",
			"paused",
			"incomplete",
			"incomplete_expired",
			"expired",
			null,
		]) {
			expect(
				tierGateRefusal({
					onEntitledPlan: true,
					hasActiveSub: false,
					status,
					upgradeSource: SOURCE,
				}),
				String(status),
			).toEqual({
				error: SUBSCRIPTION_INACTIVE_MESSAGE,
				reason: "subscription_inactive",
				upgrade_required: false,
				upgrade_url: BILLING_SETTINGS_PATH,
			});
		}
	});

	it("sends a plan without the feature to the plans page whatever the status", () => {
		for (const [status, hasActiveSub] of [
			["active", true],
			["trialing", true],
			["past_due", false],
			[null, false],
		] as const) {
			expect(
				tierGateRefusal({
					onEntitledPlan: false,
					hasActiveSub,
					status,
					upgradeSource: SOURCE,
				}),
				String(status),
			).toEqual({
				error: PLAN_REQUIRED_MESSAGE,
				reason: "plan",
				upgrade_required: true,
				upgrade_url: "/billing/plans?source=reports_gate",
			});
		}
	});

	it("writes only the reasons it lists", () => {
		expect(TIER_GATE_REFUSAL_REASONS).toEqual(["plan", "subscription_inactive"]);
	});
});

function readRepoSource(relativePath: string): string {
	return readFileSync(
		fileURLToPath(new URL(relativePath, import.meta.url)),
		"utf8",
	);
}

describe("tier-gate.ts answers with the leaf's refusal", () => {
	const gate = readRepoSource("../_shared/tier-gate.ts")
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.replace(/^[ \t]*\/\/.*$/gm, "");

	it("builds its 402 body from tierGateRefusal, with no message of its own", () => {
		expect(gate).toMatch(
			/import \{ tierGateRefusal \} from "\.\/tier-gate-decision\.ts";/,
		);
		expect(gate).toMatch(/const refusal = tierGateRefusal\(\{/);
		expect(gate).toMatch(/if \(refusal === null\) return null;/);
		expect(gate).toMatch(/JSON\.stringify\(\{\s*\.\.\.refusal,/);
		expect(gate).not.toMatch(/requires a Growth or Max/);
		expect(gate).not.toMatch(/upgrade_url:/);
	});

	it("admits active and trialing only, so a past-due owner is refused", () => {
		const declaration = gate.match(
			/const ACTIVE_SUB_STATUSES[^=]*=\s*new Set\(\[([\s\S]*?)\]\)/,
		);
		expect(declaration?.[1]?.match(/"[a-z_]+"/g)).toEqual([
			'"active"',
			'"trialing"',
		]);
	});
});
