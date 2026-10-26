// Rendered-CSS checks in headless Chromium against the CURRENT src/app/globals.css.
// Read-only against the repo: writes only to $TW_AUDIT_OUT (default: <tmpdir>/tenantflow-tw-audit).
//
// Usage (from the repo root):
//   node .planning/tailwind-shadcn/audit/render-check.mjs [label] [--tokens <file>]
//   node .planning/tailwind-shadcn/audit/render-check.mjs --self-test
//
//   label            snapshot label, default "current"
//   --tokens <file>  fixed token list: a JSON array of token names, or a prior
//                    tokens-<label>.json (its light keys are used). Without it the
//                    list is every --color-* name defined in globals.css.
//   --self-test      parser checks against inline fixtures; no Chromium.
//
// Outputs:
//   $TW_AUDIT_OUT/tokens-<label>.json  { light: { <token>: [r,g,b,a] }, dark: {...} }
//                                      (a name that is not defined resolves to [0,0,0,0])
//   $TW_AUDIT_OUT/render-<label>.json  { label, tokenListSource, tokenCount, fontVarsSource,
//                                      fontVars, fontVarsOn, globalError, fonts, secondaryPixel,
//                                      pairs, contrast, touch390 }
//   stdout                             exactly the render-<label>.json object (2-space JSON);
//                                      the snapshot path goes to stderr.
//
// Every class string under test is read from source, so fixes are picked up without edits:
//   - fonts: `variable: "--…"` from src/lib/fonts.ts when it exists, else src/app/layout.tsx;
//     --font-geist-mono is listed exactly once (appended for a geist/font/mono import);
//     html vs body placement from layout.tsx, and from global-error.tsx (html, body or none).
//   - pairs: the Renew Lease surfaces from CurrentLeaseInfo and its Calendar icon in
//     renew-lease-form-fields.tsx, on the DialogContent base surface from dialog.tsx.
//   - touch390: the switch.tsx root/thumb strings, the button.tsx cva base + secondary
//     variant + size default/icon, the input.tsx cva base + inputSize default, plus the
//     PLAN 4.8 fixtures (icon button size-8, input h-9 px-3 py-1), at a 390x844 viewport.
//
// Expected once the wave-1 fixes land: every font resolves to its Stub family, the secondary
// pixel is no longer the magenta sentinel [255,0,255], every contrast >= 4.5 (3 for the icon
// pair), and the Switch is no longer a 44x44 box with 12px padding.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import zlib from "node:zlib";

const ROOT = process.cwd();
const require = createRequire(path.join(ROOT, "package.json"));
const { __unstable__loadDesignSystem, compile } = await import(require.resolve("@tailwindcss/node"));

const cssPath = path.join(ROOT, "src/app/globals.css");
const base = path.dirname(cssPath);
const readRepo = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

// ---------- pure parsing helpers (shared by --self-test and the real run) ----------

export function parseArgs(argv) {
	const out = { label: "current", tokens: null, selfTest: false };
	let labelSet = false;
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === "--self-test") out.selfTest = true;
		else if (a === "--tokens") {
			const v = argv[++i];
			if (!v) throw new Error("--tokens needs a file argument");
			out.tokens = v;
		} else if (a.startsWith("--")) throw new Error(`unknown flag ${a}`);
		else if (!labelSet) {
			out.label = a;
			labelSet = true;
		} else throw new Error(`unexpected argument ${a}`);
	}
	return out;
}

export function tokensFromCss(cssText) {
	return [...new Set([...cssText.matchAll(/--color-([a-z0-9-]+)\s*:/g)].map((m) => m[1]))].filter((t) => !t.includes("*")).sort();
}

export function tokensFromFile(json) {
	if (Array.isArray(json)) return json.map(String);
	if (json && typeof json === "object" && json.light && typeof json.light === "object") return Object.keys(json.light);
	throw new Error("--tokens file must be a JSON array of names or a tokens-<label>.json snapshot");
}

const GEIST_MONO_IMPORT = /from\s+["']geist\/font\/mono["']/;
export function collectFontVars(fontSrc, layoutSrc = fontSrc) {
	const vars = [...new Set([...fontSrc.matchAll(/variable:\s*"(--[\w-]+)"/g)].map((m) => m[1]))];
	if (!vars.includes("--font-geist-mono") && (GEIST_MONO_IMPORT.test(fontSrc) || GEIST_MONO_IMPORT.test(layoutSrc))) vars.push("--font-geist-mono");
	return vars;
}

const tagOf = (src, tag) => src.match(new RegExp(`<${tag}(?=[\\s>])[^>]*>`))?.[0] ?? "";
export function fontPlacement(src, { allowNone = false } = {}) {
	if (/\.variable/.test(tagOf(src, "html"))) return "html";
	if (!allowNone) return "body";
	return /\.variable/.test(tagOf(src, "body")) ? "body" : "none";
}

const stringLiterals = (src) => [...src.matchAll(/"([^"\n]*)"/g)].map((m) => ({ value: m[1], index: m.index }));
const words = (s) => s.split(/\s+/).filter(Boolean);
const firstStringAfter = (src, from, what) => {
	if (from < 0) throw new Error(`${what}: anchor not found`);
	const lit = stringLiterals(src).find((l) => l.index >= from);
	if (!lit) throw new Error(`${what}: no string literal after anchor`);
	return lit.value;
};
const indexAfter = (src, re, from = 0) => {
	const m = re.exec(src.slice(from));
	return m ? from + m.index + m[0].length : -1;
};

// The DialogContent base: the first string literal holding both `fixed` and `z-50`
// (the overlay literal, which also covers `inset-0`, is skipped).
export function dialogSurfaceClasses(dialogSrc) {
	const lit = stringLiterals(dialogSrc).find((l) => {
		const w = words(l.value);
		return w.includes("fixed") && w.includes("z-50") && !w.includes("inset-0");
	});
	if (!lit) throw new Error("pair outer: no dialog.tsx string literal with fixed and z-50");
	return words(lit.value);
}

// Class strings of CurrentLeaseInfo: its first <div>, first <h4>, the space-y-1 block after
// the h4, and the <Calendar> icon.
export function renewLeaseClassStrings(src) {
	const fnAt = src.indexOf("export function CurrentLeaseInfo");
	if (fnAt < 0) throw new Error("renew-lease: export function CurrentLeaseInfo not found");
	const after = src.slice(fnAt);
	const inner = after.match(/<div\s+className="([^"]+)"/)?.[1];
	const h4m = after.match(/<h4\s+className="([^"]+)"/);
	const heading = h4m?.[1];
	const afterH4 = h4m ? after.slice(h4m.index + h4m[0].length) : "";
	const body = [...afterH4.matchAll(/className="([^"]+)"/g)].map((m) => m[1]).find((c) => words(c).includes("space-y-1"));
	const icon = src.match(/<Calendar\s+className="([^"]+)"/)?.[1];
	if (!inner) throw new Error("pair renew-lease inner: no <div className> in CurrentLeaseInfo");
	if (!heading) throw new Error("pair renew-lease heading: no <h4 className> in CurrentLeaseInfo");
	if (!body) throw new Error("pair renew-lease body: no space-y-1 className after the h4");
	if (!icon) throw new Error("pair renew-lease icon: no <Calendar className>");
	return { inner, heading, body, icon };
}

const declares = (cssText, prop) =>
	cssText != null && (prop === "background-color" ? /(^|[\s;{])background-color\s*:/m : /(^|[\s;{])color\s*:/m).test(cssText);
// First class whose design-system CSS sets the property (`color` never matches background-color
// or border-color, because the declaration name must start at a boundary).
export function pickClass(ds, classes, prop, what) {
	const css = ds.candidatesToCss(classes);
	const i = classes.findIndex((c, k) => (prop === "background-color" ? c.startsWith("bg-") : true) && declares(css[k], prop));
	if (i < 0) throw new Error(`${what}: no class sets ${prop} in "${classes.join(" ")}"`);
	return classes[i];
}

export function derivePairs(ds, { dialogSrc, renewSrc }) {
	const outer = pickClass(ds, dialogSurfaceClasses(dialogSrc), "background-color", "pair outer");
	const s = renewLeaseClassStrings(renewSrc);
	const inner = pickClass(ds, words(s.inner), "background-color", "pair renew-lease inner");
	return [
		{ name: "renew-lease heading", outer, inner, fg: pickClass(ds, words(s.heading), "color", "pair renew-lease heading") },
		{ name: "renew-lease body", outer, inner, fg: pickClass(ds, words(s.body), "color", "pair renew-lease body") },
		{ name: "renew-lease icon", outer, inner, fg: pickClass(ds, words(s.icon), "color", "pair renew-lease icon") },
		{ name: "badge secondary", outer: "bg-background", inner: "bg-secondary", fg: "text-secondary-foreground" },
	];
}

export function touchStrings({ switchSrc, buttonSrc, inputSrc }) {
	const switchRoot = firstStringAfter(switchSrc, indexAfter(switchSrc, /cn\(/, indexAfter(switchSrc, /data-slot="switch"/)), "touch switch root");
	const switchThumb = firstStringAfter(switchSrc, indexAfter(switchSrc, /cn\(/, indexAfter(switchSrc, /data-slot="switch-thumb"/)), "touch switch thumb");
	const buttonBase = firstStringAfter(buttonSrc, indexAfter(buttonSrc, /cva\(/), "touch button base");
	const variantAt = indexAfter(buttonSrc, /\bvariant:\s*\{/);
	const secondary = firstStringAfter(buttonSrc, indexAfter(buttonSrc, /\bsecondary:/, variantAt < 0 ? 0 : variantAt), "touch button secondary");
	const sizeAt = indexAfter(buttonSrc, /\bsize:\s*\{/);
	if (sizeAt < 0) throw new Error("touch button: size block not found");
	const sizeDefault = firstStringAfter(buttonSrc, indexAfter(buttonSrc, /\bdefault:/, sizeAt), "touch button size default");
	const sizeIcon = firstStringAfter(buttonSrc, indexAfter(buttonSrc, /\bicon:/, sizeAt), "touch button size icon");
	const inputBase = firstStringAfter(inputSrc, indexAfter(inputSrc, /cva\(/), "touch input base");
	const inputSizeAt = indexAfter(inputSrc, /\binputSize:\s*\{/);
	if (inputSizeAt < 0) throw new Error("touch input: inputSize block not found");
	const inputDefault = firstStringAfter(inputSrc, indexAfter(inputSrc, /\bdefault:/, inputSizeAt), "touch input inputSize default");
	return {
		switch: switchRoot,
		switchThumb,
		buttonSecondary: `${buttonBase} ${secondary} ${sizeDefault}`,
		iconButton: `${buttonBase} ${sizeIcon}`,
		iconButtonSize8: "size-8",
		input: `${inputBase} ${inputDefault}`,
		inputH9: "h-9 px-3 py-1",
	};
}

const loadDs = (cssText) => __unstable__loadDesignSystem(cssText, { base });

// ---------- --self-test ----------

async function selfTest() {
	let passed = 0;
	const check = (name, ok, detail) => {
		if (!ok) {
			console.error(`render-check self-test FAILED: ${name}${detail ? ` (${detail})` : ""}`);
			process.exit(1);
		}
		passed++;
	};
	const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

	// (a) fonts.ts-shaped fixture + layout importing geist/font/mono with vars on <html>.
	const fontsA = `import { Roboto, Playfair_Display } from "next/font/google";
export const roboto = Roboto({ subsets: ["latin"], variable: "--font-roboto" });
export const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });`;
	const layoutA = `import { GeistMono } from "geist/font/mono";
import { roboto } from "#lib/fonts";
export default function L({ children }) {
	return (<html lang="en" className={\`\${roboto.variable} \${GeistMono.variable}\`}><body>{children}</body></html>);
}`;
	const varsA = collectFontVars(fontsA, layoutA);
	check("(a) fontVars", eq(varsA, ["--font-roboto", "--font-playfair", "--font-geist-mono"]), JSON.stringify(varsA));
	check("(a) placement html", fontPlacement(layoutA) === "html");
	check("(a) global-error none", fontPlacement(`<html lang="en"><body className="font-sans antialiased">`, { allowNone: true }) === "none");

	// (b) post-D-11 CurrentLeaseInfo against the real design system.
	const renewB = `export function CurrentLeaseInfo() {
	return (
		<div className="rounded-lg border border-border bg-muted p-4">
			<h4 className="text-sm font-semibold text-foreground mb-2">Current Lease</h4>
			<div className="space-y-1 text-sm text-muted-foreground">x</div>
		</div>
	);
}
export function DateSelector() { return <Calendar className="size-5 text-muted-foreground shrink-0" />; }`;
	const ds = await loadDs(fs.readFileSync(cssPath, "utf8"));
	const pairsB = derivePairs(ds, { dialogSrc: readRepo("src/components/ui/dialog.tsx"), renewSrc: renewB });
	const rl = pairsB.filter((p) => p.name.startsWith("renew-lease"));
	check("(b) inner bg-muted", rl.every((p) => p.inner === "bg-muted"), JSON.stringify(rl));
	check("(b) fg", eq(rl.map((p) => p.fg), ["text-foreground", "text-muted-foreground", "text-muted-foreground"]), JSON.stringify(rl.map((p) => p.fg)));

	// (c) argv parsing.
	const argC = parseArgs(["w3", "--tokens", "x.json"]);
	check("(c) argv", argC.label === "w3" && argC.tokens === "x.json" && !argC.selfTest, JSON.stringify(argC));
	check("(c) default label", parseArgs([]).label === "current");

	// (d) fonts.ts defining geistMono with next/font/local: collected once, never appended.
	const fontsD = `import localFont from "next/font/local";
import { Roboto, Playfair_Display } from "next/font/google";
export const roboto = Roboto({ subsets: ["latin"], variable: "--font-roboto" });
export const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });
export const geistMono = localFont({ src: "./GeistMono.woff2", variable: "--font-geist-mono", display: "swap" });`;
	const varsD = collectFontVars(fontsD, layoutA);
	check("(d) fontVars", eq(varsD, ["--font-roboto", "--font-playfair", "--font-geist-mono"]), JSON.stringify(varsD));
	check("(d) geist-mono once", varsD.filter((v) => v === "--font-geist-mono").length === 1);

	// Touch strings from the real sources: the size block's default, never the variant block's.
	const t = touchStrings({ switchSrc: readRepo("src/components/ui/switch.tsx"), buttonSrc: readRepo("src/components/ui/button.tsx"), inputSrc: readRepo("src/components/ui/input.tsx") });
	check("touch strings non-empty", Object.values(t).every((v) => typeof v === "string" && v.trim().length > 0));

	console.log(`render-check self-test: ${passed} passed`);
}

// ---------- real run ----------

async function main(args) {
	const OUT = process.env.TW_AUDIT_OUT ?? path.join(os.tmpdir(), "tenantflow-tw-audit");
	fs.mkdirSync(OUT, { recursive: true });
	const { chromium } = require("playwright");
	const css = fs.readFileSync(cssPath, "utf8");

	let tokens;
	let tokenListSource;
	if (args.tokens) {
		tokens = tokensFromFile(JSON.parse(fs.readFileSync(path.resolve(args.tokens), "utf8")));
		tokenListSource = args.tokens;
	} else {
		tokens = tokensFromCss(css);
		tokenListSource = "globals.css";
	}

	// Class strings under test are read from source so fixes are picked up automatically.
	const classOf = (file, needle) => {
		const src = readRepo(file);
		const m = [...src.matchAll(/className="([^"]+)"/g)].find((x) => x[1].includes(needle));
		return m?.[1] ?? null;
	};
	const proseCases = [
		["lease template preview", classOf("src/components/leases/template/preview-panel.tsx", "prose")],
		["admin blog review", classOf("src/app/(admin)/admin/blog/blog-review-client.tsx", "prose")],
	].filter(([, c]) => c);

	const ds = await loadDs(css);
	const pairs = derivePairs(ds, { dialogSrc: readRepo("src/components/ui/dialog.tsx"), renewSrc: readRepo("src/components/leases/dialogs/renew-lease-form-fields.tsx") });
	const touch = touchStrings({ switchSrc: readRepo("src/components/ui/switch.tsx"), buttonSrc: readRepo("src/components/ui/button.tsx"), inputSrc: readRepo("src/components/ui/input.tsx") });

	const fontsTs = "src/lib/fonts.ts";
	const fontVarsSource = fs.existsSync(path.join(ROOT, fontsTs)) ? fontsTs : "src/app/layout.tsx";
	const layout = readRepo("src/app/layout.tsx");
	const fontVars = collectFontVars(readRepo(fontVarsSource), layout);
	const fontVarsOn = fontPlacement(layout);
	const globalError = { fontVarsOn: fontPlacement(readRepo("src/app/global-error.tsx"), { allowNone: true }) };
	const onHtml = fontVarsOn === "html";
	const stubFor = (v) => `Stub${v.replace(/[^a-z]/gi, "")}`;
	const fontCss = `.next-font-vars { ${fontVars.map((v) => `${v}: "${stubFor(v)}";`).join(" ")} }`;

	const candidates = [
		...new Set([
			"font-sans",
			"font-mono",
			"font-display",
			...pairs.flatMap((p) => [p.outer, p.inner, p.fg]),
			...proseCases.flatMap(([, c]) => words(c)),
			...Object.values(touch).flatMap(words),
			...tokens.map((t) => `bg-${t}`),
		]),
	];
	const compiler = await compile(css, { base, from: cssPath, onDependency() {} });
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

	const pairCases = pairs.map((p) => [p.name, p.outer, p.inner, p.fg]);
	const browser = await chromium.launch();
	const result = { fonts: {}, secondaryPixel: {}, contrast: {}, tokens: {}, touch390: {} };
	try {
		for (const mode of ["light", "dark"]) {
			const page = await browser.newPage();
			const htmlClass = `${mode}${onHtml ? " next-font-vars" : ""}`;
			const bodyClass = `${onHtml ? "" : "next-font-vars "}font-sans bg-background`;
			await page.setContent(`<!doctype html><html class="${htmlClass}"><head><style>${built}\n${fontCss}</style></head><body class="${bodyClass}">
			<span id="f-mono" class="font-mono">m</span><code id="f-code">c</code><span id="f-display" class="font-display">d</span>
			<div id="sec" class="bg-secondary" style="width:40px;height:40px"></div>
			${pairCases.map(([, outer, inner, fg], i) => `<div class="${outer}"><div class="${inner}"><span id="p${i}" class="${fg}">Sample</span></div></div>`).join("")}
			${proseCases.map(([, c], i) => `<div id="q${i}" class="${c}"><h2>Heading</h2><p>Body <strong>b</strong> <a href="#q">a</a></p></div>`).join("")}
			${tokens.map((t) => `<i id="t-${t}" class="bg-${t}"></i>`).join("")}
		</body></html>`);
			const r = await page.evaluate(
				({ pairs, prose, toks }) => {
					const cv = document.createElement("canvas");
					cv.width = cv.height = 1;
					const ctx = cv.getContext("2d", { willReadFrequently: true });
					const toRgbaArray = (c) => {
						ctx.clearRect(0, 0, 1, 1);
						ctx.fillStyle = "oklch(0 0 0)";
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
					const bodyBg = toRgbaArray(cs(document.body).backgroundColor);
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
						const bg = over(toRgbaArray(cs(span.parentElement).backgroundColor), over(toRgbaArray(cs(span.parentElement.parentElement).backgroundColor), bodyBg));
						contrast[name] = ratio(over(toRgbaArray(cs(span).color), bg), bg);
					});
					prose.forEach(([name], i) => {
						const el = document.getElementById(`q${i}`);
						const own = toRgbaArray(cs(el).backgroundColor);
						const bg = own[3] ? over(own, bodyBg) : bodyBg;
						for (const sel of ["h2", "p", "strong", "a"]) contrast[`${name} ${sel}`] = ratio(over(toRgbaArray(cs(el.querySelector(sel)).color), bg), bg);
					});
					const tokenValues = {};
					for (const t of toks) tokenValues[t] = toRgbaArray(cs(document.getElementById(`t-${t}`)).backgroundColor);
					return { fonts, contrast, tokenValues };
				},
				{ pairs: pairCases, prose: proseCases, toks: tokens },
			);
			const box = await page.locator("#sec").boundingBox();
			result.secondaryPixel[mode] = decodePixel(await page.screenshot({ clip: { x: box.x + 20, y: box.y + 20, width: 1, height: 1 } }));
			result.fonts[mode] = r.fonts;
			result.contrast[mode] = r.contrast;
			result.tokens[mode] = r.tokenValues;
			await page.close();
		}

		// touch390 (R5): light page at a 390x844 viewport, same CSS.
		const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
		await page.setContent(`<!doctype html><html class="light"><head><style>${built}\n${fontCss}</style></head><body class="next-font-vars font-sans bg-background">
		<button id="tp-switch" type="button" role="switch" aria-checked="false" data-state="unchecked" class="${touch.switch}"><span data-state="unchecked" class="${touch.switchThumb}"></span></button>
		<button id="tp-buttonSecondary" type="button" class="${touch.buttonSecondary}">Button</button>
		<button id="tp-iconButton" type="button" aria-label="Icon" class="${touch.iconButton}"><svg width="16" height="16" viewBox="0 0 16 16"></svg></button>
		<button id="tp-iconButtonSize8" type="button" aria-label="Icon" class="${touch.iconButtonSize8}"><svg width="16" height="16" viewBox="0 0 16 16"></svg></button>
		<input id="tp-input" type="text" class="${touch.input}">
		<input id="tp-inputH9" type="text" class="${touch.inputH9}">
	</body></html>`);
		result.touch390 = await page.evaluate((ids) => {
			const out = {};
			const r1 = (n) => Math.round(n * 10) / 10;
			for (const id of ids) {
				const el = document.getElementById(`tp-${id}`);
				const b = el.getBoundingClientRect();
				const s = getComputedStyle(el);
				out[id] = { width: r1(b.width), height: r1(b.height), padding: s.padding, minHeight: s.minHeight };
			}
			return out;
		}, ["switch", "buttonSecondary", "iconButton", "iconButtonSize8", "input", "inputH9"]);
		await page.close();
	} finally {
		await browser.close();
	}

	const snapFile = path.join(OUT, `tokens-${args.label}.json`);
	fs.writeFileSync(snapFile, JSON.stringify(result.tokens, null, 1));
	const report = {
		label: args.label,
		tokenListSource,
		tokenCount: tokens.length,
		fontVarsSource,
		fontVars,
		fontVarsOn,
		globalError,
		fonts: result.fonts,
		secondaryPixel: result.secondaryPixel,
		pairs,
		contrast: result.contrast,
		touch390: result.touch390,
	};
	const text = `${JSON.stringify(report, null, 2)}\n`;
	fs.writeFileSync(path.join(OUT, `render-${args.label}.json`), text);
	process.stdout.write(text);
	console.error(`${tokens.length} tokens snapshotted to ${snapFile}`);
}

let args;
try {
	args = parseArgs(process.argv.slice(2));
} catch (e) {
	console.error(`render-check: ${e.message}`);
	process.exit(2);
}
if (args.selfTest) await selfTest();
else await main(args);
