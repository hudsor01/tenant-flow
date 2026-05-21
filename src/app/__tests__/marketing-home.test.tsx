/**
 * Marketing-home de-duplication test — Phase 9 CONS-14 regression pin.
 *
 * CONS-14's de-dup shipped in source already (PR #693, 2026-05-11): the
 * "Why Landlords Choose TenantFlow" ComparisonTable was removed from the
 * homepage and kept only on /features. This source-text scan locks that
 * state so a future edit can't silently re-add the duplicate table to the
 * homepage.
 *
 * The CONS-14 regexes use the `<ComparisonTable` tag form / `\b` word
 * boundaries so they do NOT false-match the unrelated `PricingComparisonTable`
 * component in src/components/pricing/.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const homeSrc = readFileSync(
	resolve(__dirname, "..", "marketing-home.tsx"),
	"utf8",
);
const featuresSrc = readFileSync(
	resolve(__dirname, "..", "features", "features-client.tsx"),
	"utf8",
);

describe("CONS-14 — comparison-table de-duplication", () => {
	it("homepage does NOT render ComparisonTable", () => {
		expect(homeSrc).not.toMatch(/<ComparisonTable\b/);
	});

	it("homepage does NOT import ComparisonTable", () => {
		expect(homeSrc).not.toMatch(/import\s*\{[^}]*\bComparisonTable\b[^}]*\}/);
	});

	it("homepage keeps the CONS-14 removal-marker comment", () => {
		// The comment is the intentional placeholder. Pinning it means a
		// future edit that deletes the comment AND re-adds the table is caught.
		expect(homeSrc).toMatch(/CONS-14/);
	});

	it("/features still renders ComparisonTable (canonical kept instance)", () => {
		expect(featuresSrc).toMatch(/<ComparisonTable\b/);
	});
});
