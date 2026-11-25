import { readFile } from "node:fs/promises";
import { join } from "node:path";

// The fonts every OG image renders with: the page cards (`./og-card.tsx`) and
// the blog covers (`./blog-cover.tsx`).

/**
 * The font with its GPOS table hidden, so it draws unkerned.
 *
 * satori sizes a word by adding up each character's advance on its own, with
 * no kerning between them, and then opentype.js draws the word with the
 * font's GPOS kerning. Geist kerns pairs like "Te" tightly, so a word such as
 * "TenantFlow" drew narrower than the box satori gave it, and the slack read
 * as a double space after it. Renaming the table's tag in the directory (to a
 * private tag nothing reads) makes the drawing match the measurement. Geist
 * has no legacy `kern` table, so nothing else kerns.
 */
function withoutKerning(font: Buffer): Buffer {
	const copy = Buffer.from(font);
	const tables = copy.readUInt16BE(4);
	for (let i = 0; i < tables; i++) {
		const record = 12 + i * 16;
		if (copy.toString("latin1", record, record + 4) === "GPOS") {
			copy.write("gpos", record, "latin1");
		}
	}
	return copy;
}

/**
 * Geist Medium and Bold, from the `geist` dependency. `next/og` bundles only
 * its regular weight, so without these a bold style renders regular. The paths
 * are literal so the build traces exactly these two files into the blog cover
 * route's function (it renders on request); a computed path traced the whole
 * font folder.
 */
type OgFont = {
	name: string;
	data: Buffer;
	weight: 500 | 700;
	style: "normal";
};
let fonts: Promise<OgFont[]> | null = null;
export function readOgFonts(): Promise<OgFont[]> {
	fonts ??= Promise.all([
		readFile(
			join(
				process.cwd(),
				"node_modules/geist/dist/fonts/geist-sans/Geist-Medium.ttf",
			),
		),
		readFile(
			join(
				process.cwd(),
				"node_modules/geist/dist/fonts/geist-sans/Geist-Bold.ttf",
			),
		),
	]).then(([medium, bold]) => [
		{
			name: "Geist",
			data: withoutKerning(medium),
			weight: 500,
			style: "normal",
		},
		{ name: "Geist", data: withoutKerning(bold), weight: 700, style: "normal" },
	]);
	return fonts;
}
