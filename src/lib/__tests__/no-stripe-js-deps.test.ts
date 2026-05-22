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
import { beforeAll, describe, expect, it } from "vitest";

type PackageJson = {
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
	optionalDependencies?: Record<string, string>;
};

const ROOTS = [
	"dependencies",
	"devDependencies",
	"peerDependencies",
	"optionalDependencies",
] as const;

const BANNED = ["@stripe/react-stripe-js", "@stripe/stripe-js"] as const;

describe("dead Stripe.js packages stay out of package.json", () => {
	// IN-01 fix: defer the read+parse until beforeAll so a malformed or missing
	// package.json produces a clean per-suite failure instead of an unrelated
	// module-load collection error.
	let pkg: PackageJson;

	beforeAll(() => {
		pkg = JSON.parse(
			readFileSync(join(process.cwd(), "package.json"), "utf8"),
		) as PackageJson;
	});

	// IN-02 fix: pin all four dependency roots. The original regression path
	// recorded in Phase 14 deferred-items.md was specifically a peerDependency
	// of @stripe/react-stripe-js dragging @stripe/stripe-js into the lockfile,
	// so peerDependencies + optionalDependencies coverage closes the named gap.
	for (const dep of BANNED) {
		for (const root of ROOTS) {
			it(`${dep} is not in ${root}`, () => {
				expect(pkg[root]?.[dep]).toBeUndefined();
			});
		}
	}
});
