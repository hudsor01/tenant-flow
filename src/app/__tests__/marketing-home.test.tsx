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
	it("homepage does NOT import ComparisonTable (named, braceless, or aliased)", () => {
		// Scan every `import ... from` statement for ComparisonTable in any
		// form: named (`import { ComparisonTable }`), braceless default
		// (`import ComparisonTable from`), and aliased
		// (`import { ComparisonTable as Cmp }`). The `\b` boundary keeps the
		// unrelated `PricingComparisonTable` component from false-matching.
		const importLines = homeSrc.match(/^import .+ from .+$/gm) ?? [];
		for (const line of importLines) {
			expect(line).not.toMatch(/\bComparisonTable\b/);
		}
	});

	it("homepage does NOT render ComparisonTable (direct or aliased)", () => {
		// Direct usage: `<ComparisonTable />`.
		expect(homeSrc).not.toMatch(/<ComparisonTable\b/);
		// Aliased usage: if a future edit re-adds the table under an alias
		// (`import { ComparisonTable as Cmp }` + `<Cmp />`), the import scan
		// above catches the import; this also catches the JSX tag by
		// resolving any alias the import would have introduced.
		const aliasMatch = homeSrc.match(
			/import\s*\{[^}]*\bComparisonTable\s+as\s+(\w+)[^}]*\}/,
		);
		if (aliasMatch?.[1]) {
			expect(homeSrc).not.toMatch(new RegExp(`<${aliasMatch[1]}\\b`));
		}
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
