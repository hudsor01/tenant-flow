/**
 * Nav suppression source-scan — Phase 15-05 regression pin.
 *
 * `/blog` is deliberately absent from `DEFAULT_NAV_ITEMS` until the first
 * content cohort publishes (AUDIT-2, 2026-05-18; see comment in
 * `src/components/layout/navbar/types.ts` lines 31-39). This source-scan
 * pins BOTH the structural absence AND the documenting comment so a
 * future edit that removes the suppression has to touch both signals
 * (deliberate un-deferral, not accidental drift).
 *
 * Belt-and-suspenders with `nav-blog-suppression-render.test.tsx` per
 * D-13: source-scan catches direct edits to `DEFAULT_NAV_ITEMS`; the
 * render test catches any hook/config-injected blog link reaching the
 * rendered nav surface.
 *
 * Pure source scan — no jsdom.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { DEFAULT_NAV_ITEMS } from "#components/layout/navbar/types";

describe("/blog deliberately absent from DEFAULT_NAV_ITEMS (AUDIT-2 deferral pin)", () => {
	it("no top-level nav item targets /blog", () => {
		for (const item of DEFAULT_NAV_ITEMS) {
			expect(item.href).not.toBe("/blog");
		}
	});

	it("no dropdown item targets /blog", () => {
		for (const item of DEFAULT_NAV_ITEMS) {
			// `in` narrowing mirrors types.test.ts line 26 — `as const satisfies`
			// produces a discriminated union where only dropdown-owner items
			// expose `dropdownItems`.
			if (!("dropdownItems" in item)) continue;
			for (const sub of item.dropdownItems) {
				expect(sub.href).not.toBe("/blog");
			}
		}
	});

	it("types.ts retains the AUDIT-2 deferral comment naming /blog", () => {
		const source = readFileSync(
			join(process.cwd(), "src/components/layout/navbar/types.ts"),
			"utf8",
		);
		// Three independent signals must coexist so removing any one fails
		// the test — the AUDIT-2 reference, the "deferr*" explainer keyword
		// (matches deferred / deferral), and the route token. Future
		// un-deferral must edit the comment AND drop these assertions.
		expect(source).toMatch(/AUDIT-2/);
		expect(source).toMatch(/deferr/i);
		expect(source).toMatch(/\/blog/);
	});
});
