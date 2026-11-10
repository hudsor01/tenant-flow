// Wave 6 Step 0 (66.2-30 Task 1): re-fetch and re-hash the canonical new-york-v4 sidebar and
// use-mobile registry items, count the divergence anchors the wave-6 plans rely on (V1-V12,
// S11/S12/S13), and typecheck the import-rewritten canonical sidebar.tsx against the repo's
// post-W5 primitives (N18 / A4) with a negative control.
//
// Usage (repo root):
//   TW_AUDIT_OUT=<dir outside the repo> node .planning/tailwind-shadcn/audit/sidebar-registry-check.mjs
//
// Outputs (all under $TW_AUDIT_OUT):
//   registry/sidebar.json, registry/sidebar.headers, registry/use-mobile.json,
//   registry/use-mobile.headers   byte-for-byte bodies and the status line plus response headers
//   registry-w6.json              fetch metadata, raw/content sha256, research comparison, anchors
//   tsc-sidebar-w6.json           tsc version, rewrite map, positive/negative results, dependencies
//   tsc-sidebar/                  the scratch typecheck project (node_modules symlink; never copy)
//
// It reads no environment file and needs no credentials. It writes nothing inside the repo:
// an OUT inside ROOT exits 2. A non-200 fetch, a rewrite spec that does not occur exactly once,
// a positive typecheck with errors or a negative control that passes exits 1.
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT_RAW = process.env.TW_AUDIT_OUT;
if (!OUT_RAW) {
	process.stderr.write("TW_AUDIT_OUT is required\n");
	process.exit(2);
}
const OUT = path.resolve(OUT_RAW);
if (!path.relative(ROOT, OUT).startsWith("..")) {
	process.stderr.write(`refusing to write inside the repo: ${OUT}\n`);
	process.exit(2);
}
fs.mkdirSync(path.join(OUT, "registry"), { recursive: true });

const RESEARCH_SIDEBAR_CONTENT_SHA256 = "2ba1a9b9422f4172373f4cd0587b675d2331a41f4fa68f65dab2b23ca98fd9d2";
const RESEARCH_USE_MOBILE_CONTENT_SHA256 = "ad0936f84f1df79d3697bfbff9c18f8ad58431c1cbaf2359c6a853b0fcc9f28b";
const REGISTRY_BASE = "https://ui.shadcn.com/r/styles/new-york-v4";
const EXPECTED_EXPORTS = [
	"Sidebar",
	"SidebarContent",
	"SidebarFooter",
	"SidebarGroup",
	"SidebarGroupAction",
	"SidebarGroupContent",
	"SidebarGroupLabel",
	"SidebarHeader",
	"SidebarInput",
	"SidebarInset",
	"SidebarMenu",
	"SidebarMenuAction",
	"SidebarMenuBadge",
	"SidebarMenuButton",
	"SidebarMenuItem",
	"SidebarMenuSkeleton",
	"SidebarMenuSub",
	"SidebarMenuSubButton",
	"SidebarMenuSubItem",
	"SidebarProvider",
	"SidebarRail",
	"SidebarSeparator",
	"SidebarTrigger",
	"useSidebar",
];

const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
const countOf = (hay, needle) => (needle === "" ? 0 : hay.split(needle).length - 1);
const fail = (msg) => {
	process.stderr.write(`${msg}\n`);
	process.exit(1);
};
const git = (...args) => spawnSync("git", args, { cwd: ROOT, encoding: "utf8" });

async function fetchItem(name, researchSha) {
	const url = `${REGISTRY_BASE}/${name}.json`;
	if (!url.startsWith("https://")) fail(`refusing a non-https url: ${url}`);
	const res = await fetch(url);
	const body = Buffer.from(await res.arrayBuffer());
	const headerLines = [`HTTP ${res.status} ${res.statusText}`.trimEnd()];
	for (const [k, v] of res.headers) headerLines.push(`${k}: ${v}`);
	fs.writeFileSync(path.join(OUT, "registry", `${name}.json`), body);
	fs.writeFileSync(path.join(OUT, "registry", `${name}.headers`), `${headerLines.join("\n")}\n`);
	if (res.status !== 200) fail(`${url} returned ${res.status}`);
	const json = JSON.parse(body.toString("utf8"));
	const file0 = json.files?.[0];
	if (!file0 || typeof file0.content !== "string") fail(`${url}: no files[0].content`);
	const contentSha256 = sha256(Buffer.from(file0.content, "utf8"));
	return {
		meta: {
			url,
			status: res.status,
			lastModified: res.headers.get("last-modified"),
			etag: res.headers.get("etag"),
			path: file0.path,
			filesCount: json.files.length,
			contentLines: file0.content.split("\n").length - (file0.content.endsWith("\n") ? 1 : 0),
			registryDependencies: json.registryDependencies ?? [],
			dependencies: json.dependencies ?? [],
			rawSha256: sha256(body),
			contentSha256,
			researchContentSha256: researchSha,
			unchanged: contentSha256 === researchSha,
			fetchedAt: new Date().toISOString(),
		},
		content: file0.content,
	};
}

const fetchedAt = new Date().toISOString();
const sidebar = await fetchItem("sidebar", RESEARCH_SIDEBAR_CONTENT_SHA256);
const useMobile = await fetchItem("use-mobile", RESEARCH_USE_MOBILE_CONTENT_SHA256);
const sb = sidebar.content;

// Anchors: literal substring counts unless a regex is given.
const ANCHORS = [
	["A01", "V9", 'const SIDEBAR_COOKIE_NAME = "sidebar_state"', 1],
	["A02", "V2", 'const SIDEBAR_WIDTH = "16rem"', 1],
	["A03", "V2", 'const SIDEBAR_WIDTH_MOBILE = "18rem"', 1],
	["A04", "V2", 'const SIDEBAR_WIDTH_ICON = "3rem"', 1],
	["A05", "V8", 'const SIDEBAR_KEYBOARD_SHORTCUT = "b"', 1],
	["A06", "V8 (D-52)", /shiftKey|altKey|\.repeat\b/g, 0],
	[
		"A07",
		"V9",
		"document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`",
		1,
	],
	["A08", "V2/rule 5", "style={", 3],
	["A09", "V3", "md:", 10],
	["A10", "D-46", "[&>button]:hidden", 1],
	["A11", "S13/D-35", 'function SidebarInset({ className, ...props }: React.ComponentProps<"main">)', 1],
	["A12", "S11/V5", 'cn("mx-2 w-auto bg-sidebar-border", className)', 1],
	["A13", "S12/D-34", "inert", 0],
];
const anchors = ANCHORS.map(([id, ref, needle, expected]) => {
	const count = needle instanceof RegExp ? (sb.match(needle) ?? []).length : countOf(sb, needle);
	return { id, ref, needle: String(needle), expected, count, ok: count === expected };
});
const useMobileAnchors = [
	{
		id: "UM01",
		ref: "D-33",
		needle: "const MOBILE_BREAKPOINT = 768",
		expected: 1,
		count: countOf(useMobile.content, "const MOBILE_BREAKPOINT = 768"),
	},
].map((a) => ({ ...a, ok: a.count === a.expected }));

const exportBlocks = [...sb.matchAll(/export\s*\{([^}]*)\}/g)];
const lastExport = exportBlocks.at(-1)?.[1] ?? "";
const exports = lastExport
	.split(",")
	.map((s) => s.trim())
	.filter(Boolean)
	.sort();
const exportsMatch = JSON.stringify(exports) === JSON.stringify([...EXPECTED_EXPORTS].sort());

const registry = {
	fetchedAt,
	items: { sidebar: sidebar.meta, "use-mobile": useMobile.meta },
	anchors,
	useMobileAnchors,
	exports,
	exportsMatchResearch: exportsMatch,
};
if (!sidebar.meta.unchanged) {
	registry.changedSinceResearch = {
		anchorsNotOk: anchors.filter((a) => !a.ok).map((a) => a.id),
		exportsDiffer: !exportsMatch,
	};
}
fs.writeFileSync(path.join(OUT, "registry-w6.json"), `${JSON.stringify(registry, null, 2)}\n`);

// Rewrite the 8 import specifiers by exact `from "<spec>"` replacement.
const REWRITES = [
	["cn", "#lib/utils"],
	["@/registry/new-york-v4/hooks/use-mobile", "./use-mobile"],
	...["button", "input", "separator", "sheet", "skeleton", "tooltip"].map((n) => [
		`@/registry/new-york-v4/ui/${n}`,
		`#components/ui/${n}`,
	]),
];
let rewritten = sb;
const rewrites = REWRITES.map(([from, to]) => {
	const needle = `from "${from}"`;
	const count = countOf(rewritten, needle);
	if (count !== 1) fail(`rewrite spec ${needle} occurs ${count} times (expected 1)`);
	rewritten = rewritten.replace(needle, `from "${to}"`);
	return { from, to, count };
});

// Typecheck harness (research recipe).
const TSC = path.join(ROOT, "node_modules/.bin/tsc");
const T = path.join(OUT, "tsc-sidebar");
fs.rmSync(T, { recursive: true, force: true });
fs.mkdirSync(path.join(T, "src"), { recursive: true });
fs.mkdirSync(path.join(T, "neg"), { recursive: true });
fs.symlinkSync(path.join(ROOT, "node_modules"), path.join(T, "node_modules"), "dir");
const paths = Object.fromEntries(
	["components", "lib", "hooks", "types"].map((d) => [`#${d}/*`, [path.join(ROOT, "src", d, "*")]]),
);
const baseConfig = {
	extends: path.join(ROOT, "tsconfig.json"),
	compilerOptions: { incremental: false, plugins: [], types: ["node"], paths },
	include: ["src/**/*.ts", "src/**/*.tsx"],
	exclude: [],
};
fs.writeFileSync(path.join(T, "tsconfig.json"), `${JSON.stringify(baseConfig, null, 2)}\n`);
fs.writeFileSync(
	path.join(T, "tsconfig.neg.json"),
	`${JSON.stringify({ ...baseConfig, include: [...baseConfig.include, "neg/**/*.ts"] }, null, 2)}\n`,
);
fs.writeFileSync(path.join(T, "src/sidebar.tsx"), rewritten);
fs.writeFileSync(path.join(T, "src/use-mobile.ts"), useMobile.content);
fs.writeFileSync(path.join(T, "neg/neg.ts"), 'export const negativeControl: number = "not a number";\n');

const runTsc = (cfg) => {
	const r = spawnSync(TSC, ["-p", path.join(T, cfg)], { cwd: T, encoding: "utf8" });
	const text = `${r.stdout ?? ""}${r.stderr ?? ""}`;
	const errors = text.split("\n").filter((l) => /error TS\d+/.test(l));
	return { exitCode: r.status, errors };
};
const tscVersion = spawnSync(TSC, ["--version"], { encoding: "utf8" }).stdout.trim();
const pos = runTsc("tsconfig.json");
const neg = runTsc("tsconfig.neg.json");
const positive = { exitCode: pos.exitCode, errorCount: pos.errors.length, errors: pos.errors };
const negative = {
	exitCode: neg.exitCode,
	errorCodes: [...new Set(neg.errors.map((l) => l.match(/error (TS\d+)/)[1]))].sort(),
	errors: neg.errors,
};

// Dependencies at HEAD vs PRE_W5.
const head = git("rev-parse", "HEAD").stdout.trim();
const preW5 = git("log", "-1", "--format=%H", "--grep=^docs(66.2-19): record the wave 4 gate").stdout.trim();
if (!preW5) fail("PRE_W5 not found");
if (git("merge-base", "--is-ancestor", preW5, "HEAD").status !== 0) fail("PRE_W5 is not an ancestor of HEAD");
const deps = {};
for (const n of ["button", "input", "separator", "sheet", "skeleton", "tooltip"]) {
	const rel = `src/components/ui/${n}.tsx`;
	const diff = git("diff", "--quiet", preW5, "HEAD", "--", rel);
	if (diff.status !== 0 && diff.status !== 1) fail(`git diff failed for ${rel}`);
	deps[rel] = {
		sha256: sha256(fs.readFileSync(path.join(ROOT, rel))),
		changedSincePreW5: diff.status === 1,
	};
}
const sheetSrc = fs.readFileSync(path.join(ROOT, "src/components/ui/sheet.tsx"), "utf8");
const tooltipSrc = fs.readFileSync(path.join(ROOT, "src/components/ui/tooltip.tsx"), "utf8");
const tooltipExports = [...tooltipSrc.matchAll(/export\s*(?:\{[^}]*\}|(?:function|const)\s+\w+)/g)].map((m) => m[0]);

const tsc = {
	tscVersion,
	head,
	preW5,
	rewrites,
	positive,
	negative,
	deps,
	sheetHasShowCloseButton: sheetSrc.includes("showCloseButton"),
	tooltipProviderExported: tooltipExports.some((e) => /\bTooltipProvider\b/.test(e)),
};
fs.writeFileSync(path.join(OUT, "tsc-sidebar-w6.json"), `${JSON.stringify(tsc, null, 2)}\n`);

process.stdout.write(
	`${JSON.stringify({
		sidebarUnchanged: sidebar.meta.unchanged,
		useMobileUnchanged: useMobile.meta.unchanged,
		anchorsOk: anchors.every((a) => a.ok),
		exports: exports.length,
		positive: positive.errorCount,
		negative: negative.errorCodes,
	})}\n`,
);
if (positive.exitCode !== 0 || negative.exitCode === 0) process.exit(1);
