/**
 * WCAG contrast for the theme's own token values, read from `globals.css`.
 *
 * NOT A BARREL FILE. Everything below is declared here and nothing is
 * re-exported (CLAUDE.md zero-tolerance rule 2).
 *
 * A token is read from the top-level `:root` (light) or `.dark` block as a plain
 * `oklch(L C H)` value and converted OKLCH -> OKLab -> linear sRGB. Colors are
 * then measured as the page paints them, on an 8-bit surface: an opaque color
 * is clipped to the sRGB gamut and stored at 8 bits per channel, and a
 * translucent layer is composited in gamma-encoded sRGB over the stored
 * backdrop, with a channel above 1 kept as it is (Chrome clips the result, not
 * the layer), and the result stored at 8 bits again. A channel below 0 is
 * clipped at the start.
 *
 * Measured against Chrome's screenshots of the page under the compiled
 * stylesheet (66.2-39 fix round 4, Part 8b: 6 tints at 5, 10, 15 and 20% over
 * the page, card, popover and muted surfaces, and 16 opaque tokens, both
 * themes), 218 of 224 pixels match exactly and the rest by one level; the 192
 * tint pairs read against their `-text` companions agree to within 0.032. The
 * unrounded, layer-clipped math this replaced was up to 9 levels and 0.14 off
 * (the dark primary's blue is 1.437), and read the badge's success hover at
 * 9.44 / 9.07 in dark where the page paints 9.42 / 8.99. oklch(0.99 0.006 90)
 * on --destructive reads 4.629 and accent-foreground on accent 4.657, as
 * Chrome's canvas did (fix rounds 1 and 3).
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
	// A channel below 0 is clipped; one above 1 is kept until the color is
	// painted, because Chrome composites a translucent layer with it and clips
	// the result (the dark primary's blue is 1.437: at 20% over the dark
	// background it paints blue 73 where a clipped value gives 65).
	const floor = (v: number) => Math.max(v, 0);
	return [
		floor(4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_),
		floor(-1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_),
		floor(-0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_),
	];
}

/** The token `--<name>` of `theme`, as linear sRGB. */
export function tokenColor(css: string, theme: Theme, name: string): LinearRgb {
	return oklchToLinearSrgb(oklchToken(themeBlock(css, theme), name));
}

/** `color` as the page stores it: clipped to the gamut, at 8 bits per channel, back in linear sRGB. */
function painted(color: LinearRgb): LinearRgb {
	const channel = (v: number) =>
		decode(Math.round(encode(Math.min(Math.max(v, 0), 1)) * 255) / 255);
	return [channel(color[0]), channel(color[1]), channel(color[2])];
}

const encode = (v: number) =>
	v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
const decode = (v: number) =>
	v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;

/** `fg` at `alpha` over `bg`, composited in gamma-encoded sRGB and stored at 8 bits, as painted. */
export function over(fg: LinearRgb, alpha: number, bg: LinearRgb): LinearRgb {
	const under = painted(bg);
	const mix = (f: number, g: number) =>
		decode(alpha * encode(f) + (1 - alpha) * encode(g));
	return painted([
		mix(fg[0], under[0]),
		mix(fg[1], under[1]),
		mix(fg[2], under[2]),
	]);
}

const luminance = ([r, g, b]: LinearRgb) =>
	0.2126 * r + 0.7152 * g + 0.0722 * b;

/** The WCAG ratio of `x` and `y` as the page paints them. */
export function contrast(x: LinearRgb, y: LinearRgb): number {
	const [hi, lo] = [luminance(painted(x)), luminance(painted(y))].sort(
		(p, q) => q - p,
	);
	return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}
