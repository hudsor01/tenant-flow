// Real-component Chromium probes for the Tailwind v4 / shadcn remediation (ledger rows C1, C2, C3,
// C6, C7, C12a, C12b, C12c, C13 and research rows N1, N2, N3, H10). jsdom computes neither layout nor oklch, so
// these mount the REAL repo components in headless Chromium, styled by the REAL compiled
// src/app/globals.css. Read-only against the repo: writes only to $TW_AUDIT_OUT (default:
// <tmpdir>/tenantflow-tw-audit).
//
// Usage (from the repo root):
//   node .planning/tailwind-shadcn/audit/component-probes.mjs <label> [--only id,id]
//
// Build: probes/entry.tsx is bundled with the repo's rolldown (never Bun.build, which mis-bundles
// radix-ui's `import * as Dialog`) into $TW_AUDIT_OUT/.probes/entry.js. One resolver plugin maps
//   #lib/supabase/client -> probes/stubs/supabase-client.ts
//   #lib/frontend-logger -> probes/stubs/frontend-logger.ts
//   #components/ #lib/ #hooks/ #types/ #stores/ #providers/ #config/ -> <ROOT>/src/<dir>/ (probing
//   "" .tsx .ts /index.tsx /index.ts; anything else under # throws `unmapped <id>`)
// and resolves bare imports of probes/ files relative to src/lib/utils.ts, so the probes use the
// repo's react, react-dom, radix-ui, recharts, cmdk and @tanstack/react-table.
// CSS: globals.css compiled exactly as audit.mjs does (same compile options, same sources, Oxide
// scan), built with the scan candidates plus the candidates of the probes/ directory. Class
// strings read from component source at runtime are never added (C12a/N1 are candidates Oxide
// never extracts; adding them would mask the defect).
// Serving: page.route on http://tf-probe.local/ (index.html, app.css, entry.js); viewport
// 1280x900; every probe runs with <html class="light"> and <html class="dark">.
//
// Output: $TW_AUDIT_OUT/probes-<label>.json = { meta: { tailwindVersion, scannedFiles, candidates,
// bundleBytes }, results: { <id>: { light: {...}, dark: {...} } } }, one summary line per probe on
// stdout. Colors are numeric [r,g,b,a] from a canvas conversion. A probe whose selectors do not
// appear within 5 s records `error`, and the process then exits 1.
// Probe fields:
//   otp-setup, otp-mfa      { slotCount, dataSlotCount, slots: [{ width, height, fontSize,
//                            borderWidths: [t,r,b,l], radii: [tl,tr,br,bl] }] }
//   chart                   { gridLineCount, gridStroke, activeDotStroke, activeDotStrokeWidth }
//   command                 { wrapperHeight, inputHeight, inputOverflowsWrapper }
//   date-popover            { popoverContentDataSlotCount, popoverBg, calendarBg, popoverRadius,
//                            cornerPatch, cornerPatchMaxDiffVsPlain }
//   plain-popover (C7 ref)  { cornerPatch }  only this field: the reference surface carries no
//                            data-slot reading, so a correct data-slot change cannot move it
//                            cornerPatch = 100 [r,g,b,a] tuples, row-major, of the 10x10 CSS-pixel
//                            screenshot clip at the top-left of the PopoverContent border box,
//                            decoded in the page (createImageBitmap + OffscreenCanvas);
//                            cornerPatchMaxDiffVsPlain = max |channel difference| between the
//                            date-popover and plain-popover patches of the same theme, added after
//                            every probe ran (null when either patch is missing)
//   sheet, sheet-no-close, sheet-slot-override (H10)
//                           { contentRole, contentDataSlot, overlayDataSlot, headerDataSlot,
//                            titleDataSlot, descriptionDataSlot, footerDataSlot, closeButtonCount,
//                            closeWidth, closeHeight, closeAriaLabel, closeSrOnlyTextCount }
//                            content = [role=dialog]; overlay = its previous element sibling; close
//                            = the dialog's direct-child buttons holding svg.lucide-x (width/height
//                            from the first, rounded to integers); missing attributes are null
//   grid-pattern            { svgStroke, pathStroke, svgStrokeRgba }
//   border-beam-stats/-grid { props, afterBackgroundImage, afterAnimationName,
//                            afterAnimationDuration, runningAnimations }
//   blur-fade-no-js, -reduced-motion, -io-stub
//                           { ssrHtmlHasOpacity0, ssrAriaHidden, opacityAtStart, opacityAtEnd,
//                            ariaHiddenAtEnd }
//   update-password-badge   { classes, bg }
//   data-table              { cellBg, headerCellBg, hoverRowBg, selectedRowBg }
//   card-action (C6)        { cardDataSlots, columns, headerContentWidth, actionWidth, columnGap }
//                            cardDataSlots = [data-slot^="card"] count in #root; columns = the
//                            header's computed grid-template-columns in px; headerContentWidth =
//                            header clientWidth minus horizontal padding; actionWidth = the
//                            action's border-box width; columnGap = computed column-gap in px
//   button-group-nested (C13) { outerColumnGap, innerGap }  outer computed column-gap in px
//                            (normal = 0); innerGap = inner-2 left minus inner-1 right
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const ROOT = process.cwd();
const require = createRequire(path.join(ROOT, "package.json"));
const OUT = process.env.TW_AUDIT_OUT ?? path.join(os.tmpdir(), "tenantflow-tw-audit");
fs.mkdirSync(OUT, { recursive: true });

const AUDIT_DIR = path.join(ROOT, ".planning/tailwind-shadcn/audit");
const PROBES_DIR = path.join(AUDIT_DIR, "probes");
const ENTRY = path.join(AUDIT_DIR, "probes/entry.tsx");
const UTILS = path.join(ROOT, "src/lib/utils.ts");
const STUBS = {
	"#lib/supabase/client": path.join(PROBES_DIR, "stubs/supabase-client.ts"),
	"#lib/frontend-logger": path.join(PROBES_DIR, "stubs/frontend-logger.ts"),
};
const ALIAS = /^#(components|lib|hooks|types|stores|providers|config)\/(.+)$/;
const EXTS = ["", ".tsx", ".ts", "/index.tsx", "/index.ts"];
const ORIGIN = "http://tf-probe.local";
const THEMES = ["light", "dark"];

// ---------- argv ----------
const argv = process.argv.slice(2);
let label = null;
let only = null;
for (let i = 0; i < argv.length; i++) {
	if (argv[i] === "--only") only = (argv[++i] ?? "").split(",").filter(Boolean);
	else if (argv[i].startsWith("--")) {
		console.error(`component-probes: unknown flag ${argv[i]}`);
		process.exit(2);
	} else if (!label) label = argv[i];
	else {
		console.error("usage: component-probes.mjs <label> [--only id,id]");
		process.exit(2);
	}
}
if (!label) {
	console.error("usage: component-probes.mjs <label> [--only id,id]");
	process.exit(2);
}

// ---------- source-derived props ----------
const readRepo = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const classOf = (file, needle) => {
	const m = [...readRepo(file).matchAll(/className="([^"]+)"/g)].find((x) => x[1].includes(needle));
	if (!m) throw new Error(`no className containing "${needle}" in ${file}`);
	return m[1];
};
const borderBeamProps = (file) => {
	const src = readRepo(file);
	const at = src.indexOf("<BorderBeam");
	if (at < 0) throw new Error(`no <BorderBeam in ${file}`);
	const end = src.indexOf("/>", at);
	const block = src.slice(at, end < 0 ? undefined : end);
	const props = {};
	for (const m of block.matchAll(/(\w+)=\{([^}]*)\}/g)) props[m[1]] = /^-?\d+(\.\d+)?$/.test(m[2].trim()) ? Number(m[2]) : m[2].trim();
	for (const m of block.matchAll(/(\w+)="([^"]*)"/g)) props[m[1]] = m[2];
	const pick = {};
	for (const k of ["size", "duration", "colorFrom", "colorTo"]) if (k in props) pick[k] = props[k];
	return pick;
};

// ---------- CSS (audit.mjs's method) ----------
const { compile } = await import(require.resolve("@tailwindcss/node"));
const { Scanner } = require("@tailwindcss/oxide");
const cssPath = path.join(ROOT, "src/app/globals.css");
const css = fs.readFileSync(cssPath, "utf8");
const compiler = await compile(css, { base: path.dirname(cssPath), from: cssPath, onDependency() {} });
const sources = (
	compiler.root === "none"
		? []
		: compiler.root === null
			? [{ base: ROOT, pattern: "**/*", negated: false }]
			: [{ ...compiler.root, negated: false }]
).concat(compiler.sources);
const scanner = new Scanner({ sources });
const candidates = scanner.scan();
const probeDirCandidates = new Scanner({ sources: [{ base: PROBES_DIR, pattern: "**/*", negated: false }] }).scan();
const appCss = compiler.build([...candidates, ...probeDirCandidates]);

// ---------- bundle ----------
const { rolldown } = await import(require.resolve("rolldown"));
const resolveAlias = (source) => {
	const m = ALIAS.exec(source);
	if (!m) return null;
	const base = path.join(ROOT, "src", m[1], m[2]);
	for (const ext of EXTS) {
		const p = base + ext;
		if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
	}
	return null;
};
const inRepoSource = (importer) => importer && (importer.startsWith(path.join(ROOT, "src") + path.sep) || importer.startsWith(PROBES_DIR + path.sep));
const bundleDir = path.join(OUT, ".probes");
fs.mkdirSync(bundleDir, { recursive: true });
const bundleFile = path.join(bundleDir, "entry.js");
const bundle = await rolldown({
	input: ENTRY,
	platform: "browser",
	transform: { jsx: "react-jsx", define: { "process.env.NODE_ENV": '"production"' } },
	// "use client" directives are meaningless in this single browser bundle; every other log passes.
	onLog(level, log, handler) {
		if (log.code === "MODULE_LEVEL_DIRECTIVE") return;
		handler(level, log);
	},
	plugins: [
		{
			name: "tf-probe-resolver",
			async resolveId(source, importer) {
				if (Object.hasOwn(STUBS, source)) return STUBS[source];
				if (source.startsWith("#") && inRepoSource(importer)) {
					const hit = resolveAlias(source);
					if (!hit) throw new Error(`unmapped ${source}`);
					return hit;
				}
				if (importer?.startsWith(PROBES_DIR + path.sep) && !source.startsWith(".") && !path.isAbsolute(source) && !source.startsWith("\0")) {
					return this.resolve(source, UTILS, { skipSelf: true });
				}
				return null;
			},
		},
	],
});
await bundle.write({ file: bundleFile, format: "esm", codeSplitting: false });
await bundle.close();
const entryJs = fs.readFileSync(bundleFile, "utf8");

// ---------- serving ----------
const pages = new Map();
const indexHtml = (theme, body = "", script = true) =>
	`<!doctype html><html class="${theme}"><head><meta charset="utf-8"><link rel=stylesheet href=/app.css></head><body><div id="root">${body}</div>${script ? "<script type=module src=/entry.js></script>" : ""}</body></html>`;
const routeContext = async (ctx) => {
	await ctx.route(`${ORIGIN}/**`, (route) => {
		const u = new URL(route.request().url());
		if (u.pathname === "/app.css") return route.fulfill({ status: 200, contentType: "text/css", body: appCss });
		if (u.pathname === "/entry.js") return route.fulfill({ status: 200, contentType: "text/javascript", body: entryJs });
		if (pages.has(u.pathname)) return route.fulfill({ status: 200, contentType: "text/html", body: pages.get(u.pathname) });
		if (u.pathname === "/index.html") return route.fulfill({ status: 200, contentType: "text/html", body: indexHtml(u.searchParams.get("theme") ?? "light") });
		return route.fulfill({ status: 404, body: "" });
	});
};

// In-page helpers: canvas color conversion (numeric [r,g,b,a]), rounded boxes, animation settle.
const HELPERS = `(() => {
	const cv = document.createElement("canvas");
	cv.width = cv.height = 1;
	let ctx = null;
	const toRgbaArray = (c) => {
		ctx ??= cv.getContext("2d", { willReadFrequently: true });
		ctx.clearRect(0, 0, 1, 1);
		ctx.fillStyle = "oklch(0 0 0)";
		ctx.fillStyle = c;
		ctx.fillRect(0, 0, 1, 1);
		const d = ctx.getImageData(0, 0, 1, 1).data;
		return [d[0], d[1], d[2], +(d[3] / 255).toFixed(3)];
	};
	const r1 = (n) => Math.round(n * 10) / 10;
	const settle = async () => {
		await new Promise((r) => setTimeout(r, 50));
		const finite = document.getAnimations().filter((a) => a.effect && a.effect.getComputedTiming().endTime !== Infinity);
		await Promise.race([Promise.all(finite.map((a) => a.finished.catch(() => {}))), new Promise((r) => setTimeout(r, 3000))]);
		await new Promise((r) => requestAnimationFrame(() => r()));
	};
	window.__tfMeasure = { toRgbaArray, r1, settle };
})();`;

const chromium = require("playwright").chromium;
const browser = await chromium.launch();

const openPage = async (theme, ctxOptions = {}, initScripts = []) => {
	const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...ctxOptions });
	await routeContext(ctx);
	if (ctxOptions.javaScriptEnabled !== false) {
		await ctx.addInitScript({ content: HELPERS });
		for (const s of initScripts) await ctx.addInitScript({ content: s });
	}
	const page = await ctx.newPage();
	const pageErrors = [];
	page.on("pageerror", (e) => pageErrors.push(String(e?.message ?? e).slice(0, 300)));
	return { ctx, page, pageErrors };
};
const loadHarness = async (page, theme) => {
	await page.goto(`${ORIGIN}/index.html?theme=${theme}`, { waitUntil: "load" });
	await page.waitForFunction(() => Boolean(window.__tfProbes), null, { timeout: 5000 });
};
const waitAll = async (page, selectors) => {
	for (const s of selectors) await page.waitForSelector(s, { state: "attached", timeout: 5000 });
};

// ---------- probes ----------
const measureOtp = (page) =>
	page.evaluate(async () => {
		const { r1, settle } = window.__tfMeasure;
		await settle();
		const container = document.querySelector("[data-input-otp-container]");
		const tagged = [...container.querySelectorAll("[data-slot=input-otp-slot]")];
		const structural = [...container.children].filter((el) => el.getAttribute("role") !== "separator" && !el.querySelector("input") && el.tagName !== "INPUT").flatMap((g) => [...g.children]);
		const slots = (tagged.length ? tagged : structural).map((el) => {
			const b = el.getBoundingClientRect();
			const s = getComputedStyle(el);
			return {
				width: r1(b.width),
				height: r1(b.height),
				fontSize: s.fontSize,
				borderWidths: [s.borderTopWidth, s.borderRightWidth, s.borderBottomWidth, s.borderLeftWidth].map(parseFloat),
				radii: [s.borderTopLeftRadius, s.borderTopRightRadius, s.borderBottomRightRadius, s.borderBottomLeftRadius].map(parseFloat),
			};
		});
		return { slotCount: slots.length, dataSlotCount: container.querySelectorAll("[data-slot]").length, slots };
	});

// C7 corner reference: screenshot the 10x10 top-left patch of the PopoverContent border box and
// decode it in the page, so no PNG decoder dependency is needed.
const cornerPatch = async (page) => {
	const box = await page.evaluate(() => {
		const r = document.querySelector("[data-radix-popper-content-wrapper] > *").getBoundingClientRect();
		return { x: Math.round(r.left), y: Math.round(r.top) };
	});
	const png = await page.screenshot({ clip: { x: box.x, y: box.y, width: 10, height: 10 } });
	return page.evaluate(async (b64) => {
		const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
		const bmp = await createImageBitmap(new Blob([bytes], { type: "image/png" }), { colorSpaceConversion: "none", premultiplyAlpha: "none" });
		const cv = new OffscreenCanvas(bmp.width, bmp.height);
		const cx = cv.getContext("2d", { willReadFrequently: true });
		cx.drawImage(bmp, 0, 0);
		const d = cx.getImageData(0, 0, bmp.width, bmp.height).data;
		const out = [];
		for (let i = 0; i < d.length; i += 4) out.push([d[i], d[i + 1], d[i + 2], d[i + 3]]);
		return out;
	}, png.toString("base64"));
};

const measureSheet = (page) =>
	page.evaluate(async () => {
		const { settle } = window.__tfMeasure;
		await settle();
		const dialog = document.querySelector("[role=dialog]");
		const slotOf = (el) => (el ? el.getAttribute("data-slot") : null);
		const overlay = dialog.previousElementSibling;
		const header = dialog.querySelector("h2")?.parentElement ?? null;
		const title = dialog.querySelector("h2");
		const description = dialog.querySelector("p");
		const footer = [...dialog.querySelectorAll("button")].find((b) => b.textContent === "Done")?.parentElement ?? null;
		const closes = [...dialog.children].filter((el) => el.tagName === "BUTTON" && el.querySelector("svg.lucide-x"));
		const close = closes[0] ?? null;
		const rect = close ? close.getBoundingClientRect() : null;
		return {
			contentRole: dialog.getAttribute("role"),
			contentDataSlot: slotOf(dialog),
			overlayDataSlot: slotOf(overlay),
			headerDataSlot: slotOf(header),
			titleDataSlot: slotOf(title),
			descriptionDataSlot: slotOf(description),
			footerDataSlot: slotOf(footer),
			closeButtonCount: closes.length,
			closeWidth: rect ? Math.round(rect.width) : null,
			closeHeight: rect ? Math.round(rect.height) : null,
			closeAriaLabel: close ? close.getAttribute("aria-label") : null,
			closeSrOnlyTextCount: close ? close.querySelectorAll(".sr-only").length : null,
		};
	});

const PROBES = {
	"otp-setup": { selectors: ["[data-input-otp-container]"], run: async ({ page }) => measureOtp(page) },
	"otp-mfa": { selectors: ["[data-input-otp-container]"], run: async ({ page }) => measureOtp(page) },
	chart: {
		selectors: [".recharts-surface", ".recharts-cartesian-grid line"],
		run: async ({ page }) => {
			await page.evaluate(() => window.__tfMeasure.settle());
			const box = await page.locator(".recharts-surface").first().boundingBox();
			await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
			await page.waitForSelector(".recharts-active-dot circle", { state: "attached", timeout: 5000 });
			await page.waitForTimeout(300);
			return page.evaluate(() => {
				const { toRgbaArray } = window.__tfMeasure;
				const lines = [...document.querySelectorAll(".recharts-cartesian-grid line")];
				const dot = document.querySelector(".recharts-active-dot circle");
				const ds = getComputedStyle(dot);
				return {
					gridLineCount: lines.length,
					gridStroke: toRgbaArray(getComputedStyle(lines[0]).stroke),
					activeDotStroke: toRgbaArray(ds.stroke),
					activeDotStrokeWidth: ds.strokeWidth,
				};
			});
		},
	},
	command: {
		selectors: ["[data-slot=command-input-wrapper]", "[cmdk-input]"],
		run: async ({ page }) =>
			page.evaluate(async () => {
				const { r1, settle } = window.__tfMeasure;
				await settle();
				const w = document.querySelector("[data-slot=command-input-wrapper]").getBoundingClientRect();
				const i = document.querySelector("[cmdk-input]").getBoundingClientRect();
				return { wrapperHeight: r1(w.height), inputHeight: r1(i.height), inputOverflowsWrapper: i.top < w.top || i.bottom > w.bottom };
			}),
	},
	"date-popover": {
		selectors: ["[data-radix-popper-content-wrapper] > *", "[data-slot=calendar], .rdp-root"],
		run: async ({ page }) => {
			const r = await page.evaluate(async () => {
				const { toRgbaArray, settle } = window.__tfMeasure;
				await settle();
				const content = document.querySelector("[data-radix-popper-content-wrapper] > *");
				const cal = document.querySelector("[data-slot=calendar]") ?? document.querySelector(".rdp-root");
				const cs = getComputedStyle(content);
				return {
					popoverContentDataSlotCount: document.querySelectorAll("[data-slot=popover-content]").length,
					popoverBg: toRgbaArray(cs.backgroundColor),
					calendarBg: toRgbaArray(getComputedStyle(cal).backgroundColor),
					popoverRadius: cs.borderRadius,
				};
			});
			return { ...r, cornerPatch: await cornerPatch(page) };
		},
	},
	"plain-popover": {
		selectors: ["[data-radix-popper-content-wrapper] > *"],
		run: async ({ page }) => {
			await page.evaluate(() => window.__tfMeasure.settle());
			return { cornerPatch: await cornerPatch(page) };
		},
	},
	sheet: { selectors: ["[role=dialog]"], run: async ({ page }) => measureSheet(page) },
	"sheet-no-close": { selectors: ["[role=dialog]"], run: async ({ page }) => measureSheet(page) },
	"sheet-slot-override": { selectors: ["[role=dialog]"], run: async ({ page }) => measureSheet(page) },
	"grid-pattern": {
		selectors: ["#root svg", "#root svg path"],
		run: async ({ page }) =>
			page.evaluate(() => {
				const { toRgbaArray } = window.__tfMeasure;
				const svg = document.querySelector("#root svg");
				const svgStroke = getComputedStyle(svg).stroke;
				const pathStroke = getComputedStyle(svg.querySelector("path")).stroke;
				const isColor = (v) => v && v !== "none" && !v.startsWith("url(");
				return { svgStroke, pathStroke, svgStrokeRgba: isColor(svgStroke) ? toRgbaArray(svgStroke) : null };
			}),
	},
	"border-beam-stats": { props: () => borderBeamProps("src/components/tenants/tenant-stats.tsx"), selectors: ["#root .relative > div"], run: async ({ page, props }) => measureBeam(page, props) },
	"border-beam-grid": { props: () => borderBeamProps("src/components/tenants/tenant-grid.tsx"), selectors: ["#root .relative > div"], run: async ({ page, props }) => measureBeam(page, props) },
	"blur-fade-no-js": { blurMode: "no-js" },
	"blur-fade-reduced-motion": { blurMode: "reduced-motion" },
	"blur-fade-io-stub": { blurMode: "io-stub" },
	"update-password-badge": {
		props: () => ({ className: classOf("src/components/auth/update-password-form.tsx", "rounded-full w-fit") }),
		selectors: ["#root > div"],
		run: async ({ page, props }) =>
			page.evaluate((classes) => {
				const { toRgbaArray } = window.__tfMeasure;
				return { classes, bg: toRgbaArray(getComputedStyle(document.querySelector("#root > div")).backgroundColor) };
			}, props.className),
	},
	"data-table": {
		selectors: ["#root table tbody tr", "#root table thead th"],
		run: async ({ page }) => {
			await page.locator("#root table tbody tr").first().hover();
			await page.waitForTimeout(400);
			return page.evaluate(() => {
				const { toRgbaArray } = window.__tfMeasure;
				const rows = document.querySelectorAll("#root table tbody tr");
				const bg = (el) => toRgbaArray(getComputedStyle(el).backgroundColor);
				return {
					cellBg: bg(rows[0].querySelector("td")),
					headerCellBg: bg(document.querySelector("#root table thead th")),
					hoverRowBg: bg(rows[0]),
					selectedRowBg: bg(rows[1]),
				};
			});
		},
	},
	"card-action": {
		selectors: ["[data-probe=header]", "[data-probe=action]"],
		run: async ({ page }) =>
			page.evaluate(async () => {
				const { r1, settle } = window.__tfMeasure;
				await settle();
				const header = document.querySelector("[data-probe=header]");
				const action = document.querySelector("[data-probe=action]");
				const hs = getComputedStyle(header);
				const px = (v) => (v === "normal" || v === "" ? 0 : parseFloat(v));
				return {
					cardDataSlots: document.querySelectorAll('#root [data-slot^="card"]').length,
					columns: hs.gridTemplateColumns.split(/\s+/).filter(Boolean).map((v) => r1(parseFloat(v))),
					headerContentWidth: r1(header.clientWidth - px(hs.paddingLeft) - px(hs.paddingRight)),
					actionWidth: r1(action.getBoundingClientRect().width),
					columnGap: r1(px(hs.columnGap)),
				};
			}),
	},
	"button-group-nested": {
		selectors: ["[data-probe=outer]", "[data-probe=inner-1]", "[data-probe=inner-2]"],
		run: async ({ page }) =>
			page.evaluate(async () => {
				const { r1, settle } = window.__tfMeasure;
				await settle();
				const outer = document.querySelector("[data-probe=outer]");
				const a = document.querySelector("[data-probe=inner-1]").getBoundingClientRect();
				const b = document.querySelector("[data-probe=inner-2]").getBoundingClientRect();
				const gap = getComputedStyle(outer).columnGap;
				return { outerColumnGap: gap === "normal" ? 0 : r1(parseFloat(gap)), innerGap: r1(b.left - a.right) };
			}),
	},
};

async function measureBeam(page, props) {
	await page.waitForTimeout(600);
	return page.evaluate((p) => {
		const el = document.querySelector("#root .relative > div");
		const after = getComputedStyle(el, "::after");
		return {
			props: p,
			afterBackgroundImage: after.backgroundImage,
			afterAnimationName: after.animationName,
			afterAnimationDuration: after.animationDuration,
			runningAnimations: document.getAnimations().length,
		};
	}, props);
}

// BlurFade (C12c): SSR HTML from the bundle, then one of three mount modes; opacity read at mount
// and 1500 ms later (today's KPI worst case is 980 ms).
const IO_STUB = `window.IntersectionObserver = class { constructor() {} observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } };`;
async function runBlur(id, mode, theme) {
	const ssrPage = await openPage(theme);
	let ssrHtml;
	try {
		await loadHarness(ssrPage.page, theme);
		ssrHtml = await ssrPage.page.evaluate((pid) => window.__tfProbes.ssr(pid), id);
	} finally {
		await ssrPage.ctx.close();
	}
	const ariaOf = (html) => /aria-hidden="([^"]*)"/.exec(html)?.[1] ?? null;
	const base = { ssrHtmlHasOpacity0: /(^|[\s"])opacity-0([\s"]|$)/.test(ssrHtml), ssrAriaHidden: ariaOf(ssrHtml) };
	const read = (page) =>
		page.evaluate(() => {
			const el = document.querySelector("#root > div");
			return { opacity: Number(getComputedStyle(el).opacity), ariaHidden: el.getAttribute("aria-hidden") };
		});
	const ctxOptions = mode === "no-js" ? { javaScriptEnabled: false } : mode === "reduced-motion" ? { reducedMotion: "reduce" } : {};
	const o = await openPage(theme, ctxOptions, mode === "io-stub" ? [IO_STUB] : []);
	try {
		if (mode === "no-js") {
			const p = `/nojs-${id}-${theme}.html`;
			pages.set(p, indexHtml(theme, ssrHtml, false));
			await o.page.goto(`${ORIGIN}${p}`, { waitUntil: "load" });
		} else {
			await loadHarness(o.page, theme);
			await o.page.evaluate((pid) => window.__tfProbes.hydrate(pid), id);
		}
		await o.page.waitForSelector("#root > div", { state: "attached", timeout: 5000 });
		const start = await read(o.page);
		await o.page.waitForTimeout(1500);
		const end = await read(o.page);
		return { ...base, opacityAtStart: start.opacity, opacityAtEnd: end.opacity, ariaHiddenAtEnd: end.ariaHidden, ...(o.pageErrors.length ? { pageErrors: o.pageErrors } : {}) };
	} finally {
		await o.ctx.close();
	}
}

const ids = Object.keys(PROBES).filter((id) => !only || only.includes(id));
if (only) for (const id of only) if (!PROBES[id]) {
	console.error(`component-probes: unknown probe ${id}`);
	process.exit(2);
}

const results = {};
let failed = false;
try {
	for (const id of ids) {
		const probe = PROBES[id];
		results[id] = {};
		for (const theme of THEMES) {
			try {
				if (probe.blurMode) {
					results[id][theme] = await runBlur(id, probe.blurMode, theme);
					continue;
				}
				const props = probe.props ? probe.props() : {};
				const o = await openPage(theme);
				try {
					await loadHarness(o.page, theme);
					await o.page.evaluate(({ pid, p }) => window.__tfProbes.render(pid, p), { pid: id, p: props });
					await waitAll(o.page, probe.selectors);
					const r = await probe.run({ page: o.page, props });
					results[id][theme] = o.pageErrors.length ? { ...r, pageErrors: o.pageErrors } : r;
				} finally {
					await o.ctx.close();
				}
			} catch (e) {
				failed = true;
				results[id][theme] = { error: String(e?.message ?? e).split("\n")[0].slice(0, 300) };
			}
		}
		const brief = (v) => JSON.stringify(v).slice(0, 220);
		console.log(`${id}: light ${brief(results[id].light)} | dark ${brief(results[id].dark)}`);
	}
} finally {
	await browser.close();
}

// date-popover vs plain-popover corner patch, per theme (C7: the square calendar background erases
// the popover's rounded border arc when the two differ).
if (results["date-popover"]) {
	for (const theme of THEMES) {
		const a = results["date-popover"][theme]?.cornerPatch;
		const b = results["plain-popover"]?.[theme]?.cornerPatch;
		let max = null;
		if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) {
			max = 0;
			for (let i = 0; i < a.length; i++) for (let c = 0; c < 4; c++) max = Math.max(max, Math.abs(a[i][c] - b[i][c]));
		}
		if (results["date-popover"][theme] && !results["date-popover"][theme].error) results["date-popover"][theme].cornerPatchMaxDiffVsPlain = max;
	}
}

const tailwindVersion = JSON.parse(fs.readFileSync(require.resolve("tailwindcss/package.json"), "utf8")).version;
const report = {
	meta: { tailwindVersion, scannedFiles: scanner.files.length, candidates: candidates.length + probeDirCandidates.length, bundleBytes: Buffer.byteLength(entryJs) },
	results,
};
const outFile = path.join(OUT, `probes-${label}.json`);
fs.writeFileSync(outFile, JSON.stringify(report, null, 1));
console.error(`report: ${outFile}`);
process.exit(failed ? 1 : 0);
