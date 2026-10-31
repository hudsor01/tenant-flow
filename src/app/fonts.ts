import localFont from "next/font/local";

// Roboto and Playfair Display ship as npm packages (Fontsource, built from
// github.com/google/fonts) instead of next/font/google, so `next build` never
// fetches from Google: the files are pinned and integrity-checked by bun.lock.
//
// Each subset is its own localFont call with the unicode-range from the
// package's wght.css, so a browser downloads latin-ext or vietnamese only when
// a page contains those glyphs (tenant names such as "Nguyễn" or "Dvořák").
// Only latin is preloaded and carries the CSS variable and fallback. The
// other subsets are exported only so TypeScript does not flag them as unused;
// nothing imports them, and loading this module emits their faces.
//
// Roboto declares four single-weight faces over the same variable file, as
// Google's CSS did: font matching then renders 600 (font-semibold) at 700 and
// 900 at 700, so text weights are unchanged. Playfair keeps its 400-900 range.
//
// The font-family declaration must equal the latin call's const name:
// next/font builds the CSS variable from the const name, not from
// `declarations`, so any other value leaves the subsets on a family the
// variable never names. next/font requires literal arguments, which is why
// the ranges are repeated rather than shared.

// Roboto - clean, geometric sans-serif for body text and UI
export const roboto = localFont({
	src: [
		{
			path: "../../node_modules/@fontsource-variable/roboto/files/roboto-latin-wght-normal.woff2",
			weight: "300",
		},
		{
			path: "../../node_modules/@fontsource-variable/roboto/files/roboto-latin-wght-normal.woff2",
			weight: "400",
		},
		{
			path: "../../node_modules/@fontsource-variable/roboto/files/roboto-latin-wght-normal.woff2",
			weight: "500",
		},
		{
			path: "../../node_modules/@fontsource-variable/roboto/files/roboto-latin-wght-normal.woff2",
			weight: "700",
		},
	],
	display: "swap",
	variable: "--font-sans",
	adjustFontFallback: "Arial",
	declarations: [
		{ prop: "font-family", value: "roboto" },
		{
			prop: "unicode-range",
			value:
				"U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD",
		},
	],
});

export const robotoLatinExt = localFont({
	src: [
		{
			path: "../../node_modules/@fontsource-variable/roboto/files/roboto-latin-ext-wght-normal.woff2",
			weight: "300",
		},
		{
			path: "../../node_modules/@fontsource-variable/roboto/files/roboto-latin-ext-wght-normal.woff2",
			weight: "400",
		},
		{
			path: "../../node_modules/@fontsource-variable/roboto/files/roboto-latin-ext-wght-normal.woff2",
			weight: "500",
		},
		{
			path: "../../node_modules/@fontsource-variable/roboto/files/roboto-latin-ext-wght-normal.woff2",
			weight: "700",
		},
	],
	display: "swap",
	preload: false,
	adjustFontFallback: false,
	declarations: [
		{ prop: "font-family", value: "roboto" },
		{
			prop: "unicode-range",
			value:
				"U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF",
		},
	],
});

export const robotoVietnamese = localFont({
	src: [
		{
			path: "../../node_modules/@fontsource-variable/roboto/files/roboto-vietnamese-wght-normal.woff2",
			weight: "300",
		},
		{
			path: "../../node_modules/@fontsource-variable/roboto/files/roboto-vietnamese-wght-normal.woff2",
			weight: "400",
		},
		{
			path: "../../node_modules/@fontsource-variable/roboto/files/roboto-vietnamese-wght-normal.woff2",
			weight: "500",
		},
		{
			path: "../../node_modules/@fontsource-variable/roboto/files/roboto-vietnamese-wght-normal.woff2",
			weight: "700",
		},
	],
	display: "swap",
	preload: false,
	adjustFontFallback: false,
	declarations: [
		{ prop: "font-family", value: "roboto" },
		{
			prop: "unicode-range",
			value:
				"U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB",
		},
	],
});

// Playfair Display - elegant serif for hero/marketing headlines
export const playfairDisplay = localFont({
	src: "../../node_modules/@fontsource-variable/playfair-display/files/playfair-display-latin-wght-normal.woff2",
	weight: "400 900",
	display: "swap",
	variable: "--font-display",
	adjustFontFallback: "Times New Roman",
	declarations: [
		{ prop: "font-family", value: "playfairDisplay" },
		{
			prop: "unicode-range",
			value:
				"U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD",
		},
	],
});

export const playfairDisplayLatinExt = localFont({
	src: "../../node_modules/@fontsource-variable/playfair-display/files/playfair-display-latin-ext-wght-normal.woff2",
	weight: "400 900",
	display: "swap",
	preload: false,
	adjustFontFallback: false,
	declarations: [
		{ prop: "font-family", value: "playfairDisplay" },
		{
			prop: "unicode-range",
			value:
				"U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF",
		},
	],
});

export const playfairDisplayVietnamese = localFont({
	src: "../../node_modules/@fontsource-variable/playfair-display/files/playfair-display-vietnamese-wght-normal.woff2",
	weight: "400 900",
	display: "swap",
	preload: false,
	adjustFontFallback: false,
	declarations: [
		{ prop: "font-family", value: "playfairDisplay" },
		{
			prop: "unicode-range",
			value:
				"U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB",
		},
	],
});
