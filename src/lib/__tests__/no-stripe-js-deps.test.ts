/**
 * Drift guard: neither @stripe/react-stripe-js nor @stripe/stripe-js
 * may re-enter package.json. Both packages are dead client-side weight
 * (no callers in src/) — landlord-only SaaS has no client-side card
 * collection flow; the Stripe server SDK (@stripe/stripe-node, exported
 * as the `"stripe"` entry) is the only Stripe surface and lives only in
 * Supabase Edge Functions.
 *
 * Sources:
 *  - Phase 14 deferred-items.md flagged @stripe/react-stripe-js as a dead
 *    peer-dep that was dragging @stripe/stripe-js along.
 *  - Phase 15 milestone-cleanup (Plan 15-03) finished the removal and
 *    pinned this regression test as the drift guard.
 *
 * Pure JSON read that never touches the DOM.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("dead Stripe.js packages stay out of package.json", () => {
	const cwd = process.cwd();
	const pkg = JSON.parse(readFileSync(join(cwd, "package.json"), "utf8")) as {
		dependencies?: Record<string, string>;
		devDependencies?: Record<string, string>;
	};

	const BANNED = ["@stripe/react-stripe-js", "@stripe/stripe-js"] as const;

	for (const dep of BANNED) {
		it(`${dep} is not in dependencies`, () => {
			expect(pkg.dependencies?.[dep]).toBeUndefined();
		});
		it(`${dep} is not in devDependencies`, () => {
			expect(pkg.devDependencies?.[dep]).toBeUndefined();
		});
	}
});
