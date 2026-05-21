import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Raw-source regression pin for the /resources page design tokens.
 *
 * The /resources page (TOKEN-01 + the /resources half of TOKEN-02) shipped
 * already tokenized. This test reads page.tsx as raw text and asserts the
 * token state holds — it does NOT render the component. Mirrors the
 * readFileSync-of-a-page assertion pattern in src/app/sitemap.test.ts.
 */
const SOURCE = readFileSync(
	join(process.cwd(), "src/app/resources/page.tsx"),
	"utf8",
);

describe("Resources page design tokens (TOKEN-01, TOKEN-02)", () => {
	it("download tags use Badge variant=secondary (no neon pink)", () => {
		expect(
			SOURCE,
			"TOKEN-01: /resources download tags must stay token-based Badge variant=secondary",
		).toContain('<Badge variant="secondary">');
	});

	it("download cards use the bg-card surface token", () => {
		expect(
			SOURCE,
			"TOKEN-01: /resources download cards must use the bg-card surface token",
		).toContain("bg-card");
	});

	it("uses no hex color literals", () => {
		expect(
			SOURCE,
			"TOKEN-02: /resources must not introduce hex color literals",
		).not.toMatch(/#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/);
	});

	it("uses no rgb()/rgba() color literals", () => {
		expect(
			SOURCE,
			"TOKEN-02: /resources must not introduce rgb()/rgba() color literals",
		).not.toMatch(/\brgba?\s*\(/i);
	});

	it("uses no bg-white class", () => {
		expect(
			SOURCE,
			"TOKEN-02: /resources must use bg-card/bg-background, never bg-white",
		).not.toMatch(/\bbg-white(?:\/(?:\d{1,3}|\[[^\]]+\]))?\b/);
	});

	it("uses no non-zero inline millisecond durations", () => {
		expect(
			SOURCE,
			"TOKEN-02: /resources must not introduce non-zero inline-ms durations",
		).not.toMatch(
			/\[\s*[a-z-]*:?\s*[1-9]\d*ms\s*\]|["'`]\s*[1-9]\d*ms\s*["'`]/,
		);
	});

	it("color gradients use color-mix token form", () => {
		expect(
			SOURCE,
			"TOKEN-02: /resources gradients must use color-mix over var(--color-primary)",
		).toContain("color-mix(in_oklch,var(--color-primary)");
	});
});
