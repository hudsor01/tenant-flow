/**
 * CONS-06 regression pin: canonical "Contact Sales" CTA label.
 *
 * The sales-contact CTA label was canonicalized to "Contact Sales"
 * (PROJECT.md Key Decisions). Four prior variants were killed:
 * "Talk to Sales", "Connect with sales", "Schedule a walkthrough",
 * "Schedule a demo". This pure source-text scan fails CI if any killed
 * variant reappears in a marketing CTA file, or if the canonical
 * "Contact Sales" label disappears from every scanned file.
 *
 * Pure source scan that never touches the DOM.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("CONS-06: canonical Contact Sales label", () => {
	const cwd = process.cwd();

	// Verified killed via `grep` — zero matches across `src/`. Any
	// reappearance in a CTA file is a copy-edit regression.
	const KILLED_VARIANTS = [
		"Talk to Sales",
		"Connect with sales",
		"Schedule a walkthrough",
		"Schedule a demo",
	] as const;

	// CONS-06 scope: "Contact Sales" appears in 12 locations across these
	// 7 files (wider than 10-CONTEXT's "4 string swaps" — see 10-RESEARCH.md).
	const CTA_FILES = [
		"src/app/about/page.tsx",
		"src/app/pricing/pricing-content.tsx",
		"src/app/faq/page.tsx",
		"src/app/help/page.tsx",
		"src/components/sections/home-faq.tsx",
		"src/components/pricing/kibo-style-pricing.tsx",
		"src/components/pricing/pricing-card-standard.tsx",
	] as const;

	for (const rel of CTA_FILES) {
		it(`${rel} uses no killed CTA-label variant`, () => {
			const content = readFileSync(join(cwd, rel), "utf8");
			for (const variant of KILLED_VARIANTS) {
				expect(content, `${rel} still contains "${variant}"`).not.toContain(
					variant,
				);
			}
		});
	}

	it("at least one canonical 'Contact Sales' label exists across CTA files", () => {
		const present = CTA_FILES.some((rel) =>
			readFileSync(join(cwd, rel), "utf8").includes("Contact Sales"),
		);
		expect(present, "no file carries the canonical 'Contact Sales' label").toBe(
			true,
		);
	});
});
