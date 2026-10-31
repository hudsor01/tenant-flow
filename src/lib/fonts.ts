/**
 * Font definitions file (Next.js docs, "Using a font definitions file").
 *
 * This is a defining module, not a barrel: each font is loaded here exactly
 * once and the root documents (src/app/layout.tsx, src/app/global-error.tsx)
 * import the font objects and put their `.variable` classes on <html>.
 *
 * It defines all three families the app loads. Geist Mono is defined through
 * next/font/local from the geist package's variable woff2, with the same
 * options geist/font/mono uses, so nothing here re-exports another module
 * (CLAUDE.md rule 2).
 */
import { Playfair_Display, Roboto } from "next/font/google";
import localFont from "next/font/local";

// Roboto - clean, geometric sans-serif for body text and UI
export const roboto = Roboto({
	subsets: ["latin"],
	display: "swap",
	variable: "--font-roboto",
	weight: ["300", "400", "500", "700"],
});

// Playfair Display - elegant serif for hero/marketing headlines
export const playfairDisplay = Playfair_Display({
	subsets: ["latin"],
	display: "swap",
	variable: "--font-playfair",
});

// Geist Mono - monospace face for code
export const geistMono = localFont({
	src: "../../node_modules/geist/dist/fonts/geist-mono/GeistMono-Variable.woff2",
	variable: "--font-geist-mono",
	adjustFontFallback: false,
	fallback: [
		"ui-monospace",
		"SFMono-Regular",
		"Roboto Mono",
		"Menlo",
		"Monaco",
		"Liberation Mono",
		"DejaVu Sans Mono",
		"Courier New",
		"monospace",
	],
	weight: "100 900",
});
