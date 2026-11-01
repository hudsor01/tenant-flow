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

const CSS = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

type Rgb = [number, number, number];

function block(selector: ":root" | ".dark"): string {
	const pattern =
		selector === ":root"
			? /^:root \{([\s\S]*?)^\}/m
			: /^\.dark \{([\s\S]*?)^\}/m;
	const match = pattern.exec(CSS);
	if (!match?.[1]) {
		throw new Error(`globals.css has no top-level ${selector} block`);
	}
	return match[1];
}

function oklchToken(body: string, name: string): [number, number, number] {
	const match = new RegExp(
		`--${name}:\\s*oklch\\(([\\d.]+)\\s+([\\d.]+)\\s+([\\d.]+)\\)`,
	).exec(body);
	if (!match) {
		throw new Error(`--${name} is not a plain oklch() value`);
	}
	return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function oklchToLinearSrgb([l, c, h]: [number, number, number]): Rgb {
	const a = c * Math.cos((h * Math.PI) / 180);
	const b = c * Math.sin((h * Math.PI) / 180);
	const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
	const clip = (v: number) => Math.min(Math.max(v, 0), 1);
	return [
		clip(4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_),
		clip(-1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_),
		clip(-0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_),
	];
}

const encode = (v: number) =>
	v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
const decode = (v: number) =>
	v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;

/** `fg` at `alpha` over `bg`, composited in gamma-encoded sRGB as painted. */
function over(fg: Rgb, alpha: number, bg: Rgb): Rgb {
	const mix = (f: number, g: number) =>
		decode(alpha * encode(f) + (1 - alpha) * encode(g));
	return [mix(fg[0], bg[0]), mix(fg[1], bg[1]), mix(fg[2], bg[2])];
}

const luminance = ([r, g, b]: Rgb) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

function contrast(x: Rgb, y: Rgb): number {
	const [hi, lo] = [luminance(x), luminance(y)].sort((p, q) => q - p);
	return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

describe("destructive / destructive-foreground contrast (WCAG 1.4.3)", () => {
	it("clears 4.5:1 in light: text-destructive-foreground on bg-destructive", () => {
		const root = block(":root");
		const fill = oklchToLinearSrgb(oklchToken(root, "destructive"));
		const text = oklchToLinearSrgb(oklchToken(root, "destructive-foreground"));
		expect(contrast(fill, text)).toBeGreaterThanOrEqual(4.5);
	});

	it("clears 4.5:1 in dark: bg-destructive/60 over the card", () => {
		const dark = block(".dark");
		const fill = over(
			oklchToLinearSrgb(oklchToken(dark, "destructive")),
			0.6,
			oklchToLinearSrgb(oklchToken(dark, "card")),
		);
		const text = oklchToLinearSrgb(oklchToken(dark, "destructive-foreground"));
		expect(contrast(fill, text)).toBeGreaterThanOrEqual(4.5);
	});
});
