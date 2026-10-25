// Rendered-CSS checks in headless Chromium against the CURRENT src/app/globals.css.
// Read-only: writes to $TW_AUDIT_OUT (default: <tmpdir>/tenantflow-tw-audit).
// Run from the repo root:  node .planning/tailwind-shadcn/audit/render-check.mjs [snapshot-name]
// Prints: font-family resolution, the bg-secondary pixel, contrast for known
// risk pairs, and writes tokens-<snapshot-name>.json (every --color-* token
// resolved to sRGB in light and dark) for before/after parity diffs.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import zlib from "node:zlib";

const ROOT = process.cwd();
const require = createRequire(path.join(ROOT, "package.json"));
const { compile } = await import(require.resolve("@tailwindcss/node"));
const { chromium } = require("playwright");
const OUT = process.env.TW_AUDIT_OUT ?? path.join(os.tmpdir(), "tenantflow-tw-audit");
fs.mkdirSync(OUT, { recursive: true });
const snapshotName = process.argv[2] ?? "current";

const cssPath = path.join(ROOT, "src/app/globals.css");
const css = fs.readFileSync(cssPath, "utf8");
const tokens = [...new Set([...css.matchAll(/--color-([a-z0-9-]+)\s*:/g)].map((m) => m[1]))].filter((t) => !t.includes("*")).sort();

// Class strings under test are read from source so fixes are picked up automatically.
const classOf = (file, needle) => {
	const src = fs.readFileSync(path.join(ROOT, file), "utf8");
	const m = [...src.matchAll(/className="([^"]+)"/g)].find((x) => x[1].includes(needle));
	return m?.[1] ?? null;
};
const proseCases = [
	["lease template preview", classOf("src/components/leases/template/preview-panel.tsx", "prose")],
	["admin blog review", classOf("src/app/(admin)/admin/blog/blog-review-client.tsx", "prose")],
].filter(([, c]) => c);
const pairCases = [
	["renew-lease heading", "bg-popover", "bg-fill-tertiary", "text-label-primary"],
	["renew-lease body", "bg-popover", "bg-fill-tertiary", "text-label-secondary"],
	["renew-lease icon", "bg-popover", "bg-fill-tertiary", "text-label-tertiary"],
	["badge secondary", "bg-background", "bg-secondary", "text-secondary-foreground"],
];

// next/font variables as layout.tsx wires them (names + html vs body placement).
const layout = fs.readFileSync(path.join(ROOT, "src/app/layout.tsx"), "utf8");
const fontVars = [...layout.matchAll(/variable:\s*"(--[\w-]+)"/g)].map((m) => m[1]);
if (/GeistMono/.test(layout)) fontVars.push("--font-geist-mono");
const htmlTag = layout.match(/<html[^>]*>/)?.[0] ?? "";
const onHtml = /\.variable/.test(htmlTag);
const stubFor = (v) => `Stub${v.replace(/[^a-z]/gi, "")}`;
const fontCss = `.next-font-vars { ${fontVars.map((v) => `${v}: "${stubFor(v)}";`).join(" ")} }`;

const candidates = [
	"font-sans", "font-mono", "font-display", "bg-background", "bg-popover", "bg-secondary", "bg-fill-tertiary",
	"text-label-primary", "text-label-secondary", "text-label-tertiary", "text-secondary-foreground",
	"dark:prose-invert", "prose", "prose-sm", "max-w-none", "text-foreground", "text-sm",
	...proseCases.flatMap(([, c]) => c.split(/\s+/)),
	...tokens.map((t) => `bg-${t}`),
];
const compiler = await compile(css, { base: path.dirname(cssPath), from: cssPath, onDependency() {} });
const built = compiler.build(candidates);

const decodePixel = (buf) => {
	let off = 8;
	const idat = [];
	while (off < buf.length) {
		const len = buf.readUInt32BE(off);
		if (buf.toString("ascii", off + 4, off + 8) === "IDAT") idat.push(buf.subarray(off + 8, off + 8 + len));
		off += 12 + len;
	}
	const raw = zlib.inflateSync(Buffer.concat(idat));
	return [raw[1], raw[2], raw[3]];
};

const browser = await chromium.launch();
const result = { fontVars, fontVarsOn: onHtml ? "html" : "body", fonts: {}, secondaryPixel: {}, contrast: {}, tokens: {} };
for (const mode of ["light", "dark"]) {
	const page = await browser.newPage();
	const htmlClass = `${mode}${onHtml ? " next-font-vars" : ""}`;
	const bodyClass = `${onHtml ? "" : "next-font-vars "}font-sans bg-background`;
	await page.setContent(`<!doctype html><html class="${htmlClass}"><head><style>${built}\n${fontCss}</style></head><body class="${bodyClass}">
		<span id="f-mono" class="font-mono">m</span><code id="f-code">c</code><span id="f-display" class="font-display">d</span>
		<div id="sec" class="bg-secondary" style="width:40px;height:40px"></div>
		${pairCases.map(([, outer, inner, fg], i) => `<div class="${outer}"><div class="${inner}"><span id="p${i}" class="${fg}">Sample</span></div></div>`).join("")}
		${proseCases.map(([, c], i) => `<div id="q${i}" class="${c}"><h2>Heading</h2><p>Body <strong>b</strong> <a href="#">a</a></p></div>`).join("")}
		${tokens.map((t) => `<i id="t-${t}" class="bg-${t}"></i>`).join("")}
	</body></html>`);
	const r = await page.evaluate(
		({ pairs, prose, toks }) => {
			const cv = document.createElement("canvas");
			cv.width = cv.height = 1;
			const ctx = cv.getContext("2d", { willReadFrequently: true });
			const rgba = (c) => {
				ctx.clearRect(0, 0, 1, 1);
				ctx.fillStyle = "#000";
				ctx.fillStyle = c;
				ctx.fillRect(0, 0, 1, 1);
				const d = ctx.getImageData(0, 0, 1, 1).data;
				return [d[0], d[1], d[2], +(d[3] / 255).toFixed(3)];
			};
			const over = (t, b) => [0, 1, 2].map((k) => t[k] * t[3] + b[k] * (1 - t[3])).concat(1);
			const lum = (c) => {
				const f = (v) => {
					v /= 255;
					return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
				};
				return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
			};
			const ratio = (fg, bg) => {
				const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
				return +((a + 0.05) / (b + 0.05)).toFixed(2);
			};
			const cs = (el) => getComputedStyle(el);
			const bodyBg = rgba(cs(document.body).backgroundColor);
			const fonts = {
				html: cs(document.documentElement).fontFamily,
				body: cs(document.body).fontFamily,
				fontMono: cs(document.getElementById("f-mono")).fontFamily,
				codeTag: cs(document.getElementById("f-code")).fontFamily,
				fontDisplay: cs(document.getElementById("f-display")).fontFamily,
			};
			const contrast = {};
			pairs.forEach(([name], i) => {
				const span = document.getElementById(`p${i}`);
				const bg = over(rgba(cs(span.parentElement).backgroundColor), over(rgba(cs(span.parentElement.parentElement).backgroundColor), bodyBg));
				contrast[name] = ratio(over(rgba(cs(span).color), bg), bg);
			});
			prose.forEach(([name], i) => {
				const el = document.getElementById(`q${i}`);
				const own = rgba(cs(el).backgroundColor);
				const bg = own[3] ? over(own, bodyBg) : bodyBg;
				for (const sel of ["h2", "p", "strong", "a"]) contrast[`${name} ${sel}`] = ratio(over(rgba(cs(el.querySelector(sel)).color), bg), bg);
			});
			const tokenValues = {};
			for (const t of toks) tokenValues[t] = rgba(cs(document.getElementById(`t-${t}`)).backgroundColor);
			return { fonts, contrast, tokenValues };
		},
		{ pairs: pairCases, prose: proseCases, toks: tokens },
	);
	const box = await page.locator("#sec").boundingBox();
	result.secondaryPixel[mode] = `rgb(${decodePixel(await page.screenshot({ clip: { x: box.x + 20, y: box.y + 20, width: 1, height: 1 } })).join(", ")})`;
	result.fonts[mode] = r.fonts;
	result.contrast[mode] = r.contrast;
	result.tokens[mode] = r.tokenValues;
	await page.close();
}
await browser.close();

const snapFile = path.join(OUT, `tokens-${snapshotName}.json`);
fs.writeFileSync(snapFile, JSON.stringify(result.tokens, null, 1));
const { tokens: _omit, ...printable } = result;
console.log(JSON.stringify(printable, null, 1));
console.log(`\n${tokens.length} --color-* tokens snapshotted to ${snapFile}`);
console.log("Expect after the fixes: every font resolves to its Stub family; secondary pixel != rgb(255, 0, 255); every contrast >= 4.5 (3 for the icon pair).");
