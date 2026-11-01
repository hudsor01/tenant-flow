/**
 * The destructive fill and its foreground token clear WCAG AA (4.5:1) for
 * normal-size text in both themes. Every destructive Button, the destructive
 * Badge and the raw destructive controls (GDPR, account data, image remove)
 * set `text-destructive-foreground` on `bg-destructive` (dark:
 * `bg-destructive/60` over the card), at 12-14px.
 *
 * The values are read from globals.css (`:root` and `.dark`) and converted
 * OKLCH -> OKLab -> linear sRGB, clipped to the sRGB gamut as the browser
 * paints it. Measured in Chrome (canvas readback, 66.2-39 fix round 1) the
 * light pair was 4.483:1 at `oklch(0.98 0.01 90)`, under AA; this conversion
 * reads 4.485 for the same values. `oklch(0.99 0.006 90)` measured 4.629:1.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
	contrast,
	oklchToken,
	oklchToLinearSrgb,
	over,
	themeBlock,
} from "#test/utils/oklch-contrast";

const CSS = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

describe("destructive / destructive-foreground contrast (WCAG 1.4.3)", () => {
	it("clears 4.5:1 in light: text-destructive-foreground on bg-destructive", () => {
		const root = themeBlock(CSS, "light");
		const fill = oklchToLinearSrgb(oklchToken(root, "destructive"));
		const text = oklchToLinearSrgb(oklchToken(root, "destructive-foreground"));
		expect(contrast(fill, text)).toBeGreaterThanOrEqual(4.5);
	});

	it("clears 4.5:1 in dark: bg-destructive/60 over the card", () => {
		const dark = themeBlock(CSS, "dark");
		const fill = over(
			oklchToLinearSrgb(oklchToken(dark, "destructive")),
			0.6,
			oklchToLinearSrgb(oklchToken(dark, "card")),
		);
		const text = oklchToLinearSrgb(oklchToken(dark, "destructive-foreground"));
		expect(contrast(fill, text)).toBeGreaterThanOrEqual(4.5);
	});
});
