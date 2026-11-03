/**
 * WCAG contrast for the theme's own token values, read from `globals.css`.
 *
 * NOT A BARREL FILE. Everything below is declared here and nothing is
 * re-exported (CLAUDE.md zero-tolerance rule 2).
 *
 * A token is read from the top-level `:root` (light) or `.dark` block as a plain
 * `oklch(L C H)` value and converted OKLCH -> OKLab -> linear sRGB, clipped to
 * the sRGB gamut as the browser paints it. A translucent layer is composited in
 * gamma-encoded sRGB, as the browser paints it over its backdrop. Measured
 * against Chrome's own canvas readback under the compiled stylesheet (66.2-39
 * fix round 1), this agrees to 0.01: the light destructive pair read 4.483:1 in
 * Chrome and 4.485 here.
 *
 * This file sits inside the Tailwind source scan, so it names tokens only by
 * their custom property, never in a utility form.
 */

import { escapeRegExp } from "./regexp-source";

export type LinearRgb = [number, number, number];

export type Theme = "light" | "dark";

export function themeBlock(css: string, theme: Theme): string {
	const pattern =
		theme === "light" ? /^:root \{([\s\S]*?)^\}/m : /^\.dark \{([\s\S]*?)^\}/m;
	const match = pattern.exec(css);
	if (!match?.[1]) {
		throw new Error(
			`globals.css has no top-level ${theme === "light" ? ":root" : ".dark"} block`,
		);
	}
	return match[1];
}

export function oklchToken(
	body: string,
	name: string,
): [number, number, number] {
	const match = new RegExp(
		`${escapeRegExp(`--${name}:`)}\\s*oklch\\(([\\d.]+)\\s+([\\d.]+)\\s+([\\d.]+)\\)`,
	).exec(body);
	if (!match) {
		throw new Error(`--${name} is not a plain oklch() value`);
	}
	return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function oklchToLinearSrgb([l, c, h]: [
	number,
	number,
	number,
]): LinearRgb {
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

/** The token `--<name>` of `theme`, as linear sRGB. */
export function tokenColor(css: string, theme: Theme, name: string): LinearRgb {
	return oklchToLinearSrgb(oklchToken(themeBlock(css, theme), name));
}

const encode = (v: number) =>
	v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
const decode = (v: number) =>
	v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;

/** `fg` at `alpha` over `bg`, composited in gamma-encoded sRGB as painted. */
export function over(fg: LinearRgb, alpha: number, bg: LinearRgb): LinearRgb {
	const mix = (f: number, g: number) =>
		decode(alpha * encode(f) + (1 - alpha) * encode(g));
	return [mix(fg[0], bg[0]), mix(fg[1], bg[1]), mix(fg[2], bg[2])];
}

const luminance = ([r, g, b]: LinearRgb) =>
	0.2126 * r + 0.7152 * g + 0.0722 * b;

export function contrast(x: LinearRgb, y: LinearRgb): number {
	const [hi, lo] = [luminance(x), luminance(y)].sort((p, q) => q - p);
	return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}
