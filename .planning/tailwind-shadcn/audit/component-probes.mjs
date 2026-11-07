// Real-component Chromium probes for the Tailwind v4 / shadcn remediation (ledger rows C1, C2, C3,
// C6, C7, C9, C12a, C12b, C12c, C13 and research rows N1, N2, N3, H10). jsdom computes neither layout nor oklch, so
// these mount the REAL repo components in headless Chromium, styled by the REAL compiled
// src/app/globals.css. Read-only against the repo: writes only to $TW_AUDIT_OUT (default:
// <tmpdir>/tenantflow-tw-audit).
//
// Usage (from the repo root):
//   node .planning/tailwind-shadcn/audit/component-probes.mjs <label> [--only id,id] [--shots <dir>]
//
// --shots <dir> (66.2-37): after each scenario is measured, writes an element screenshot
// (`animations: "disabled"`) of the scenario root #root to <dir>/<id>-<theme>.png, or a viewport
// screenshot when #root has no box (portaled content); for the `button` probe it also writes
// <dir>/button-focus-<theme>.png with [data-probe="v-outline"] keyboard-focused (Tab from
// document.body until it is document.activeElement and matches :focus-visible). The shots are
// taken after the measurement returns, so every probe output is byte-identical with or without
// the option. <dir>/shots-manifest.json lists { file, id, theme, mode: element|viewport|error }.
// A <dir> inside the repo is refused (exit 2), as in screens.mjs.
//
// Build: probes/entry.tsx is bundled with the repo's rolldown (never Bun.build, which mis-bundles
// radix-ui's `import * as Dialog`) into $TW_AUDIT_OUT/.probes/entry.js. One resolver plugin maps
//   #lib/supabase/client -> probes/stubs/supabase-client.ts
//   #lib/frontend-logger -> probes/stubs/frontend-logger.ts
//   next/link            -> probes/stubs/next-link.tsx (66.2-35: the real module reads process.env)
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
//   chart                   { gridLineCount, gridStroke, activeDotStroke, activeDotStrokeWidth,
//                            borderToken }  borderToken = the canvas [r,g,b,a] of the computed
//                            --border custom property on <html>, read in the same page and theme
//                            as gridStroke (66.2-25 VD-16: gridStroke = borderToken at 50% alpha)
//   command                 { wrapperHeight, inputHeight, inputOverflowsWrapper, inputOverflowPx,
//                            wrapperBorderBottomPx }  inputOverflowPx = max(wrapper.top - input.top,
//                            input.bottom - wrapper.bottom, 0) against the wrapper's border box;
//                            wrapperBorderBottomPx = its computed border-bottom-width;
//                            inputOverflowsWrapper = inputOverflowPx > wrapperBorderBottomPx (66.2-21
//                            VD-18: upstream new-york-v4 centres a 48px input in a 48px border-box
//                            wrapper with a 1px border-b, leaving 0.5px inside that border)
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
//   border-beam-reduced-motion  the border-beam-stats render (same props, card and 600 ms wait)
//                            in a context with reducedMotion: "reduce"; same fields
//   blur-fade-no-js, -reduced-motion, -io-stub
//                           { ssrHtmlHasOpacity0, ssrAriaHidden, opacityAtStart, opacityAtEnd,
//                            ariaHiddenAtEnd, dataSlot, animationNameAtStart, animationDuration,
//                            transformAtEnd, filterAtEnd, willChangeAtEnd, ioConstructions }
//                            wrapper = #root > div; the start sample is read right after the
//                            wrapper attaches, the end sample 1500 ms later; ioConstructions =
//                            IntersectionObserver constructions counted by the io-stub (null in
//                            the other modes)
//   update-password-badge   { classes, bg }
//   data-table              { cellBg, headerCellBg, hoverRowBg, selectedRowBg }
//   card-action (C6)        { cardDataSlots, columns, headerContentWidth, actionWidth, columnGap }
//                            cardDataSlots = [data-slot^="card"] count in #root; columns = the
//                            header's computed grid-template-columns in px; headerContentWidth =
//                            header clientWidth minus horizontal padding; actionWidth = the
//                            action's border-box width; columnGap = computed column-gap in px
//   button-group-nested (C13) { outerColumnGap, innerGap }  outer computed column-gap in px
//                            (normal = 0); innerGap = inner-2 left minus inner-1 right
//   button (C9, D-29)       { bodyBg, variants: { <variant>: { dataSlot, dataVariant, dataSize,
//                            height, minHeight, flexShrink, borderTopWidth, borderColor, bg, color,
//                            boxShadowRest, contrast, hoverBg, focus: { focusVisible, outlineStyle,
//                            boxShadow, borderColor } } }, sizes: { sm, lg, icon: { height, width,
//                            minHeight, minWidth, dataSize } }, invalid: { borderColor },
//                            asChild: { tag, dataSlot, buttonCount }, icons: { unsized, size5, hw5:
//                            [w, h] }, refs: { border, input, destructive, ring } }
//                            Rest values are read before any input. focus: Tab pressed from
//                            document.body until the variant's Button is document.activeElement (the
//                            variants come first in tab order), read after the transition settles.
//                            hoverBg: read after page.hover, then the mouse moves away. Colors are
//                            border-top colors through the canvas helper; contrast = WCAG ratio of
//                            color over bg composited over the computed body background (2 dp);
//                            heights and widths in CSS px (1 dp), icon boxes rounded to integers
//   toast-default, toast-success, toast-error, toast-loading (66.2-26, A2, VD-24, VD-25)
//                           { toasterClass, toasterInlineNormalBg, toastBg, toastColor,
//                            toastBorderColor, toastRadius, popoverToken, popoverFgToken, borderToken,
//                            iconClasses, iconWidth }  read after [data-sonner-toast][data-mounted=true]
//                            appears plus 600 ms (Sonner's 400 ms entrance). toasterClass = the
//                            ol[data-sonner-toaster] className; toasterInlineNormalBg = its inline
//                            --normal-bg; toastBg/toastColor/toastBorderColor (top) via the canvas
//                            helper; toastRadius = computed top-left radius; the three tokens = a
//                            scratch div painted with var(--color-popover), var(--color-popover-
//                            foreground) and var(--color-border) read through the canvas helper;
//                            baseTokens = the same reads of var(--popover), var(--popover-foreground)
//                            and var(--border), which :root/.dark always define (Tailwind emits a
//                            --color-* theme variable only when something references it);
//                            iconClasses = the [data-icon] svg classList (null without one);
//                            iconWidth = its rounded width (null without one). Element screenshots:
//                            $TW_AUDIT_OUT/probes-<label>-shots/toast-<kind>-<theme>.png
//   quick-actions-dock-centering (66.2-35, D-39, D-51, VD-37)
//                           { viewportWidth, sidebarWidthToken, expandedLeft, collapsedLeft,
//                            collapsedAttr, reExpandedLeft, transitionProperty, transitionDuration,
//                            transitionTimingFunction }  dock = the parent of the flex row holding
//                            the action links; viewportWidth = documentElement.clientWidth;
//                            sidebarWidthToken = the trimmed computed --sidebar-width on <html>;
//                            the three lefts are the dock's computed left in px, read 300 ms after
//                            mount, then 400 ms after each [data-slot="sidebar-trigger"] click
//                            (past the 200 ms rail transition); collapsedAttr = data-collapsible of
//                            [data-slot="sidebar"] after the first click; transition-* = the dock's
//                            computed values
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
	"next/link": path.join(PROBES_DIR, "stubs/next-link.tsx"),
};
const ALIAS = /^#(components|lib|hooks|types|stores|providers|config)\/(.+)$/;
const EXTS = ["", ".tsx", ".ts", "/index.tsx", "/index.ts"];
const ORIGIN = "http://tf-probe.local";
const THEMES = ["light", "dark"];

// ---------- argv ----------
const argv = process.argv.slice(2);
let label = null;
let only = null;
let shotsDir = null;
for (let i = 0; i < argv.length; i++) {
	if (argv[i] === "--only") only = (argv[++i] ?? "").split(",").filter(Boolean);
	else if (argv[i] === "--shots") shotsDir = argv[++i] ? path.resolve(argv[i]) : null;
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
	console.error("usage: component-probes.mjs <label> [--only id,id] [--shots <dir>]");
	process.exit(2);
}
// The nearest existing ancestor's realpath plus the missing tail (the screens.mjs rule).
const realish = (p) => {
	let head = path.resolve(p);
	const tail = [];
	while (!fs.existsSync(head)) {
		tail.unshift(path.basename(head));
		const up = path.dirname(head);
		if (up === head) break;
		head = up;
	}
	return path.join(fs.realpathSync(head), ...tail);
};
if (argv.includes("--shots")) {
	const rel = shotsDir ? path.relative(realish(ROOT), realish(shotsDir)) : "";
	if (!shotsDir || (!rel.startsWith("..") && !path.isAbsolute(rel))) {
		console.error(`component-probes: refusing --shots inside the repo or without a directory (${shotsDir})`);
		process.exit(2);
	}
	fs.mkdirSync(shotsDir, { recursive: true });
}
const shotsManifest = [];
// Element shot of the scenario root, or the viewport when the scenario renders through a portal.
const takeShot = async (page, file, id, theme) => {
	if (!shotsDir) return;
	const target = path.join(shotsDir, file);
	try {
		const box = await page.locator("#root").boundingBox();
		if (box && box.width > 0 && box.height > 0) {
			await page.locator("#root").screenshot({ path: target, animations: "disabled", timeout: 5000 });
			shotsManifest.push({ file, id, theme, mode: "element" });
		} else {
			await page.screenshot({ path: target, animations: "disabled", timeout: 5000 });
			shotsManifest.push({ file, id, theme, mode: "viewport" });
		}
	} catch (e) {
		shotsManifest.push({ file, id, theme, mode: "error", error: String(e?.message ?? e).split("\n")[0].slice(0, 200) });
	}
};
// The Button focus shot: the outline variant keyboard-focused the way measureButton reads focus.
const takeButtonFocusShot = async (page, theme) => {
	if (!shotsDir) return;
	const file = `button-focus-${theme}.png`;
	await page.evaluate(() => document.activeElement?.blur());
	let reached = false;
	for (let i = 0; i < 20 && !reached; i++) {
		await page.keyboard.press("Tab");
		reached = await page.evaluate(() => {
			const el = document.querySelector("[data-probe=v-outline]");
			return document.activeElement === el && el.matches(":focus-visible");
		});
	}
	if (!reached) {
		shotsManifest.push({ file, id: "button", theme, mode: "error", error: "v-outline never reached :focus-visible" });
		return;
	}
	await page.waitForTimeout(400);
	await takeShot(page, file, "button", theme);
};

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

const TOAST_SELECTORS = ["ol[data-sonner-toaster]", '[data-sonner-toast][data-mounted="true"]'];
const TOAST_ENTRANCE_MS = 600;
async function measureToast(page, kind, theme) {
	await page.waitForTimeout(TOAST_ENTRANCE_MS);
	const r = await page.evaluate(() => {
		const { toRgbaArray } = window.__tfMeasure;
		const ol = document.querySelector("ol[data-sonner-toaster]");
		const t = document.querySelector("[data-sonner-toast]");
		const ts = getComputedStyle(t);
		const token = (prop) => {
			const d = document.createElement("div");
			d.style.backgroundColor = `var(${prop})`;
			document.body.appendChild(d);
			const c = toRgbaArray(getComputedStyle(d).backgroundColor);
			d.remove();
			return c;
		};
		const svg = t.querySelector("[data-icon] svg");
		return {
			toasterClass: ol.className,
			toasterInlineNormalBg: ol.style.getPropertyValue("--normal-bg"),
			toastBg: toRgbaArray(ts.backgroundColor),
			toastColor: toRgbaArray(ts.color),
			toastBorderColor: toRgbaArray(ts.borderTopColor),
			toastRadius: ts.borderTopLeftRadius,
			popoverToken: token("--color-popover"),
			popoverFgToken: token("--color-popover-foreground"),
			borderToken: token("--color-border"),
			baseTokens: { popover: token("--popover"), popoverForeground: token("--popover-foreground"), border: token("--border") },
			iconClasses: svg ? [...svg.classList] : null,
			iconWidth: svg ? Math.round(svg.getBoundingClientRect().width) : null,
		};
	});
	const shots = path.join(OUT, `probes-${label}-shots`);
	fs.mkdirSync(shots, { recursive: true });
	await page.locator("[data-sonner-toast]").first().screenshot({ path: path.join(shots, `toast-${kind}-${theme}.png`) });
	return r;
}

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
					borderToken: toRgbaArray(getComputedStyle(document.documentElement).getPropertyValue("--border").trim()),
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
				const wrapper = document.querySelector("[data-slot=command-input-wrapper]");
				const w = wrapper.getBoundingClientRect();
				const i = document.querySelector("[cmdk-input]").getBoundingClientRect();
				const inputOverflowPx = r1(Math.max(w.top - i.top, i.bottom - w.bottom, 0));
				const wrapperBorderBottomPx = r1(parseFloat(getComputedStyle(wrapper).borderBottomWidth) || 0);
				return {
					wrapperHeight: r1(w.height),
					inputHeight: r1(i.height),
					inputOverflowsWrapper: inputOverflowPx > wrapperBorderBottomPx,
					inputOverflowPx,
					wrapperBorderBottomPx,
				};
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
	"border-beam-reduced-motion": { props: () => borderBeamProps("src/components/tenants/tenant-stats.tsx"), ctxOptions: { reducedMotion: "reduce" }, selectors: ["#root .relative > div"], run: async ({ page, props }) => measureBeam(page, props) },
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
	button: {
		selectors: ["[data-probe=v-default]", "[data-probe=i-hw5]", "[data-probe=ref-ring]"],
		run: async ({ page }) => measureButton(page),
	},
	"toast-default": { selectors: TOAST_SELECTORS, run: async ({ page, theme }) => measureToast(page, "default", theme) },
	"toast-success": { selectors: TOAST_SELECTORS, run: async ({ page, theme }) => measureToast(page, "success", theme) },
	"toast-error": { selectors: TOAST_SELECTORS, run: async ({ page, theme }) => measureToast(page, "error", theme) },
	"toast-loading": { selectors: TOAST_SELECTORS, run: async ({ page, theme }) => measureToast(page, "loading", theme) },
	"quick-actions-dock-centering": {
		selectors: ['[data-slot="sidebar-trigger"]', 'a[aria-label="Add Property"]'],
		run: async ({ page }) => {
			const readDock = () =>
				page.evaluate(() => {
					const dock = document.querySelector('a[aria-label="Add Property"]').parentElement.parentElement;
					const ds = getComputedStyle(dock);
					return {
						left: parseFloat(ds.left),
						transitionProperty: ds.transitionProperty,
						transitionDuration: ds.transitionDuration,
						transitionTimingFunction: ds.transitionTimingFunction,
					};
				});
			const trigger = page.locator('[data-slot="sidebar-trigger"]');
			await page.waitForTimeout(300);
			const expanded = await readDock();
			const page0 = await page.evaluate(() => ({
				viewportWidth: document.documentElement.clientWidth,
				sidebarWidthToken: getComputedStyle(document.documentElement).getPropertyValue("--sidebar-width").trim(),
			}));
			await trigger.click();
			await page.waitForTimeout(400);
			const collapsed = await readDock();
			const collapsedAttr = await page.evaluate(() => document.querySelector('[data-slot="sidebar"]')?.getAttribute("data-collapsible") ?? null);
			await trigger.click();
			await page.waitForTimeout(400);
			const reExpanded = await readDock();
			return {
				viewportWidth: page0.viewportWidth,
				sidebarWidthToken: page0.sidebarWidthToken,
				expandedLeft: expanded.left,
				collapsedLeft: collapsed.left,
				collapsedAttr,
				reExpandedLeft: reExpanded.left,
				transitionProperty: expanded.transitionProperty,
				transitionDuration: expanded.transitionDuration,
				transitionTimingFunction: expanded.transitionTimingFunction,
			};
		},
	},
};

const BUTTON_VARIANTS = ["default", "destructive", "outline", "secondary", "ghost", "link"];
const SETTLE_MS = 400;
async function measureButton(page) {
	await page.evaluate(() => window.__tfMeasure.settle());
	const read = (fn, arg) => page.evaluate(fn, arg);
	const rest = await read((variants) => {
		const { toRgbaArray, r1 } = window.__tfMeasure;
		const q = (id) => document.querySelector(`[data-probe=${id}]`);
		const over = (top, bottom) => [0, 1, 2].map((i) => top[i] * top[3] + bottom[i] * (1 - top[3])).concat(1);
		const lum = (c) => {
			const ch = c.slice(0, 3).map((v) => {
				const x = v / 255;
				return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
			});
			return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
		};
		const ratio = (a, b) => {
			const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
			return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
		};
		const bodyBg = toRgbaArray(getComputedStyle(document.body).backgroundColor);
		const base = bodyBg[3] >= 1 ? bodyBg : over(bodyBg, [255, 255, 255, 1]);
		const out = { bodyBg, variants: {} };
		for (const v of variants) {
			const el = q(`v-${v}`);
			const s = getComputedStyle(el);
			const bg = toRgbaArray(s.backgroundColor);
			const color = toRgbaArray(s.color);
			const surface = over(bg, base);
			out.variants[v] = {
				dataSlot: el.getAttribute("data-slot"),
				dataVariant: el.getAttribute("data-variant"),
				dataSize: el.getAttribute("data-size"),
				height: r1(el.getBoundingClientRect().height),
				minHeight: s.minHeight,
				flexShrink: s.flexShrink,
				borderTopWidth: parseFloat(s.borderTopWidth),
				borderColor: toRgbaArray(s.borderTopColor),
				bg,
				color,
				boxShadowRest: s.boxShadow,
				contrast: ratio(over(color, surface), surface),
			};
		}
		const size = (id) => {
			const el = q(id);
			const b = el.getBoundingClientRect();
			const s = getComputedStyle(el);
			return { height: r1(b.height), width: r1(b.width), minHeight: s.minHeight, minWidth: s.minWidth, dataSize: el.getAttribute("data-size") };
		};
		out.sizes = { sm: size("s-sm"), lg: size("s-lg"), icon: size("s-icon") };
		out.invalid = { borderColor: toRgbaArray(getComputedStyle(q("invalid")).borderTopColor) };
		const a = q("aschild");
		out.asChild = { tag: a.tagName, dataSlot: a.getAttribute("data-slot"), buttonCount: q("aschild-wrap").querySelectorAll("button").length };
		const box = (id) => {
			const b = q(id).getBoundingClientRect();
			return [Math.round(b.width), Math.round(b.height)];
		};
		out.icons = { unsized: box("i-unsized"), size5: box("i-size5"), hw5: box("i-hw5") };
		const ref = (id) => toRgbaArray(getComputedStyle(q(id)).borderTopColor);
		out.refs = { border: ref("ref-border"), input: ref("ref-input"), destructive: ref("ref-destructive"), ring: ref("ref-ring") };
		return out;
	}, BUTTON_VARIANTS);
	for (const v of BUTTON_VARIANTS) {
		let reached = false;
		for (let i = 0; i < 20 && !reached; i++) {
			await page.keyboard.press("Tab");
			reached = await read((id) => document.activeElement === document.querySelector(`[data-probe=${id}]`), `v-${v}`);
		}
		await page.waitForTimeout(SETTLE_MS);
		rest.variants[v].focus = await read((id) => {
			const { toRgbaArray } = window.__tfMeasure;
			const el = document.querySelector(`[data-probe=${id}]`);
			const s = getComputedStyle(el);
			return { focusVisible: document.activeElement === el && el.matches(":focus-visible"), outlineStyle: s.outlineStyle, boxShadow: s.boxShadow, borderColor: toRgbaArray(s.borderTopColor) };
		}, `v-${v}`);
	}
	await read(() => document.activeElement?.blur());
	for (const v of BUTTON_VARIANTS) {
		await page.hover(`[data-probe=v-${v}]`);
		await page.waitForTimeout(SETTLE_MS);
		rest.variants[v].hoverBg = await read((id) => window.__tfMeasure.toRgbaArray(getComputedStyle(document.querySelector(`[data-probe=${id}]`)).backgroundColor), `v-${v}`);
		await page.mouse.move(1, 1);
		await page.waitForTimeout(SETTLE_MS);
	}
	return rest;
}

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
// and 1500 ms later (the KPI worst case is 480 ms delay + 500 ms duration = 980 ms, 66.2-27). The
// io-stub counts constructions, starting at 0, so an observer that is never built reports 0.
const IO_STUB = `window.__tfIoConstructions = 0; window.IntersectionObserver = class { constructor() { window.__tfIoConstructions += 1; } observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } };`;
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
			const cs = getComputedStyle(el);
			return {
				opacity: Number(cs.opacity),
				ariaHidden: el.getAttribute("aria-hidden"),
				dataSlot: el.getAttribute("data-slot"),
				animationName: cs.animationName,
				animationDuration: cs.animationDuration,
				transform: cs.transform,
				filter: cs.filter,
				willChange: cs.willChange,
			};
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
		const ioConstructions = mode === "io-stub" ? await o.page.evaluate(() => window.__tfIoConstructions ?? 0) : null;
		await takeShot(o.page, `${id}-${theme}.png`, id, theme);
		return {
			...base,
			opacityAtStart: start.opacity,
			opacityAtEnd: end.opacity,
			ariaHiddenAtEnd: end.ariaHidden,
			dataSlot: end.dataSlot,
			animationNameAtStart: start.animationName,
			animationDuration: start.animationDuration,
			transformAtEnd: end.transform,
			filterAtEnd: end.filter,
			willChangeAtEnd: end.willChange,
			ioConstructions,
			...(o.pageErrors.length ? { pageErrors: o.pageErrors } : {}),
		};
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
				const o = await openPage(theme, probe.ctxOptions ?? {});
				try {
					await loadHarness(o.page, theme);
					await o.page.evaluate(({ pid, p }) => window.__tfProbes.render(pid, p), { pid: id, p: props });
					await waitAll(o.page, probe.selectors);
					const r = await probe.run({ page: o.page, props, theme });
					results[id][theme] = o.pageErrors.length ? { ...r, pageErrors: o.pageErrors } : r;
					await takeShot(o.page, `${id}-${theme}.png`, id, theme);
					if (id === "button") await takeButtonFocusShot(o.page, theme);
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
if (shotsDir) {
	fs.writeFileSync(path.join(shotsDir, "shots-manifest.json"), `${JSON.stringify(shotsManifest, null, 1)}\n`);
	console.error(`shots: ${shotsManifest.length} in ${shotsDir} (${shotsManifest.filter((s) => s.mode === "error").length} errors)`);
}
process.exit(failed ? 1 : 0);
