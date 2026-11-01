// Wave 6 source assertions for the Tailwind v4 / shadcn remediation (66.2-37), reused by 66.2-39.
// Read-only: parses src/app/globals.css with the repo's postcss and reads the owner shell,
// sidebar and E2E config sources with node:fs. It writes nothing.
//
// Usage (from the repo root, or against an extracted tree):
//   node .planning/tailwind-shadcn/audit/w6-assertions.mjs [--root <dir>]
//
// Prints one `PASS <id> <detail>` or `FAIL <id> <detail>` line per assertion and exits 1 when
// any assertion fails, else 0. Ids (decision ids from 66.2-CONTEXT.md):
//   S-TOKENS (D-37)  S-WIDTHS (D-37, D-51)  S-VENDOR (D-32, D-45, D-04)  S-BREAKPOINT (D-33)
//   S-COLLAPSE (D-34, D-52)  S-SHELL (D-35, D-41)  S-COOKIE (D-36)  S-NAV (D-38, D-40)
//   S-DOCK (D-39, D-51)  S-SHEET (D-46, D-48)  S-NEUTRALIZE (D-49)  S-REMNANTS (D-31)
//   S-E2E (D-44)
//
// Every token check on a .ts/.tsx file reads comment-stripped text, because the vendored
// sidebar header names the divergences it removes. Only the S-VENDOR header-content checks
// (the registry URL and V1..V12) read the raw text. The stripper skips double-quoted and
// template strings, so a glob such as `**/x` or a URL inside a string survives; a `//` right
// after `:` is kept as well.
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const argv = process.argv.slice(2);
const rootArg = argv.indexOf("--root");
const ROOT = path.resolve(rootArg >= 0 ? argv[rootArg + 1] : process.cwd());
const require = createRequire(path.join(process.cwd(), "package.json"));
const postcss = require("postcss");

const abs = (f) => path.join(ROOT, f);
const exists = (f) => fs.existsSync(abs(f));
const raw = (f) => (exists(f) ? fs.readFileSync(abs(f), "utf8") : "");

// Remove block and line comments outside double-quoted and template strings.
const stripComments = (src) => {
	let out = "";
	let i = 0;
	let quote = null;
	while (i < src.length) {
		const c = src[i];
		const n = src[i + 1];
		if (quote) {
			out += c;
			if (c === "\\") {
				out += n ?? "";
				i += 2;
				continue;
			}
			if (c === quote || (quote === '"' && c === "\n")) quote = null;
			i++;
			continue;
		}
		if (c === '"' || c === "`") {
			quote = c;
			out += c;
			i++;
			continue;
		}
		if (c === "/" && n === "*") {
			const end = src.indexOf("*/", i + 2);
			i = end < 0 ? src.length : end + 2;
			continue;
		}
		if (c === "/" && n === "/" && src[i - 1] !== ":") {
			const end = src.indexOf("\n", i);
			i = end < 0 ? src.length : end;
			continue;
		}
		out += c;
		i++;
	}
	return out;
};
const strippedCache = new Map();
const code = (f) => {
	if (!strippedCache.has(f)) strippedCache.set(f, /\.[cm]?[jt]sx?$/.test(f) ? stripComments(raw(f)) : raw(f));
	return strippedCache.get(f);
};
const count = (text, needle) => text.split(needle).length - 1;

const walk = (dir) => {
	const out = [];
	if (!exists(dir)) return out;
	for (const e of fs.readdirSync(abs(dir), { withFileTypes: true, recursive: true })) {
		if (!e.isFile()) continue;
		const f = path.relative(ROOT, path.join(e.parentPath ?? e.path, e.name));
		if (f.split(path.sep).includes("node_modules")) continue;
		out.push(f);
	}
	return out.sort();
};
const isTestFile = (f) => /\.test\.[cm]?[jt]sx?$/.test(f) || f.split("/").includes("__tests__");
const isSource = (f) => /\.([cm]?[jt]sx?|css)$/.test(f);
const srcFiles = walk("src").filter(isSource);
const srcNonTest = srcFiles.filter((f) => !isTestFile(f));
const shellNonTest = srcNonTest.filter((f) => f.startsWith("src/components/shell/"));
const filesMatching = (files, re) => files.filter((f) => re.test(code(f)));

let failed = 0;
const report = (id, ok, detail) => {
	if (!ok) failed++;
	console.log(`${ok ? "PASS" : "FAIL"} ${id} ${detail}`);
};
// One assertion id, many sub-checks: PASS only when every sub-check holds; the FAIL line names
// the sub-checks that did not.
const assert = (id, checks) => {
	const misses = checks.filter(([, ok]) => !ok).map(([name]) => name);
	report(id, misses.length === 0, misses.length === 0 ? `${checks.length} checks` : `missing: ${misses.join("; ")}`);
};

const SIDEBAR = "src/components/ui/sidebar.tsx";
const APP_SHELL = "src/components/shell/app-shell.tsx";
const APP_SHELL_SIDEBAR = "src/components/shell/app-shell-sidebar.tsx";
const MAIN_NAV = "src/components/shell/main-nav.tsx";
const DOCK = "src/components/shell/quick-actions-dock.tsx";
const TOUR = "src/components/tours/owner-onboarding-tour.tsx";
const USE_MOBILE = "src/hooks/use-mobile.ts";
const SIDEBAR_STATE = "src/lib/sidebar-state.ts";
const OWNER_LAYOUT = "src/app/(owner)/owner-dashboard-layout.tsx";
const SHEET = "src/components/ui/sheet.tsx";
const PW_CONFIG = "tests/e2e/playwright.config.ts";

// globals.css declarations, grouped by rule kind.
const cssText = raw("src/app/globals.css");
const css = cssText ? postcss.parse(cssText) : postcss.root();
const rootDecls = [];
const darkDecls = [];
const themeInlineDecls = [];
const allDecls = [];
css.walkDecls((d) => {
	allDecls.push(d);
	const parent = d.parent;
	if (parent?.type === "rule") {
		const sel = parent.selector.replace(/\s+/g, " ").trim();
		if (sel === ":root") rootDecls.push(d);
		if (/\.dark\b/.test(sel)) darkDecls.push(d);
	}
	if (parent?.type === "atrule" && parent.name === "theme" && /\binline\b/.test(parent.params)) themeInlineDecls.push(d);
});

// S-TOKENS (D-37): the 8 T-2 brand aliases, no dark rule of their own, the color mappings.
const T2 = {
	"--sidebar": "var(--card)",
	"--sidebar-foreground": "var(--card-foreground)",
	"--sidebar-primary": "var(--primary)",
	"--sidebar-primary-foreground": "var(--primary-foreground)",
	"--sidebar-accent": "var(--muted)",
	"--sidebar-accent-foreground": "var(--foreground)",
	"--sidebar-border": "var(--border)",
	"--sidebar-ring": "var(--ring)",
};
const rootSidebarColors = rootDecls.filter((d) => d.prop.startsWith("--sidebar") && !d.prop.startsWith("--sidebar-width"));
const colorMapping = Object.keys(T2).map((name) => [`--color-${name.slice(2)}`, `var(${name})`]);
assert("S-TOKENS", [
	...Object.entries(T2).map(([prop, value]) => [`:root ${prop}: ${value}`, rootSidebarColors.filter((d) => d.prop === prop && d.value.trim() === value).length === 1]),
	[":root declares only the 8 color aliases", rootSidebarColors.length === 8],
	["no .dark --sidebar* declaration", darkDecls.every((d) => !d.prop.startsWith("--sidebar"))],
	["no --sidebar* oklch value", allDecls.every((d) => !d.prop.startsWith("--sidebar") || !/oklch\(/.test(d.value))],
	...colorMapping.map(([prop, value]) => [`@theme inline ${prop}: ${value}`, themeInlineDecls.some((d) => d.prop === prop && d.value.trim() === value)]),
	["app-shell-sidebar bg-sidebar-primary", /\bbg-sidebar-primary\b(?!-)/.test(code(APP_SHELL_SIDEBAR))],
	["app-shell-sidebar text-sidebar-primary-foreground", /\btext-sidebar-primary-foreground\b/.test(code(APP_SHELL_SIDEBAR))],
]);

// S-WIDTHS (D-37, D-51).
const declCount = (prop) => allDecls.filter((d) => d.prop === prop).length;
const declValue = (prop) => allDecls.find((d) => d.prop === prop)?.value.trim();
assert("S-WIDTHS", [
	["--sidebar-width: 14rem once", declCount("--sidebar-width") === 1 && declValue("--sidebar-width") === "14rem"],
	["--sidebar-width-mobile: 18rem once", declCount("--sidebar-width-mobile") === 1 && declValue("--sidebar-width-mobile") === "18rem"],
	["--sidebar-width-icon: 3rem once", declCount("--sidebar-width-icon") === 1 && declValue("--sidebar-width-icon") === "3rem"],
	["no --sidebar-transition", !/--sidebar-transition/.test(cssText)],
	["no --sidebar-width 16rem", allDecls.every((d) => d.prop !== "--sidebar-width" || d.value.trim() !== "16rem")],
]);

// S-VENDOR (D-32, D-45, D-04): header from the raw text, code from the stripped text.
const sidebarRaw = raw(SIDEBAR);
const sidebarHeader = /^[\s\S]*?\/\*\*[\s\S]*?\*\//.exec(sidebarRaw)?.[0] ?? "";
const sidebarCode = code(SIDEBAR);
assert("S-VENDOR", [
	["sidebar.tsx exists", exists(SIDEBAR)],
	["header names the new-york-v4 registry URL", sidebarHeader.includes("https://ui.shadcn.com/r/styles/new-york-v4/sidebar.json")],
	...Array.from({ length: 12 }, (_, k) => [`header names V${k + 1}`, new RegExp(`\\bV${k + 1}\\b`).test(sidebarHeader)]),
	["imports cn from #lib/utils", /import\s*\{[^}]*\bcn\b[^}]*\}\s*from\s*"#lib\/utils"/.test(sidebarCode)],
	["calls persistSidebarOpen(", sidebarCode.includes("persistSidebarOpen(")],
	["no 16rem", !sidebarCode.includes("16rem")],
	["no SIDEBAR_WIDTH", !sidebarCode.includes("SIDEBAR_WIDTH")],
	["no style= with sidebar-width", !/style=\{[^}]*sidebar-width/.test(sidebarCode)],
]);

// S-BREAKPOINT (D-33).
assert("S-BREAKPOINT", [
	["use-mobile (width < 64rem)", code(USE_MOBILE).includes("(width < 64rem)")],
	["sidebar.tsx has no md: class", exists(SIDEBAR) && !/\bmd:/.test(sidebarCode)],
]);

// S-COLLAPSE (D-34, D-52).
assert("S-COLLAPSE", [
	["inert", /\binert\b/.test(sidebarCode)],
	["shiftKey", sidebarCode.includes("shiftKey")],
	["altKey", sidebarCode.includes("altKey")],
	["repeat", /\.repeat\b/.test(sidebarCode)],
	["editable-target selector", sidebarCode.includes('input, textarea, select, [contenteditable]:not([contenteditable="false"])')],
]);

// S-SHELL (D-35, D-41).
const appShellCode = code(APP_SHELL);
const appShellSidebarCode = code(APP_SHELL_SIDEBAR);
const insetFiles = filesMatching(srcFiles, /SidebarInset/);
assert("S-SHELL", [
	[`no SidebarInset in src (${insetFiles.join(", ")})`, insetFiles.length === 0],
	["app-shell one <main", exists(APP_SHELL) && (appShellCode.match(/<main\b/g) ?? []).length === 1],
	['app-shell one id="main-content"', count(appShellCode, 'id="main-content"') === 1],
	["app-shell no lg:pl-56", exists(APP_SHELL) && !appShellCode.includes("lg:pl-56")],
	["Toggle navigation menu label in src/components/shell/", filesMatching(shellNonTest, /Toggle navigation menu/).length > 0],
	["app-shell-sidebar <Sidebar", /<Sidebar[\s>]/.test(appShellSidebarCode)],
	['app-shell-sidebar collapsible="offcanvas"', appShellSidebarCode.includes('collapsible="offcanvas"')],
	["app-shell-sidebar no <aside", exists(APP_SHELL_SIDEBAR) && !/<aside\b/.test(appShellSidebarCode)],
	["app-shell-sidebar no aria-modal", exists(APP_SHELL_SIDEBAR) && !appShellSidebarCode.includes("aria-modal")],
]);

// S-COOKIE (D-36, T-COOKIE).
const cookieLiteralFiles = filesMatching(srcNonTest, /"sidebar_state"/);
const stateCode = code(SIDEBAR_STATE);
const frozenCookieReaders = [...srcFiles.filter((f) => f === "src/proxy.ts" || f.startsWith("src/lib/supabase/"))].filter((f) => /sidebar_state|SIDEBAR_COOKIE/.test(raw(f)));
assert("S-COOKIE", [
	[`"sidebar_state" only in ${SIDEBAR_STATE} (found: ${cookieLiteralFiles.join(", ")})`, cookieLiteralFiles.length === 1 && cookieLiteralFiles[0] === SIDEBAR_STATE],
	["sidebar-state.ts is not a client module", exists(SIDEBAR_STATE) && !/^\s*["']use client["']/m.test(stateCode)],
	['sidebar-state.ts parses !== "false"', stateCode.includes('!== "false"')],
	["sidebar-state.ts writes through secureCookie", /secureCookie\.set\(/.test(stateCode) && !stateCode.includes("document.cookie")],
	["sidebar.tsx never writes document.cookie", exists(SIDEBAR) && !sidebarCode.includes("document.cookie")],
	["owner layout await cookies()", code(OWNER_LAYOUT).includes("await cookies()")],
	["owner layout imports #lib/sidebar-state", /from\s*"#lib\/sidebar-state"/.test(code(OWNER_LAYOUT))],
	[`proxy.ts and src/lib/supabase never read it (${frozenCookieReaders.join(", ")})`, frozenCookieReaders.length === 0],
]);

// S-NAV (D-38, D-40).
const mainNavCode = code(MAIN_NAV);
const footerList = /const footerItems[^=]*=\s*\[([\s\S]*?)\];/.exec(mainNavCode)?.[1] ?? "";
const footerBlock = /<SidebarFooter\b[\s\S]*?<\/SidebarFooter>/.exec(mainNavCode)?.[0] ?? "";
const shortcutFiles = walk("src/components/shell").filter((f) => raw(f).includes("Keyboard Shortcuts"));
assert("S-NAV", [
	['footer list links /settings', footerList.includes('href: "/settings"')],
	['footer list links /help', footerList.includes('href: "/help"')],
	["SidebarFooter renders the footer list", footerBlock.includes("footerItems")],
	[`no Keyboard Shortcuts in src/components/shell/ (${shortcutFiles.join(", ")})`, shortcutFiles.length === 0],
]);

// S-DOCK (D-39, D-51).
const dockCode = code(DOCK);
assert("S-DOCK", [
	["dock var(--sidebar-width)", dockCode.includes("var(--sidebar-width)")],
	["dock no 7rem", exists(DOCK) && !dockCode.includes("7rem")],
	["tour imports sidebar-tour-target", /from\s*"[^"]*sidebar-tour-target"/.test(code(TOUR))],
]);

// S-SHEET (D-46, D-48).
const paletteGuardFiles = shellNonTest.filter((f) => code(f).includes('[role="dialog"][data-state="open"]') && code(f).includes('[data-slot="sidebar"]'));
assert("S-SHEET", [
	["sidebar.tsx [&>button]:hidden exactly once", count(sidebarCode, "[&>button]:hidden") === 1],
	['app-shell-sidebar aria-label="Close navigation menu"', appShellSidebarCode.includes('aria-label="Close navigation menu"')],
	["app-shell-sidebar setOpenMobile(false)", appShellSidebarCode.includes("setOpenMobile(false)")],
	['sheet.tsx keeps aria-label="Close"', code(SHEET).includes('aria-label="Close"')],
	['Cmd+K guard excludes [data-slot="sidebar"]', paletteGuardFiles.length > 0],
]);

// S-NEUTRALIZE (D-49).
assert("S-NEUTRALIZE", [
	["no-underline", /\bno-underline\b/.test(sidebarCode)],
	["[&>li]:mb-0", sidebarCode.includes("[&>li]:mb-0")],
]);

// S-REMNANTS (D-31).
const REMNANTS = ["src/components/ui/sidebar/context.tsx", "src/components/ui/server-sidebar-provider.tsx", "src/components/ui/mobile-nav.tsx", "src/components/ui/toast.tsx", "src/app/(owner)/dashboard.css"];
const remnantRefs = filesMatching(srcFiles, /server-sidebar-provider|ui\/sidebar\/context/);
assert("S-REMNANTS", [
	...REMNANTS.map((f) => [`${f} absent`, !exists(f)]),
	[`no server-sidebar-provider or ui/sidebar/context reference (${remnantRefs.join(", ")})`, remnantRefs.length === 0],
]);

// S-E2E (D-44): the sidebar spec runs in owner-axe and nowhere else that signs in.
const pwCode = code(PW_CONFIG);
const projectBlock = (name) => {
	const start = pwCode.indexOf(`name: "${name}"`);
	if (start < 0) return "";
	const next = pwCode.indexOf('name: "', start + 7);
	return pwCode.slice(start, next < 0 ? pwCode.length : next);
};
const arrayAfter = (block, key) => {
	const i = block.indexOf(`${key}:`);
	if (i < 0) return "";
	const open = block.indexOf("[", i);
	const close = block.indexOf("]", open);
	return open < 0 || close < 0 ? "" : block.slice(open, close + 1);
};
const SPEC = "app-shell-sidebar.spec.ts";
assert("S-E2E", [
	["owner-axe testMatch names the sidebar spec", arrayAfter(projectBlock("owner-axe"), "testMatch").includes(SPEC)],
	...["owner", "firefox", "mobile-chrome"].map((p) => [`${p} testIgnore names the sidebar spec`, arrayAfter(projectBlock(p), "testIgnore").includes(SPEC)]),
]);

console.log(`w6-assertions: ${failed === 0 ? "all passed" : `${failed} failed`} (root ${ROOT})`);
process.exit(failed === 0 ? 0 : 1);
