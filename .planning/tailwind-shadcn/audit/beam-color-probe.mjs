// BorderBeam colour probe (Phase 66.2, B6 / D-13) in headless Chromium against the CURRENT
// src/app/globals.css.
// Read-only against the repo: writes only $TW_AUDIT_OUT/beam-colors.json
// (default: <tmpdir>/tenantflow-tw-audit).
//
// Usage (from the repo root):
//   node .planning/tailwind-shadcn/audit/beam-color-probe.mjs
//
// What it measures: BorderBeam paints its beam with
//   after:[background:linear-gradient(to_left,var(--color-from),var(--color-to),transparent)]
// where --color-from / --color-to come from the colorFrom / colorTo props. When either value
// is an invalid colour, the whole background declaration is invalid at computed-value time
// and the ::after background-image computes to `none`: the beam never paints.
//
// Everything under test is read from source:
//   - the BorderBeam class list: the double-quoted literals between `className={cn(` and the
//     next `className,` in src/components/ui/border-beam.tsx (exit 2 "probe stale" when the
//     gradient class above is missing);
//   - one case per `<BorderBeam … />` block, in document order, of
//     src/components/tenants/tenant-stats.tsx and tenant-grid.tsx, labelled `<basename>#<n>`
//     (exit 2 when a block lacks colorFrom or colorTo).
// Two controls are appended: `control-invalid` (the B6 defect form, a legacy hue-saturation-
// lightness wrapper around a bare custom property, which must compute to `none`) and
// `control-valid` (var(--color-primary) to transparent, which must paint). The invalid strings
// are assembled from parts at run time so this tooling file carries no literal legacy colour
// function, following the 66.2-01 colour-literal discipline for audit tooling.
//
// Output: { light: { <label>: { from, to, backgroundImage, ok } }, dark: { … } }, where
// ok = backgroundImage starts with `linear-gradient(`. Printed to stdout and written to
// beam-colors.json.
// Exit 0 only when every call-site case is ok in both modes, control-invalid is `none` in both
// modes and control-valid is ok in both modes; exit 1 otherwise; exit 2 on a stale probe.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const ROOT = process.cwd();
const require = createRequire(path.join(ROOT, "package.json"));
const { compile } = await import(require.resolve("@tailwindcss/node"));
const { chromium } = require("playwright");

const OUT_DIR = process.env.TW_AUDIT_OUT || path.join(os.tmpdir(), "tenantflow-tw-audit");
const GRADIENT_CLASS =
	"after:[background:linear-gradient(to_left,var(--color-from),var(--color-to),transparent)]";
const CALL_SITES = ["src/components/tenants/tenant-stats.tsx", "src/components/tenants/tenant-grid.tsx"];

const readRepo = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

function stale(message) {
	process.stderr.write(`beam-color-probe: probe stale: ${message}\n`);
	process.exit(2);
}

function beamClasses() {
	const text = readRepo("src/components/ui/border-beam.tsx");
	const start = text.indexOf("className={cn(");
	if (start === -1) stale("no `className={cn(` in border-beam.tsx");
	const end = text.indexOf("className,", start);
	if (end === -1) stale("no `className,` after `className={cn(` in border-beam.tsx");
	const segment = text.slice(start, end);
	const classes = [];
	for (const match of segment.matchAll(/"([^"]*)"/g)) {
		for (const cls of match[1].split(/\s+/)) if (cls !== "") classes.push(cls);
	}
	if (!classes.includes(GRADIENT_CLASS)) stale(`border-beam.tsx class list lacks ${GRADIENT_CLASS}`);
	return classes;
}

function callSiteCases() {
	const cases = [];
	for (const rel of CALL_SITES) {
		const text = readRepo(rel);
		const base = path.basename(rel);
		let n = 0;
		for (const block of text.matchAll(/<BorderBeam\b[\s\S]*?\/>/g)) {
			n += 1;
			const from = /colorFrom="([^"]*)"/.exec(block[0])?.[1];
			const to = /colorTo="([^"]*)"/.exec(block[0])?.[1];
			if (from === undefined || to === undefined) stale(`${base}#${n} lacks colorFrom or colorTo`);
			cases.push({ label: `${base}#${n}`, from, to, callSite: true });
		}
		if (n === 0) stale(`no <BorderBeam … /> block in ${rel}`);
	}
	return cases;
}

const legacyWrapper = ["hs", "l("].join("");
const cases = [
	...callSiteCases(),
	{
		label: "control-invalid",
		from: `${legacyWrapper}var(--primary))`,
		to: `${legacyWrapper}var(--primary)/0.3)`,
		callSite: false,
	},
	{ label: "control-valid", from: "var(--color-primary)", to: "transparent", callSite: false },
];

const classes = beamClasses();
const cssPath = path.join(ROOT, "src/app/globals.css");
const compiler = await compile(fs.readFileSync(cssPath, "utf8"), {
	base: path.dirname(cssPath),
	from: cssPath,
	onDependency() {},
});
const built = compiler.build(classes);

const escapeAttr = (value) => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
const classAttr = escapeAttr(classes.join(" "));

const result = {};
const browser = await chromium.launch();
try {
	for (const mode of ["light", "dark"]) {
		const page = await browser.newPage();
		const wrappers = cases
			.map((c, i) => {
				const style = `--size:80;--duration:10;--anchor:90;--border-width:1;--delay:-0s;--color-from:${c.from};--color-to:${c.to}`;
				return `<div style="position:relative;width:200px;height:100px"><div id="case-${i}" class="${classAttr}" style="${escapeAttr(style)}"></div></div>`;
			})
			.join("\n");
		await page.setContent(
			`<!doctype html><html class="${mode}"><head><style>${built}</style></head><body>${wrappers}</body></html>`,
		);
		const images = await page.evaluate(
			(count) =>
				Array.from({ length: count }, (_, i) =>
					getComputedStyle(document.getElementById(`case-${i}`), "::after").backgroundImage,
				),
			cases.length,
		);
		result[mode] = {};
		cases.forEach((c, i) => {
			const backgroundImage = images[i];
			result[mode][c.label] = {
				from: c.from,
				to: c.to,
				backgroundImage,
				ok: backgroundImage.startsWith("linear-gradient("),
			};
		});
		await page.close();
	}
} finally {
	await browser.close();
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const text = `${JSON.stringify(result, null, 2)}\n`;
fs.writeFileSync(path.join(OUT_DIR, "beam-colors.json"), text);
process.stdout.write(text);

const pass = ["light", "dark"].every((mode) => {
	const byLabel = result[mode];
	const sitesOk = cases.filter((c) => c.callSite).every((c) => byLabel[c.label].ok);
	return sitesOk && byLabel["control-invalid"].backgroundImage === "none" && byLabel["control-valid"].ok;
});
process.exit(pass ? 0 : 1);
