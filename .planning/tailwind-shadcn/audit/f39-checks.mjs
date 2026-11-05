// CP outcome checker for the 66.2 final plan (66.2-39). Read-only: it reads the f39 CP decision map
// (derived by jq from 66.2-38-CP-DECISIONS.json), component-probe and render-check JSON, files at
// HEAD (from disk) and at a recorded revision (`git show <sha>:<path>`), and writes only --out.
//
// Usage (from the repo root):
//   node .planning/tailwind-shadcn/audit/f39-checks.mjs --decisions <json> [--probes <json>]
//     [--tokens <json>] --out <file> [--probe-only] [--expect-fail <CP-n,...>]
//   node .planning/tailwind-shadcn/audit/f39-checks.mjs --self-test
//   node .planning/tailwind-shadcn/audit/f39-checks.mjs --lint-body <md> --decisions <json>
//   node .planning/tailwind-shadcn/audit/f39-checks.mjs --fix-round-1 <f39-dir> --out <file>
//   node .planning/tailwind-shadcn/audit/f39-checks.mjs --fix-round-2 <f39-dir> --out <file>
//
// Output: { mode, checks: [{ cp, choice, name, pass, expected, measured }], failedCps, failed }.
// Exit 1 when failed > 0; under --expect-fail, exit 0 only when exactly the listed CPs fail.
//
// --fix-round-1 (the re-freeze after perfect-PR cycle 1) checks what fix round 1 must keep, so a
// regression of any of it fails this checker: the four T-1 contract tokens that are allowed to be
// dead and nothing else (M8), the light-only tokens in use (M6), the two light token deltas, the
// two changed utilities, every guard test the fix round added (present and passing in the f39 unit
// summary), every UI-SPEC VD row VD-01..VD-129 and VD-19b mapped to passing evidence, the
// migration replay (357 files, every gate exit 0), the mutation sweep (179 rows, 0 vacuous, 0 not
// applied), the Edge deploy list (exactly the functions whose bundle differs), the screenshot
// classification and the component-probe differences against the 4476e6450 same-session run. Inputs: the f39 JSON files named in readFixRoundContext, the UI-SPEC, git ls-files.
//
// --fix-round-2 (the re-freeze after CI failed on bc54b045a and f8de0175e) checks what fix round 2
// must keep: the regexp-source helper's test, every module that imports the helper (the set must
// equal the recorded list) and the guards' new linear-time and literal-name tests, the sweep's
// partition proof (scripts/mutation-sweep.test.ts) and the workflow-contract test, the sharded
// workflow (8 shards, fail-fast false, the shard and matrix size handed to each job), the sweep
// result unsharded and per shard (rows summing to every row, the listing a disjoint cover), the
// CodeQL-clean state as far as a local scan can decide it (every escape-style `.replace` in a
// tracked JS/TS file escapes every regex metacharacter, no single-metacharacter escape, escape
// helpers under the test roots live only in the shared helper and main's reclaim-finalize.ts, and
// neither old ReDoS form is back), the scope of the code diff since b628eb9f1 (no application
// path) and the build identity that carries the screenshot, probe and CSP evidence forward.
// Inputs: the f39 JSON files named in readFixRound2Context, the sweep workflow, git ls-files and
// every tracked JS/TS file on disk.
//
// Each CP is checked for its recorded decision (`choice` default or fallback; `options` holds the
// owner's option ids). Source checks read files at HEAD; the CP-3 fallback also compares the
// vendored sidebar with PRE_39 (f39/pre39.txt), and the CP-2 dark fallbacks resolve the
// variant's classes at PRE_22 (the parent of the oldest commit whose subject contains
// `(66.2-22)`). Probe checks run only when --probes is given; without it the run is source-only,
// and --probe-only skips the source checks.
//
// Tolerances are the w5-claims ones: alpha within 0.02; RGB per channel within
// tolRgb(a) = max(3, ceil(0.5 / a) + 1), a = the measured alpha (canvas read-back rounding).
//
// Source checks that look for a forbidden token read non-comment lines only (lines whose trimmed
// text does not start with //, /* or *), because header comments name what a change removed.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const ROOT = process.cwd();
const THEMES = ["light", "dark"];
const CPS = ["CP-1", "CP-2", "CP-3", "CP-4", "CP-5"];
const ALPHA_TOL = 0.02;
const MISSING = "missing";

const PROBE_IDS = {
	button: "button",
	blurNoJs: "blur-fade-no-js",
	blurReducedMotion: "blur-fade-reduced-motion",
	blurIoStub: "blur-fade-io-stub",
};

const BUTTON_VARIANTS = ["default", "destructive", "outline", "secondary", "ghost", "link"];

const CP3_TOKENS = [
	"focus-visible:outline-solid",
	"focus-visible:outline-2",
	"focus-visible:outline-offset-2",
	"focus-visible:outline-ring",
	"focus-visible:ring-4",
	"focus-visible:ring-ring/20",
];

const FILES = {
	pageLayout: "src/components/layout/page-layout.tsx",
	marketingHome: "src/app/marketing-home.tsx",
	authUpdatePassword: "src/app/auth/update-password/page.tsx",
	authConfirmEmail: "src/app/auth/confirm-email/page.tsx",
	button: "src/components/ui/button.tsx",
	sidebar: "src/components/ui/sidebar.tsx",
	mainNav: "src/components/shell/main-nav.tsx",
	header: "src/components/shell/app-shell-header.tsx",
	shellSidebar: "src/components/shell/app-shell-sidebar.tsx",
	appShell: "src/components/shell/app-shell.tsx",
	ownerLayout: "src/app/(owner)/owner-dashboard-layout.tsx",
	blurFade: "src/components/ui/blur-fade.tsx",
};

// ---------- helpers ----------

function tolRgb(a) {
	return Math.max(3, Math.ceil(0.5 / a) + 1);
}

function isColor(v) {
	return Array.isArray(v) && v.length === 4 && v.every((x) => typeof x === "number");
}

function colorWithin(m, r) {
	if (!isColor(m) || !isColor(r)) return false;
	const tol = tolRgb(m[3] > 0 ? m[3] : 1);
	return [0, 1, 2].every((i) => Math.abs(m[i] - r[i]) <= tol) && Math.abs(m[3] - r[3]) <= ALPHA_TOL;
}

// A transparent expectation (alpha 0) matches any measured color whose alpha is 0.
function colorMatches(m, r) {
	if (isColor(r) && r[3] === 0) return isColor(m) && Math.abs(m[3]) <= ALPHA_TOL;
	return colorWithin(m, r);
}

function pathGet(obj, path) {
	let cur = obj;
	for (const k of path.split(".")) {
		if (cur === null || cur === undefined || typeof cur !== "object" || !(k in cur)) return MISSING;
		cur = cur[k];
	}
	return cur;
}

// `s` as regex source that matches exactly `s`: every metacharacter gains a backslash (a partial
// escape breaks on the first input holding a character it skips; fix round 2).
function escapeRe(s) {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function shadowHas(s, px) {
	return typeof s === "string" && new RegExp(`(^|[^\\d.])0px 0px 0px ${px}px(?![\\d.])`).test(s);
}

function isCommentLine(line) {
	const t = line.trim();
	return t.startsWith("//") || t.startsWith("/*") || t.startsWith("*") || t.startsWith("{/*");
}

function codeLines(text) {
	if (text === null) return "";
	return text
		.split("\n")
		.filter((l) => !isCommentLine(l))
		.join("\n");
}

function countRe(text, re) {
	if (text === null) return 0;
	return (text.match(new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`)) ?? []).length;
}

function gitShow(sha, rel) {
	if (!sha) return null;
	try {
		return execFileSync("git", ["show", `${sha}:${rel}`], {
			cwd: ROOT,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
		});
	} catch {
		return null;
	}
}

function pre22Sha() {
	try {
		const out = execFileSync("git", ["log", "--reverse", "--format=%H%x09%s"], {
			cwd: ROOT,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
			maxBuffer: 64 * 1024 * 1024,
		});
		for (const line of out.split("\n")) {
			const [sha, subject] = line.split("\t");
			if (subject?.includes("(66.2-22)")) return `${sha}^`;
		}
	} catch {
		return null;
	}
	return null;
}

function diskSource() {
	const pre39Path = join(ROOT, ".planning/tailwind-shadcn/audit/f39/pre39.txt");
	const pre39 = existsSync(pre39Path) ? readFileSync(pre39Path, "utf8").trim() : null;
	let pre22;
	return {
		head(rel) {
			const p = join(ROOT, rel);
			return existsSync(p) ? readFileSync(p, "utf8") : null;
		},
		pre39(rel) {
			return gitShow(pre39, rel);
		},
		pre22(rel) {
			if (pre22 === undefined) pre22 = pre22Sha();
			return gitShow(pre22, rel);
		},
	};
}

// The opening JSX tag of every `<Name` element (up to its first unquoted, unbraced `>`).
function jsxTags(text, name) {
	const tags = [];
	if (text === null) return tags;
	const re = new RegExp(`<${name}(?![\\w.])`, "g");
	let m = re.exec(text);
	while (m !== null) {
		let depth = 0;
		let quote = null;
		let end = -1;
		for (let i = m.index + m[0].length; i < text.length; i++) {
			const ch = text[i];
			if (quote) {
				if (ch === quote) quote = null;
				continue;
			}
			if (ch === '"' || ch === "'" || ch === "`") quote = ch;
			else if (ch === "{") depth++;
			else if (ch === "}") depth--;
			else if (ch === ">" && depth === 0) {
				end = i;
				break;
			}
		}
		tags.push(end === -1 ? text.slice(m.index) : text.slice(m.index, end + 1));
		m = re.exec(text);
	}
	return tags;
}

// The class string of one cva variant (the first `<variant>:` key followed by a string).
function variantClasses(text, variant) {
	if (text === null) return null;
	const m = new RegExp(`\\b${variant}:\\s*"([^"]*)"`).exec(text);
	return m ? m[1] : null;
}

// The color a variant's background class resolves to in the dark theme. `prefix` is "" for the
// resting background and "hover:" for the hover background. A `dark:` class wins over the base
// class; no class at all resolves to transparent (alpha 0).
function resolveBg(classes, prefix, darkTokens) {
	if (classes === null) return MISSING;
	const list = classes.split(/\s+/).filter(Boolean);
	const pick = (p) => {
		for (const c of list) {
			if (!c.startsWith(`${p}bg-`)) continue;
			const rest = c.slice(p.length + 3);
			const [name, pct] = rest.split("/");
			const tok = darkTokens?.[name];
			if (!isColor(tok)) return MISSING;
			const a = pct === undefined ? tok[3] : (tok[3] * Number(pct)) / 100;
			return [tok[0], tok[1], tok[2], a];
		}
		return null;
	};
	return pick(`dark:${prefix}`) ?? pick(prefix) ?? [0, 0, 0, 0];
}

function createCollector(cp, choice) {
	const checks = [];
	return {
		checks,
		add(name, pass, expected, measured) {
			checks.push({ cp, choice, name, pass: Boolean(pass), expected, measured });
		},
	};
}

function probeCheck(c, probes, id, theme, name, fields, predicate, expected) {
	const result = probes?.results?.[id]?.[theme];
	if (result === undefined || result === null) {
		c.add(`${theme} ${id}: ${name}`, false, expected, MISSING);
		return;
	}
	const values = fields.map((f) => pathGet(result, f));
	if (values.some((v) => v === MISSING)) {
		c.add(`${theme} ${id}: ${name}`, false, expected, MISSING);
		return;
	}
	let pass = false;
	try {
		pass = predicate(...values);
	} catch {
		pass = false;
	}
	c.add(`${theme} ${id}: ${name}`, pass, expected, values.length === 1 ? values[0] : values);
}

// ---------- source checks per CP ----------

const SOURCE_CHECKS = {
	"CP-1"(c, src, d) {
		const pl = src.head(FILES.pageLayout);
		const mh = src.head(FILES.marketingHome);
		const auth = [FILES.authUpdatePassword, FILES.authConfirmEmail];
		if (d.choice === "default") {
			c.add("page-layout has showGridPattern = true", pl?.includes("showGridPattern = true"), true, pl === null ? MISSING : pl.includes("showGridPattern = true"));
			c.add("marketing-home passes showGridPattern={true}", mh?.includes("showGridPattern={true}"), true, mh === null ? MISSING : mh.includes("showGridPattern={true}"));
			for (const rel of auth) {
				const t = src.head(rel);
				const has = t !== null && /import\s*\{[^}]*\bGridPattern\b[^}]*\}\s*from\s*"#components\/ui\/grid-pattern"/.test(t);
				c.add(`${rel} imports GridPattern`, has, true, t === null ? MISSING : has);
			}
		} else {
			c.add("page-layout has showGridPattern = false", pl?.includes("showGridPattern = false"), true, pl === null ? MISSING : pl.includes("showGridPattern = false"));
			c.add("marketing-home has no showGridPattern={true}", mh !== null && !mh.includes("showGridPattern={true}"), false, mh === null ? MISSING : mh.includes("showGridPattern={true}"));
			for (const rel of auth) {
				const t = src.head(rel);
				c.add(`${rel} contains no GridPattern`, t !== null && !t.includes("GridPattern"), 0, t === null ? MISSING : countRe(t, /GridPattern/));
			}
		}
	},
	"CP-2"() {},
	"CP-3"(c, src, d) {
		const sb = src.head(FILES.sidebar);
		const nav = src.head(FILES.mainNav);
		if (d.choice === "default") {
			c.add("sidebar.tsx contains focus-visible:ring-2", sb?.includes("focus-visible:ring-2"), true, sb === null ? MISSING : sb.includes("focus-visible:ring-2"));
			const n = countRe(codeLines(nav), /focus-visible:ring-4\b/);
			c.add("main-nav.tsx has no focus-visible:ring-4", nav !== null && n === 0, 0, nav === null ? MISSING : n);
		} else {
			const tags = [...jsxTags(nav, "SidebarMenuButton"), ...jsxTags(nav, "SidebarMenuSubButton")];
			const lacking = tags.filter((t) => !CP3_TOKENS.every((tok) => new RegExp(`(^|[\\s"'\`{])${escapeRe(tok)}(?![\\w/-])`).test(t)));
			c.add("every SidebarMenuButton/SidebarMenuSubButton className has the six CP-3 tokens", tags.length > 0 && lacking.length === 0, `${tags.length} of ${tags.length}`, `${tags.length - lacking.length} of ${tags.length}`);
			const pre = src.pre39(FILES.sidebar);
			c.add("sidebar.tsx unchanged since PRE_39", sb !== null && pre !== null && sb === pre, "identical", sb === null || pre === null ? MISSING : sb === pre ? "identical" : "differs");
		}
	},
	"CP-4"(c, src, d) {
		const trig = jsxTags(src.head(FILES.header), "SidebarTrigger");
		const rails = countRe(codeLines(src.head(FILES.shellSidebar)), /<SidebarRail(?![\w.])/);
		const shell = src.head(FILES.appShell);
		const layout = src.head(FILES.ownerLayout);
		const lgHidden = trig.length === 1 && /(^|[\s"'`{])lg:hidden(?![\w-])/.test(trig[0]);
		const readsCookies = /\bcookies\(\)/.test(codeLines(layout));
		const importsState = /from\s*"#lib\/sidebar-state"/.test(codeLines(layout));
		if (d.choice === "default") {
			c.add("header SidebarTrigger has no lg:hidden", trig.length === 1 && !lgHidden, "1 trigger, no lg:hidden", `${trig.length} trigger(s), lg:hidden ${lgHidden}`);
			c.add("<SidebarRail appears once in app-shell-sidebar.tsx", rails === 1, 1, rails);
			c.add(
				"owner-dashboard-layout reads sidebar_state through #lib/sidebar-state",
				layout !== null && readsCookies && importsState && /SIDEBAR_COOKIE_NAME|sidebar_state/.test(codeLines(layout)),
				true,
				layout === null ? MISSING : { readsCookies, importsState },
			);
		} else {
			c.add("header SidebarTrigger has lg:hidden", lgHidden, true, `${trig.length} trigger(s), lg:hidden ${lgHidden}`);
			c.add("app-shell-sidebar.tsx has 0 <SidebarRail", rails === 0, 0, rails);
			const code = codeLines(shell);
			const listener = /document\.addEventListener\(\s*"keydown"/.test(code) && /\.stopPropagation\(\)/.test(code) && /document\.removeEventListener\(\s*"keydown"/.test(code);
			c.add("app-shell.tsx has the document keydown stopPropagation listener", shell !== null && listener, true, shell === null ? MISSING : listener);
			c.add("owner-dashboard-layout calls no cookies() and imports no #lib/sidebar-state", layout !== null && !readsCookies && !importsState, false, layout === null ? MISSING : { readsCookies, importsState });
		}
	},
	"CP-5"(c, src, d) {
		const bf = src.head(FILES.blurFade);
		const code = codeLines(bf);
		const animateIn = countRe(code, /(?<![\w-])animate-in(?![\w-])/);
		if (d.choice === "default") {
			c.add("blur-fade.tsx keeps the animate-in entrance", bf !== null && animateIn > 0, ">0", bf === null ? MISSING : animateIn);
		} else {
			const bare = countRe(code, /(?<![\w:-])animate-none(?![\w-])/);
			const styles = countRe(code, /\bstyle=/);
			c.add("blur-fade.tsx has 0 animate-in", bf !== null && animateIn === 0, 0, bf === null ? MISSING : animateIn);
			c.add("blur-fade.tsx has 1 animate-none", bf !== null && bare === 1, 1, bf === null ? MISSING : bare);
			c.add("blur-fade.tsx has no style=", bf !== null && styles === 0, 0, bf === null ? MISSING : styles);
		}
	},
};

// ---------- probe checks per CP ----------

const PROBE_CHECKS = {
	"CP-1"() {},
	"CP-2"(c, p, T, d, src) {
		const id = PROBE_IDS.button;
		for (const theme of THEMES) {
			for (const v of BUTTON_VARIANTS) {
				probeCheck(c, p, id, theme, `${v} focus.boxShadow has the 0px 0px 0px 3px ring (D-29)`, [`variants.${v}.focus.boxShadow`], (s) => shadowHas(s, 3), "0px 0px 0px 3px");
			}
		}
		const opts = d.options ?? [];
		if (d.choice === "default") {
			probeCheck(c, p, id, "light", "outline borderColor within tolerance of refs.border", ["variants.outline.borderColor", "refs.border"], colorWithin, "refs.border");
			return;
		}
		if (opts.includes("cp2-fallback-border-input")) {
			probeCheck(c, p, id, "light", "outline borderColor within tolerance of refs.input", ["variants.outline.borderColor", "refs.input"], colorWithin, "refs.input");
		}
		const pre = src.pre22(FILES.button);
		for (const v of ["outline", "ghost", "destructive"]) {
			if (!opts.includes(`cp2-fallback-dark-${v}`)) continue;
			const classes = variantClasses(pre, v);
			const fields = v === "ghost" ? [["bg", ""], ["hoverBg", "hover:"]] : [["bg", ""]];
			for (const [field, prefix] of fields) {
				const want = resolveBg(classes, prefix, T?.dark);
				probeCheck(c, p, id, "dark", `${v} ${field} matches its PRE_22 class`, [`variants.${v}.${field}`], (x) => want !== MISSING && colorMatches(x, want), want);
			}
		}
	},
	"CP-3"() {},
	"CP-4"() {},
	"CP-5"(c, p, _T, d) {
		const all = [PROBE_IDS.blurNoJs, PROBE_IDS.blurReducedMotion, PROBE_IDS.blurIoStub];
		for (const theme of THEMES) {
			for (const id of all) {
				probeCheck(c, p, id, theme, "opacityAtEnd 1", ["opacityAtEnd"], (v) => v === 1, 1);
				probeCheck(c, p, id, theme, "ssrAriaHidden null", ["ssrAriaHidden"], (v) => v === null, null);
				probeCheck(c, p, id, theme, "ariaHiddenAtEnd null", ["ariaHiddenAtEnd"], (v) => v === null, null);
			}
			if (d.choice === "default") {
				probeCheck(c, p, PROBE_IDS.blurNoJs, theme, "opacityAtStart < 1", ["opacityAtStart"], (v) => typeof v === "number" && v < 1, "< 1");
				probeCheck(c, p, PROBE_IDS.blurNoJs, theme, "animationNameAtStart enter", ["animationNameAtStart"], (v) => v === "enter", "enter");
			} else {
				for (const id of all) {
					probeCheck(c, p, id, theme, "opacityAtStart 1", ["opacityAtStart"], (v) => v === 1, 1);
					probeCheck(c, p, id, theme, "animationNameAtStart none", ["animationNameAtStart"], (v) => v === "none", "none");
				}
			}
		}
	},
};

// ---------- runner ----------

function validDecision(d) {
	return d && (d.choice === "default" || d.choice === "fallback") && Array.isArray(d.options);
}

function run({ decisions, probes, tokens, src, probeOnly, withProbes }) {
	const checks = [];
	for (const cp of CPS) {
		const d = decisions?.[cp];
		const c = createCollector(cp, d?.choice ?? MISSING);
		if (!validDecision(d)) {
			c.add("decision present and valid", false, "default|fallback", d === undefined ? MISSING : d);
		} else {
			if (!probeOnly) SOURCE_CHECKS[cp](c, src, d);
			if (withProbes) PROBE_CHECKS[cp](c, probes, tokens, d, src);
		}
		checks.push(...c.checks);
	}
	const failedCps = CPS.filter((cp) => checks.some((k) => k.cp === cp && !k.pass));
	return { mode: probeOnly ? "probe-only" : withProbes ? "full" : "source-only", checks, failedCps, failed: checks.filter((k) => !k.pass).length };
}

// ---------- self-test ----------

function fixtureTokens() {
	return {
		light: { border: [210, 216, 222, 1], input: [182, 191, 199, 1] },
		dark: { background: [4, 10, 17, 1], accent: [0, 189, 121, 1], destructive: [201, 0, 0, 1], input: [42, 46, 51, 1] },
	};
}

const PRE22_BUTTON = [
	"variants: {",
	"\tvariant: {",
	'\t\tdestructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",',
	'\t\toutline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",',
	'\t\tghost: "hover:bg-accent hover:text-accent-foreground",',
	"\t},",
	"},",
].join("\n");

const SIDEBAR_FIXTURE = 'const b = "focus-visible:ring-2 focus-visible:ring-sidebar-ring";\n';

function fixtureFiles(choice) {
	const fb = choice === "fallback";
	const tok = CP3_TOKENS.join(" ");
	return {
		[FILES.pageLayout]: `export function PageLayout({ showGridPattern = ${fb ? "false" : "true"} }) {}\n`,
		[FILES.marketingHome]: fb ? "<PageLayout containerClass=\"flex\">\n" : "<PageLayout showGridPattern={true} containerClass=\"flex\">\n",
		[FILES.authUpdatePassword]: fb ? "export default function P() {}\n" : 'import { GridPattern } from "#components/ui/grid-pattern";\n<GridPattern />\n',
		[FILES.authConfirmEmail]: fb ? "export default function P() {}\n" : 'import { GridPattern } from "#components/ui/grid-pattern";\n<GridPattern />\n',
		[FILES.sidebar]: SIDEBAR_FIXTURE,
		[FILES.mainNav]: fb
			? `<SidebarMenuButton asChild className="${tok}">\n<SidebarMenuSubButton className={cn("x", "${tok}")}>\n`
			: '<SidebarMenuButton asChild className="h-11">\n<SidebarMenuSubButton className="h-11">\n',
		[FILES.header]: `<SidebarTrigger ref={r} aria-label="Toggle navigation menu" className="text-muted-foreground${fb ? " lg:hidden" : ""}" />\n`,
		[FILES.shellSidebar]: fb ? "<Sidebar collapsible=\"offcanvas\">\n</Sidebar>\n" : "<Sidebar collapsible=\"offcanvas\">\n<SidebarRail />\n</Sidebar>\n",
		[FILES.appShell]: fb
			? 'useEffect(() => {\n\tconst onKey = (event) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") event.stopPropagation(); };\n\tdocument.addEventListener("keydown", onKey);\n\treturn () => document.removeEventListener("keydown", onKey);\n}, []);\n'
			: "export function AppShellFrame() {}\n",
		[FILES.ownerLayout]: fb
			? "export default function L({ children }) { return <AppShell>{children}</AppShell>; }\n"
			: 'import { cookies } from "next/headers";\nimport { parseSidebarOpen, SIDEBAR_COOKIE_NAME } from "#lib/sidebar-state";\nconst s = await cookies();\nparseSidebarOpen(s.get(SIDEBAR_COOKIE_NAME)?.value);\n',
		[FILES.blurFade]: fb
			? '<div data-slot="blur-fade" className={cn("animate-none", className)} />\n'
			: 'const P = "animate-in fade-in motion-reduce:animate-none";\n<div data-slot="blur-fade" className={cn(P, className)} style={style} />\n',
	};
}

function fixtureProbes(choice) {
	const fb = choice === "fallback";
	const T = fixtureTokens();
	const button = {};
	for (const theme of THEMES) {
		const variants = {};
		for (const v of BUTTON_VARIANTS) {
			variants[v] = {
				borderColor: [0, 0, 0, 0],
				bg: [0, 0, 0, 0],
				hoverBg: [0, 0, 0, 0],
				focus: { boxShadow: "x 0px 0px 0px 3px, x 0px 1px 2px 0px" },
			};
		}
		variants.outline.borderColor = theme === "light" ? (fb ? T.light.input : T.light.border) : T.dark.input;
		if (theme === "dark" && fb) {
			variants.outline.bg = T.dark.background;
			variants.ghost.hoverBg = T.dark.accent;
			variants.destructive.bg = T.dark.destructive;
		}
		button[theme] = { variants, refs: { border: T.light.border, input: T.light.input } };
	}
	const blur = (start) => ({
		ssrHtmlHasOpacity0: false,
		ssrAriaHidden: null,
		opacityAtStart: start,
		opacityAtEnd: 1,
		ariaHiddenAtEnd: null,
		animationNameAtStart: start === 1 ? "none" : "enter",
	});
	const mk = (start) => ({ light: blur(start), dark: blur(start) });
	return {
		results: {
			[PROBE_IDS.button]: button,
			[PROBE_IDS.blurNoJs]: mk(fb ? 1 : 0),
			[PROBE_IDS.blurReducedMotion]: mk(1),
			[PROBE_IDS.blurIoStub]: mk(fb ? 1 : 0),
		},
	};
}

function fixtureDecisions(choice) {
	const fb = choice === "fallback";
	const opts = {
		"CP-1": fb ? ["cp1-fallback"] : ["cp1-default"],
		"CP-2": fb ? ["cp2-fallback-border-input", "cp2-fallback-dark-outline", "cp2-fallback-dark-ghost", "cp2-fallback-dark-destructive"] : ["cp2-default"],
		"CP-3": fb ? ["cp3-fallback"] : ["cp3-default"],
		"CP-4": fb ? ["cp4-fallback"] : ["cp4-default"],
		"CP-5": fb ? ["cp5-fallback"] : ["cp5-default"],
	};
	return Object.fromEntries(CPS.map((cp) => [cp, { choice, options: opts[cp], ownerReview: "closed" }]));
}

function fixtureSource(files) {
	return {
		head: (rel) => (rel in files ? files[rel] : null),
		pre39: (rel) => (rel === FILES.sidebar ? SIDEBAR_FIXTURE : null),
		pre22: (rel) => (rel === FILES.button ? PRE22_BUTTON : null),
	};
}

// One mutation per CP and choice; each must flip exactly that CP.
const MUTATIONS = {
	default: {
		"CP-1": (f) => {
			f.files[FILES.marketingHome] = '<PageLayout containerClass="flex">\n';
		},
		"CP-2": (f) => {
			f.probes.results.button.light.variants.outline.borderColor = [182, 191, 199, 1];
		},
		"CP-3": (f) => {
			f.files[FILES.mainNav] = '<SidebarMenuButton className="focus-visible:ring-4">\n';
		},
		"CP-4": (f) => {
			f.files[FILES.shellSidebar] = "<Sidebar>\n</Sidebar>\n";
		},
		"CP-5": (f) => {
			f.probes.results["blur-fade-no-js"].dark.animationNameAtStart = "none";
		},
	},
	fallback: {
		"CP-1": (f) => {
			f.files[FILES.authConfirmEmail] = '<GridPattern className="fixed" />\n';
		},
		"CP-2": (f) => {
			f.probes.results.button.dark.variants.ghost.hoverBg = [0, 189, 121, 0.5];
		},
		"CP-3": (f) => {
			f.files[FILES.sidebar] = 'const b = "focus-visible:ring-4";\n';
		},
		"CP-4": (f) => {
			f.files[FILES.ownerLayout] = 'import { cookies } from "next/headers";\nconst s = await cookies();\n';
		},
		"CP-5": (f) => {
			f.files[FILES.blurFade] = '<div data-slot="blur-fade" className={cn("animate-in animate-none", className)} />\n';
		},
	},
};

function selfTest() {
	let passed = 0;
	const failures = [];
	for (const choice of ["default", "fallback"]) {
		const base = () => ({ files: fixtureFiles(choice), probes: fixtureProbes(choice), tokens: fixtureTokens(), decisions: fixtureDecisions(choice) });
		const exec = (f, probeOnly = false) => run({ decisions: f.decisions, probes: f.probes, tokens: f.tokens, src: fixtureSource(f.files), probeOnly, withProbes: true });
		const clean = exec(base());
		if (clean.failed === 0) passed++;
		else failures.push(`${choice}: clean input failed ${JSON.stringify(clean.checks.filter((k) => !k.pass))}`);
		for (const cp of CPS) {
			const f = base();
			MUTATIONS[choice][cp](f);
			const r = exec(f);
			if (r.failedCps.length === 1 && r.failedCps[0] === cp) passed++;
			else failures.push(`${choice} ${cp}: mutation flipped ${JSON.stringify(r.failedCps)}`);
		}
		// --probe-only ignores source mutations and still sees probe mutations.
		const srcOnly = base();
		MUTATIONS[choice]["CP-4"](srcOnly);
		const po = exec(srcOnly, true);
		if (po.failed === 0 && po.mode === "probe-only") passed++;
		else failures.push(`${choice}: --probe-only saw a source mutation`);
	}
	// A missing decision fails that CP.
	const f = { files: fixtureFiles("default"), probes: fixtureProbes("default"), tokens: fixtureTokens(), decisions: fixtureDecisions("default") };
	delete f.decisions["CP-3"];
	const r = run({ decisions: f.decisions, probes: f.probes, tokens: f.tokens, src: fixtureSource(f.files), probeOnly: false, withProbes: true });
	if (r.failedCps.length === 1 && r.failedCps[0] === "CP-3") passed++;
	else failures.push(`missing decision flipped ${JSON.stringify(r.failedCps)}`);
	passed += lintSelfTest(failures);
	passed += fixRoundSelfTest(failures);
	passed += fixRound2SelfTest(failures);
	if (failures.length > 0) {
		for (const x of failures) console.error(`self-test FAIL: ${x}`);
		process.exit(1);
	}
	console.log(`f39-checks self-test: ${passed} passed`);
}

// ---------- --lint-body ----------

const REQUIRED_TOKENS = [
	...Array.from({ length: 37 }, (_, i) => `VD-${String(i + 1).padStart(2, "0")}`),
	...CPS,
	"D-A",
	"D-B",
	"D-C",
	"N21",
	"rgb(255, 0, 255)",
	"32×18.4",
	"Roboto",
	"1.01:1",
	"## Owner checkpoints",
	"## Readiness checklist",
];

function stripCode(md) {
	const out = [];
	let fenced = false;
	for (const line of md.split("\n")) {
		if (/^\s*(```|~~~)/.test(line)) {
			fenced = !fenced;
			out.push("");
			continue;
		}
		out.push(fenced ? "" : line.replace(/`+[^`]*`+/g, ""));
	}
	return out.join("\n");
}

function sectionLines(md, heading) {
	const lines = md.split("\n");
	const start = lines.findIndex((l) => l.trim() === heading);
	if (start === -1) return [];
	const rest = lines.slice(start + 1);
	const end = rest.findIndex((l) => /^##\s/.test(l));
	return end === -1 ? rest : rest.slice(0, end);
}

function lintBody(md, decisions) {
	const problems = [];
	const prose = stripCode(md);
	const mentions = prose.match(/(?<![\w@])@[A-Za-z0-9][\w-]*/g) ?? [];
	for (const m of mentions) problems.push(`bare mention ${m}`);
	const hex = md.match(/#(?![0-9]+\b)[0-9a-fA-F]{3,8}\b/g) ?? [];
	for (const h of hex) problems.push(`hex literal ${h}`);
	if (/Claude-Session|claude\.ai\/code\/session/.test(md)) problems.push("Claude session line or URL");
	for (const t of REQUIRED_TOKENS) {
		const present = /^[A-Z]+-[0-9A-C]+$/.test(t) ? new RegExp(`(^|[^\\w-])${t}(?![\\w])`).test(md) : md.includes(t);
		if (!present) problems.push(`missing required token ${t}`);
	}
	const owner = sectionLines(md, "## Owner checkpoints").map((l) => l.trim());
	for (const cp of CPS) {
		const d = decisions?.[cp];
		if (!d) {
			problems.push(`decisions has no ${cp}`);
			continue;
		}
		const openLine = owner.some((l) => l.startsWith(`${cp}: open for owner screenshot review`));
		if (d.ownerReview === "open" && !openLine) problems.push(`${cp} is open but has no open-review line`);
		if (d.ownerReview === "closed" && openLine) problems.push(`${cp} is owner-closed but listed as open`);
		const waiver = owner.some((l) => l.startsWith(`${cp} waiver:`));
		const needsWaiver = (cp === "CP-4" || cp === "CP-5") && d.choice === "fallback";
		if (needsWaiver && !waiver) problems.push(`${cp} fallback applied but no waiver line`);
		if (!needsWaiver && waiver) problems.push(`${cp} has a waiver line without an applied fallback`);
	}
	const nonEmpty = md.split("\n").filter((l) => l.trim() !== "");
	if (nonEmpty[nonEmpty.length - 1]?.trim() !== "[hudsor01]") problems.push("last non-empty line is not [hudsor01]");
	return problems;
}

function lintSelfTest(failures) {
	let passed = 0;
	const dec = fixtureDecisions("default");
	const good = [
		"## Summary",
		REQUIRED_TOKENS.filter((t) => !t.startsWith("##")).join(" "),
		`\`@theme\` and \`@tailwindcss/node\` in code, mail a@b.example, PR #${"1039"}.`,
		"## Owner checkpoints",
		"No checkpoint is open for owner review.",
		"## Readiness checklist",
		"- [x] D-01",
		"",
		"[hudsor01]",
		"",
	].join("\n");
	const cases = [
		["clean body", good, 0],
		["bare mention", good.replace("## Summary", "## Summary\nping @someone"), 1],
		["hex literal", good.replace("## Summary", `## Summary\ncolor #${"c0ffee"}`), 1],
		["session url", good.replace("## Summary", "## Summary\nclaude.ai/code/session_x"), 1],
		["missing token", good.replace("VD-17 ", ""), 1],
		["closed CP listed open", good.replace("No checkpoint", "CP-2: open for owner screenshot review\nNo checkpoint"), 1],
		["waiver without fallback", good.replace("No checkpoint", "CP-4 waiver: x\nNo checkpoint"), 1],
		["wrong last line", good.replace("[hudsor01]", "[hudsor01]\nthanks"), 1],
	];
	for (const [name, md, want] of cases) {
		const n = lintBody(md, dec).length;
		if ((want === 0 && n === 0) || (want > 0 && n > 0)) passed++;
		else failures.push(`lint ${name}: ${n} problem(s), expected ${want === 0 ? "0" : ">0"}`);
	}
	const open = fixtureDecisions("fallback");
	open["CP-5"].ownerReview = "open";
	const withWaivers = good.replace(
		"No checkpoint is open for owner review.",
		"CP-4 waiver: desktop collapse not shipped\nCP-5 waiver: entrance not shipped\nCP-5: open for owner screenshot review",
	);
	if (lintBody(withWaivers, open).length === 0) passed++;
	else failures.push(`lint fallback waivers: ${JSON.stringify(lintBody(withWaivers, open))}`);
	if (lintBody(good, open).length > 0) passed++;
	else failures.push("lint fallback without waivers passed");
	return passed;
}

// ---------- --fix-round-1 ----------

// M8 (main-session decision, option B, 2026-11-02). These four UI-SPEC T-1 contract tokens have no
// utility consumer after fix round 1 and are kept: chart-1..chart-5 is shadcn's chart palette (the
// satori/OG renderers mirror it as the brand palette) and success/success-foreground is a T-1
// fill/foreground pair. chart-2, chart-3 and chart-5 lost their last use in 2d36cb146 (VD-53),
// success-foreground in 8446d6bbf (VD-55). The audit's dead list must EQUAL this list: a fifth dead
// var fails, and so does one of these four regaining a use (then remove it from this list).
const FR_ALLOWED_DEAD_THEME_VARS = ["--color-chart-2", "--color-chart-3", "--color-chart-5", "--color-success-foreground"];
// M6 after VD-53: the mode-independent (light-only) color tokens still in use (FINAL: chart-1..5).
const FR_LIGHT_ONLY_IN_USE = ["--color-chart-1", "--color-chart-4"];
// The token values that differ from FINAL: VD-59 (261e7d893) and VD-38 (fa9e89502), light only.
const FR_TOKEN_DELTAS = { "light accent-foreground": [27, 33, 30, 1], "light destructive-foreground": [253, 252, 247, 1] };
// The utilities present in FINAL and here whose CSS changed: VD-69 (ed7db2d48, hover parts removed).
const FR_UTILITY_CHANGED = ["showcase-card", "testimonial-card"];
const FR_EXPECTED_MIGRATIONS = 357;
const FR_EXPECTED_SWEEP_ROWS = 179;
const FR_REPLAY_GATES = ["applied", "no-network", "seed", "test-cast", "billing-insights", "property-performance", "owner-figures", "blog-banlist"];
const FR_VD_IDS = [...Array.from({ length: 129 }, (_, i) => `VD-${String(i + 1).padStart(2, "0")}`), "VD-19b"];
// VD rows that change nothing themselves and record measurements only, so their Proof cell cites a
// session measurement and no test or committed record: VD-115 (part P's surfaces measured
// unchanged), VD-124 and VD-129 (before-measurements parts P and Q could not take). The set of
// rows with no committed evidence must EQUAL this list.
const FR_MEASUREMENT_ONLY_ROWS = ["VD-115", "VD-124", "VD-129"];
const FR_SCREEN_CLASSES = ["identical", "noise", "data-drift", "intended"];
// Every guard test fix round 1 added or widened (the parts' reports), with the test titles a
// shared file must still carry. Each must be in the f39 unit summary, passed, with no failing test.
const FR_GUARD_TESTS = [
	{ path: "src/app/__tests__/tailwind-theme-integrity.test.ts", titles: ["G9 every first-party class string token emits CSS", "G10 no shipped source reaches the default color palette", "G8 every first-party class is canonical (D-25, PLAN.md §4.4 class) finds no arbitrary percentage"] },
	{ path: "src/app/__tests__/design-token-drift.test.ts" },
	{ path: "src/app/__tests__/destructive-pair-contrast.test.ts" },
	{ path: "src/app/__tests__/state-fill-contrast.test.ts" },
	{ path: "src/app/__tests__/select-trigger-names.test.ts" },
	{ path: "src/app/__tests__/scheduled-rent-not-revenue.test.ts" },
	{ path: "src/components/__tests__/label-in-name-sweep.test.tsx" },
	{ path: "src/components/__tests__/generic-name-sweep.test.tsx" },
	{ path: "src/components/__tests__/no-nested-interactive.test.tsx" },
	{ path: "src/components/__tests__/no-hover-on-static-elements.test.ts" },
	{ path: "src/components/__tests__/ids-not-shown-as-text.test.tsx" },
	{ path: "src/components/__tests__/owner-text-as-entered.test.tsx" },
	{ path: "src/components/ui/__tests__/blur-fade-grid-placement.test.ts" },
	{ path: "src/components/ui/__tests__/chart-legend-labels.test.ts" },
	{ path: "src/components/properties/__tests__/no-depreciation-claim.test.ts" },
	{ path: "src/lib/__tests__/one-label-per-value.test.ts" },
	{ path: "src/lib/__tests__/enum-values-rendered-with-labels.test.ts" },
	{ path: "src/lib/__tests__/no-always-empty-local-list.test.ts" },
	{ path: "src/lib/__tests__/no-raw-error-text.test.ts" },
	{ path: "src/lib/__tests__/no-deprecated-library-api.test.ts" },
	{ path: "src/lib/__tests__/no-hand-placed-currency-symbol.test.ts" },
	{ path: "src/lib/__tests__/no-jwt-literals.test.ts" },
	{ path: "src/lib/__tests__/rpc-boundary-cast-pins.test.ts" },
	{ path: "src/lib/formatters/__tests__/count-labels-agree.test.ts" },
	{ path: "src/lib/reports/__tests__/download-blob-is-the-only-download.test.ts" },
	{ path: "src/lib/utils/__tests__/format-cents-callers.test.ts" },
	{ path: "src/lib/seo/__tests__/banlist-parity.test.ts" },
	{ path: "src/hooks/api/__tests__/data-layer-callers.test.ts" },
	{ path: "src/hooks/api/__tests__/report-mutations-have-callers.test.ts" },
	{ path: "src/hooks/api/query-keys/financial-statements-tie.test.ts" },
	{ path: "src/hooks/api/query-keys/__tests__/property-performance-every-row.test.ts" },
	{ path: "src/providers/__tests__/query-cache-buster.test.ts" },
	{ path: "src/app/(owner)/analytics/__tests__/literal-zero-figures.test.tsx" },
	{ path: "src/app/(owner)/analytics/__tests__/always-empty-sections.test.tsx" },
	{ path: "src/app/(owner)/analytics/__tests__/stat-rows-one-height.test.tsx" },
	{ path: "src/app/(owner)/reports/__tests__/no-1099-section.test.tsx" },
	{ path: "src/app/(owner)/reports/__tests__/statement-basis-note.test.tsx" },
	{ path: "scripts/import-reads-no-env.test.ts" },
	{ path: "tests/e2e/lib/__tests__/e2e-support-exports-have-callers.test.ts" },
	{ path: "tests/e2e/lib/__tests__/playwright-config-publishable-key.test.ts" },
	{ path: "supabase/functions/__tests__/report-csv.test.ts" },
	{ path: "supabase/functions/__tests__/premium-report-gate.test.ts" },
	{ path: "supabase/functions/__tests__/financial-analytics-report.test.ts" },
	{ path: "supabase/functions/__tests__/tax-year-reports.test.ts" },
	{ path: "supabase/functions/__tests__/blog-banlist.test.ts" },
];

const sortedJson = (xs) => JSON.stringify([...xs].sort());

function frVdRows(spec) {
	const rows = [];
	for (const line of (spec ?? "").split("\n")) {
		const m = /^\| (VD-\d+[a-z]?) \|/.exec(line);
		if (!m) continue;
		const cells = line.trim().replace(/^\|/, "").replace(/\|$/, "").split(" | ").map((c) => c.trim());
		rows.push({ id: m[1], proof: cells[5] ?? "" });
	}
	return rows;
}

function frTestEvidence(ctx, tok) {
	const b = tok.split("/").pop();
	const unit = (ctx.unit?.files ?? []).filter((f) => f.name === tok || f.name.endsWith(`/${b}`));
	if (unit.length) return { kind: "unit", ref: unit.map((f) => f.name).join(", "), pass: unit.every((f) => f.status === "passed" && f.numPassed > 0 && f.numPassed === f.numTests) };
	const e2e = Object.entries(ctx.e2e?.specs ?? {}).filter(([k]) => k === tok || k.endsWith(`/${b}`));
	if (e2e.length) return { kind: "e2e", ref: e2e.map(([k]) => k).join(", "), pass: e2e.every(([, s]) => s.failed === 0 && s.passed > 0) };
	const deno = ctx.deno?.tests?.[b];
	if (deno) return { kind: "deno", ref: `supabase/functions/tests/${b}`, pass: deno.failed === 0 && deno.passed > 0 };
	// A path-qualified name outside the repo is a session measurement script (e.g. q/probe/*.spec.ts),
	// not a suite: informational. A bare test name no suite ran fails.
	if (tok.includes("/") && !(ctx.repoFiles ?? []).some((f) => f === tok || f.endsWith(`/${tok}`))) return { kind: "not-in-repo", ref: tok, pass: null };
	return { kind: "test", ref: tok, pass: false, note: "named test not found in the unit, e2e or deno results" };
}

function frDocEvidence(ctx, tok) {
	const hit = (ctx.repoFiles ?? []).find((f) => f === tok || f.endsWith(`/${tok}`));
	return hit ? { kind: "record", ref: hit, pass: true } : { kind: "not-in-repo", ref: tok, pass: null };
}

// Each UI-SPEC VD row -> its evidence: the tests and committed records its Proof cell names
// (backticked or bare), the rows whose proof it shares ("as VD-n"), FINAL's vd-register row (VD-01..VD-37)
// and the f39 captures classified intended under it.
function frVdEvidence(ctx) {
	const rows = frVdRows(ctx.spec);
	const direct = new Map();
	const inherits = new Map();
	for (const { id, proof } of rows) {
		const ev = [];
		const seen = new Set();
		for (const m of proof.matchAll(/[\w./()@-]+?(?:\.(?:test|spec)\.tsx?|-test\.ts)\b/g)) {
			const tok = m[0].replace(/^[(]+/, "");
			if (seen.has(tok)) continue;
			seen.add(tok);
			ev.push(frTestEvidence(ctx, tok));
		}
		for (const m of proof.matchAll(/[\w./-]+\.(?:md|json|txt)\b/g)) {
			if (seen.has(m[0])) continue;
			seen.add(m[0]);
			ev.push(frDocEvidence(ctx, m[0]));
		}
		for (const m of proof.matchAll(/screenshot class ([\w-]+)/g)) {
			const hits = (ctx.finalScreens ?? []).filter((x) => Array.isArray(x.vd) && x.vd.includes(m[1]));
			ev.push(hits.length ? { kind: "final-screenshot", ref: `final/screens-cumulative.json class ${m[1]} (${hits.length} captures)`, pass: true } : { kind: "final-screenshot", ref: `final/screens-cumulative.json class ${m[1]}`, pass: false });
		}
		const fin = ctx.finalVd?.rows?.find((r) => r.id === id);
		if (fin) ev.push({ kind: "final-register", ref: `final/vd-register.json#${id}`, pass: fin.pass === true });
		for (const s of ctx.screens ?? []) {
			if (s.class === "intended" && Array.isArray(s.vd) && s.vd.includes(id)) ev.push({ kind: "screenshot", ref: `${s.set}/${s.capture}`, pass: true });
		}
		direct.set(id, ev);
		// "as VD-n" at the start of the cell or of a clause shares that row's proof; "Chrome as VD-n"
		// only names the measurement method, so it shares nothing.
		inherits.set(id, [...proof.matchAll(/(?:^|;\s*)as (VD-\d+[a-z]?)\b/g)].map((m) => m[1]));
	}
	const resolve = (id, stack = []) => {
		if (stack.includes(id)) return [];
		const own = direct.get(id) ?? [];
		const inh = (inherits.get(id) ?? []).flatMap((t) => resolve(t, [...stack, id]).map((e) => ({ ...e, via: t })));
		return [...own, ...inh];
	};
	return rows.map(({ id }) => {
		const evidence = resolve(id);
		const failing = evidence.filter((e) => e.pass === false);
		const passing = evidence.filter((e) => e.pass === true);
		return { id, evidence, committed: evidence.some((e) => e.pass !== null), pass: failing.length === 0 && (passing.length > 0 || FR_MEASUREMENT_ONLY_ROWS.includes(id)) };
	});
}

function frTokenDeltas(tokens, finalTokens) {
	const out = {};
	for (const theme of THEMES) {
		const a = finalTokens?.[theme] ?? {};
		const b = tokens?.[theme] ?? {};
		for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
			if (!colorWithin(b[k], a[k]) && JSON.stringify(a[k]) !== JSON.stringify(b[k])) out[`${theme} ${k}`] = b[k] ?? MISSING;
		}
	}
	return out;
}

function fixRoundChecks(ctx) {
	const c = createCollector("FR-1", "fix-round-1");
	const add = (group, name, pass, expected, measured) => {
		c.add(name, pass, expected, measured);
		c.checks[c.checks.length - 1].group = group;
	};
	const dead = (ctx.dead?.deadTheme ?? []).map((v) => v.name);
	add("M8", "M8 dead theme vars equal the allowed T-1 contract list (0 outside the T-1 token contract)", sortedJson(dead) === sortedJson(FR_ALLOWED_DEAD_THEME_VARS) && ctx.report?.dead?.themeVars === FR_ALLOWED_DEAD_THEME_VARS.length, [...FR_ALLOWED_DEAD_THEME_VARS].sort(), { names: [...dead].sort(), count: ctx.report?.dead?.themeVars ?? MISSING });
	const d = ctx.report?.dead ?? {};
	add("M8-other", "M8 dead custom properties, keyframes, class selectors and utilities are 0", d.customProperties === 0 && d.keyframes === 0 && d.plainClassSelectors === 0 && typeof d.utilities === "string" && d.utilities.startsWith("0/"), "0 / 0 / 0 / 0 of n", d);
	const lightOnly = (ctx.report?.lightOnlyColorTokensInUse ?? []).map((s) => String(s).split(":")[0].trim());
	add("M6", "M6 light-only tokens in use equal chart-1 and chart-4 (VD-53)", sortedJson(lightOnly) === sortedJson(FR_LIGHT_ONLY_IN_USE), [...FR_LIGHT_ONLY_IN_USE].sort(), [...lightOnly].sort());
	add("M10", "M10 first-party non-canonical classes 0", ctx.report?.noncanonical?.firstPartyFiles === 0, 0, ctx.report?.noncanonical?.firstPartyFiles ?? MISSING);
	const deltas = frTokenDeltas(ctx.tokens, ctx.finalTokens);
	const want = Object.keys(FR_TOKEN_DELTAS);
	add("tokens", "tokens differ from FINAL in exactly the two light fix-round deltas (VD-38, VD-59)", sortedJson(Object.keys(deltas)) === sortedJson(want) && want.every((k) => colorWithin(deltas[k], FR_TOKEN_DELTAS[k])), FR_TOKEN_DELTAS, deltas);
	const changed = ctx.parity?.lists?.["intended:fix-round-1-utility-changed"] ?? [];
	add("parity", "css-parity FINAL -> f39: 0 unclassified, and the changed utilities equal the two VD-69 ones", ctx.parity?.counts?.unclassified === 0 && sortedJson(changed) === sortedJson(FR_UTILITY_CHANGED), { unclassified: 0, changed: FR_UTILITY_CHANGED }, { unclassified: ctx.parity?.counts?.unclassified ?? MISSING, changed });
	add("unit", "unit suite: 0 failed tests", ctx.unit?.numFailedTests === 0 && (ctx.unit?.numTotalTests ?? 0) > 0, 0, ctx.unit?.numFailedTests ?? MISSING);
	for (const g of FR_GUARD_TESTS) {
		const f = (ctx.unit?.files ?? []).find((x) => x.name === g.path);
		const titlesOk = (g.titles ?? []).every((t) => f && (f.tests.length === 0 ? f.numPassed === f.numTests : f.tests.some((x) => x.title.startsWith(t) && x.status === "passed")));
		const ok = Boolean(f) && ctx.exists(g.path) && f.status === "passed" && f.numTests > 0 && f.numPassed === f.numTests && titlesOk;
		add(`guard:${g.path}`, `guard test ${g.path} present and passing`, ok, "passed", f ? { status: f.status, numTests: f.numTests, numPassed: f.numPassed, titlesOk } : MISSING);
	}
	const vd = frVdEvidence(ctx);
	const ids = vd.map((r) => r.id);
	add("vd-ids", "UI-SPEC VD rows are exactly VD-01..VD-129 and VD-19b, once each", sortedJson(ids) === sortedJson(FR_VD_IDS), FR_VD_IDS.length, { count: ids.length, missing: FR_VD_IDS.filter((x) => !ids.includes(x)), extra: ids.filter((x, i) => !FR_VD_IDS.includes(x) || ids.indexOf(x) !== i) });
	for (const r of vd) add(`vd:${r.id}`, `${r.id} mapped to passing evidence`, r.pass, "no failing and at least one passing evidence", r.evidence.map((e) => `${e.kind}${e.via ? ` (via ${e.via})` : ""}: ${e.ref} ${e.pass === true ? "pass" : e.pass === false ? "FAIL" : "informational"}`));
	const uncommitted = vd.filter((r) => !r.committed).map((r) => r.id);
	add("vd-measurement-only", "rows with no committed evidence equal the measurement-only list", sortedJson(uncommitted) === sortedJson(FR_MEASUREMENT_ONLY_ROWS), [...FR_MEASUREMENT_ONLY_ROWS].sort(), [...uncommitted].sort());
	const rp = ctx.replay ?? {};
	const gatesOk = FR_REPLAY_GATES.every((g) => rp.gates?.[g] === 0);
	add("replay", `migration replay: ${FR_EXPECTED_MIGRATIONS} files in the tree, all applied from empty, every gate exit 0`, rp.files === FR_EXPECTED_MIGRATIONS && ctx.migrationsCount === FR_EXPECTED_MIGRATIONS && rp.applied === rp.files && gatesOk, { files: FR_EXPECTED_MIGRATIONS, gates: FR_REPLAY_GATES }, { files: rp.files ?? MISSING, tree: ctx.migrationsCount ?? MISSING, applied: rp.applied ?? MISSING, gates: rp.gates ?? MISSING });
	const sw = ctx.sweep ?? {};
	add("sweep", `mutation sweep: ${FR_EXPECTED_SWEEP_ROWS} rows, all caught, 0 vacuous, 0 not applied, tree restored`, ctx.sweepRows === FR_EXPECTED_SWEEP_ROWS && sw.caught === FR_EXPECTED_SWEEP_ROWS && sw.vacuous === 0 && sw.notApplied === 0 && sw.restored === true, { rows: FR_EXPECTED_SWEEP_ROWS, caught: FR_EXPECTED_SWEEP_ROWS, vacuous: 0, notApplied: 0 }, { rows: ctx.sweepRows ?? MISSING, ...sw });
	const fns = ctx.edge?.functions ?? [];
	const differing = fns.filter((f) => f.bundle === "different").map((f) => f.fn);
	add("edge", "Edge deploy list equals the functions whose bundle differs from main; every bundle built", fns.length > 0 && fns.every((f) => f.baseExit === 0 && f.headExit === 0 && (f.bundle === "different" || f.bundle === "identical")) && sortedJson(ctx.edge?.deploy ?? []) === sortedJson(differing), [...differing].sort(), { deploy: ctx.edge?.deploy ?? MISSING, functions: fns.length });
	const sc = ctx.screens ?? [];
	const badScreens = sc.filter((s) => !FR_SCREEN_CLASSES.includes(s.class) || (s.class === "intended" && (!Array.isArray(s.vd) || s.vd.length === 0 || !s.vd.every((x) => FR_VD_IDS.includes(x)))) || (s.class !== "identical" && !(typeof s.evidence === "string" && s.evidence.length > 0)));
	add("screens", "every f39 capture is identical, noise, data-drift or intended under a VD row, with evidence", sc.length > 0 && badScreens.length === 0, "0 unclassified", { captures: sc.length, bad: badScreens.map((s) => `${s.set}/${s.capture}`) });
	const pd = ctx.probesDiff?.diffs ?? [];
	const badProbes = pd.filter((x) => x.kind !== "measured" || x.class !== "intended" || !(typeof x.ref === "string" && x.ref.length > 0) || !(x.vd ?? []).every((v) => FR_VD_IDS.includes(v)));
	add("probes", "every measured component-probe difference from the 4476e6450 same-session run is intended, with its commit and VD row or finding", Array.isArray(ctx.probesDiff?.diffs) && badProbes.length === 0, "0 unattributed", { diffs: pd.length, bad: badProbes.map((x) => `${x.id} ${x.field}`) });
	const failedGroups = [...new Set(c.checks.filter((k) => !k.pass).map((k) => k.group))];
	return { mode: "fix-round-1", checks: c.checks, vd, failedGroups, failed: c.checks.filter((k) => !k.pass).length };
}

function readFixRoundContext(dir) {
	const j = (name) => {
		const p = join(dir, name);
		return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null;
	};
	const git = (args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
	const sweepText = readFileSync(join(ROOT, "scripts/mutation-sweep.sh"), "utf8");
	return {
		report: j("report.json"),
		dead: j("dead.json"),
		tokens: j("tokens-f39.json"),
		finalTokens: JSON.parse(readFileSync(join(ROOT, ".planning/tailwind-shadcn/audit/final/tokens-final.json"), "utf8")),
		finalVd: JSON.parse(readFileSync(join(ROOT, ".planning/tailwind-shadcn/audit/final/vd-register.json"), "utf8")),
		finalScreens: JSON.parse(readFileSync(join(ROOT, ".planning/tailwind-shadcn/audit/final/screens-cumulative.json"), "utf8")),
		parity: j("css-parity-candidate-css-final-vs-candidate-css-f39.json"),
		unit: j("unit-f39-summary.json"),
		e2e: j("e2e-f39-summary.json"),
		deno: j("deno-f39.json"),
		replay: j("replay-f39.json"),
		sweep: j("sweep-f39.json"),
		edge: j("edge-bundles-f39.json"),
		screens: j("screens-diff-f39.json"),
		probesDiff: j("probes-diff-f39.json"),
		spec: readFileSync(join(ROOT, ".planning/phases/66.2-tailwind-v4-and-shadcn-ui-canonical-remediation/66.2-UI-SPEC.md"), "utf8"),
		repoFiles: git(["ls-files"]).split("\n").filter(Boolean),
		migrationsCount: readdirSync(join(ROOT, "supabase/migrations")).filter((f) => f.endsWith(".sql")).length,
		sweepRows: sweepText.split("\n").filter((l) => /^\s*mutate\s/.test(l)).length,
		exists: (rel) => existsSync(join(ROOT, rel)),
	};
}

function fixRoundFixture() {
	const unitFiles = FR_GUARD_TESTS.map((g) => ({ name: g.path, status: "passed", numTests: 2, numPassed: 2, tests: [...(g.titles ?? []).map((t) => ({ title: `${t} x`, status: "passed" })), { title: "y", status: "passed" }] }));
	unitFiles.push({ name: "src/a/__tests__/vd-proof.test.ts", status: "passed", numTests: 1, numPassed: 1, tests: [{ title: "z", status: "passed" }] });
	const spec = FR_VD_IDS.map((id) => {
		const proof = FR_MEASUREMENT_ONLY_ROWS.includes(id) ? "Chrome `q/probe/measure.json`" : id === "VD-02" ? "as VD-01" : "`vd-proof.test.ts`";
		return `| ${id} | 39 | s | b | src | ${proof} | — |`;
	}).join("\n");
	return {
		report: { dead: { themeVars: 4, customProperties: 0, keyframes: 0, plainClassSelectors: 0, utilities: "0/42" }, lightOnlyColorTokensInUse: ["--color-chart-1: x", "--color-chart-4: y"], noncanonical: { firstPartyFiles: 0 } },
		dead: { deadTheme: FR_ALLOWED_DEAD_THEME_VARS.map((name) => ({ name })) },
		finalTokens: { light: { "accent-foreground": [243, 251, 246, 1], "destructive-foreground": [251, 248, 241, 1], border: [210, 216, 222, 1] }, dark: { border: [40, 44, 50, 1] } },
		tokens: { light: { "accent-foreground": [27, 33, 30, 1], "destructive-foreground": [253, 252, 247, 1], border: [210, 216, 222, 1] }, dark: { border: [40, 44, 50, 1] } },
		finalVd: { rows: [] },
		parity: { counts: { unclassified: 0 }, lists: { "intended:fix-round-1-utility-changed": [...FR_UTILITY_CHANGED] } },
		unit: { numFailedTests: 0, numTotalTests: unitFiles.length * 2, files: unitFiles },
		e2e: { specs: {} },
		deno: { tests: {} },
		replay: { files: FR_EXPECTED_MIGRATIONS, applied: FR_EXPECTED_MIGRATIONS, gates: Object.fromEntries(FR_REPLAY_GATES.map((g) => [g, 0])) },
		sweep: { caught: FR_EXPECTED_SWEEP_ROWS, vacuous: 0, notApplied: 0, restored: true },
		edge: { deploy: ["a"], functions: [{ fn: "a", bundle: "different", baseExit: 0, headExit: 0 }, { fn: "b", bundle: "identical", baseExit: 0, headExit: 0 }] },
		screens: [{ set: "public", capture: "root-light-1280.png", class: "intended", vd: ["VD-01"], evidence: "e" }, { set: "owner", capture: "x.png", class: "identical", vd: [], evidence: "" }],
		probesDiff: { diffs: [{ id: "button", field: "light.variants.default.hoverBg", kind: "measured", class: "intended", vd: ["VD-59"], ref: "c" }] },
		spec,
		repoFiles: [],
		migrationsCount: FR_EXPECTED_MIGRATIONS,
		sweepRows: FR_EXPECTED_SWEEP_ROWS,
		exists: () => true,
	};
}

// One mutation per group; each must fail exactly that group. The first two are the M8 negative
// controls the decision requires: a fifth dead var, and one of the four regaining a use.
const FR_MUTATIONS = [
	["fifth dead theme var", "M8", (f) => {
		f.dead.deadTheme.push({ name: "--color-warning-foreground" });
		f.report.dead.themeVars = 5;
	}],
	["an allowed var regains a use", "M8", (f) => {
		f.dead.deadTheme = f.dead.deadTheme.filter((v) => v.name !== "--color-chart-5");
		f.report.dead.themeVars = 3;
	}],
	["a dead custom property", "M8-other", (f) => {
		f.report.dead.customProperties = 1;
	}],
	["M6 regains chart-5", "M6", (f) => {
		f.report.lightOnlyColorTokensInUse.push("--color-chart-5: z");
	}],
	["a first-party non-canonical class", "M10", (f) => {
		f.report.noncanonical.firstPartyFiles = 1;
	}],
	["a third token delta", "tokens", (f) => {
		f.tokens.dark.border = [90, 90, 90, 1];
	}],
	["a third changed utility", "parity", (f) => {
		f.parity.lists["intended:fix-round-1-utility-changed"].push("card-standard");
	}],
	["a guard test fails", `guard:${FR_GUARD_TESTS[5].path}`, (f) => {
		Object.assign(f.unit.files.find((x) => x.name === FR_GUARD_TESTS[5].path), { status: "failed", numPassed: 1 });
	}],
	["G9 tests removed", `guard:${FR_GUARD_TESTS[0].path}`, (f) => {
		const t = f.unit.files.find((x) => x.name === FR_GUARD_TESTS[0].path);
		t.tests = t.tests.filter((x) => !x.title.startsWith("G9 "));
	}],
	["a VD row's named test is missing", "vd:VD-77", (f) => {
		f.spec = f.spec.replace("| VD-77 | 39 | s | b | src | `vd-proof.test.ts` |", "| VD-77 | 39 | s | b | src | `gone.test.ts` |");
	}],
	["a VD row dropped from the spec and another added", "vd-ids", (f) => {
		f.spec = f.spec.split("\n").filter((l) => !l.startsWith("| VD-50 |")).join("\n");
		f.spec = `${f.spec}\n| VD-130 | 39 | s | b | src | \`vd-proof.test.ts\` | — |`;
	}],
	["a row loses its only committed evidence", ["vd:VD-80", "vd-measurement-only"], (f) => {
		f.spec = f.spec.replace("| VD-80 | 39 | s | b | src | `vd-proof.test.ts` |", "| VD-80 | 39 | s | b | src | Chrome `q/probe/m.json` |");
	}],
	["the replay misses a file", "replay", (f) => {
		f.replay.applied = FR_EXPECTED_MIGRATIONS - 1;
	}],
	["a replay gate fails", "replay", (f) => {
		f.replay.gates["blog-banlist"] = 1;
	}],
	["a vacuous sweep row", "sweep", (f) => {
		f.sweep.vacuous = 1;
		f.sweep.caught = FR_EXPECTED_SWEEP_ROWS - 1;
	}],
	["a sweep row added without its count", "sweep", (f) => {
		f.sweepRows = FR_EXPECTED_SWEEP_ROWS + 1;
	}],
	["an identical bundle listed for deploy", "edge", (f) => {
		f.edge.deploy.push("b");
	}],
	["an intended capture without a VD row", "screens", (f) => {
		f.screens[0].vd = [];
	}],
	["an unattributed probe difference", "probes", (f) => {
		f.probesDiff.diffs.push({ id: "chart", field: "light.gridStroke", kind: "measured", class: "unclassified", vd: [], ref: "" });
	}],
];

function fixRoundSelfTest(failures) {
	let passed = 0;
	const clean = fixRoundChecks(fixRoundFixture());
	if (clean.failed === 0) passed++;
	else failures.push(`fix-round-1 clean fixture failed ${JSON.stringify(clean.checks.filter((k) => !k.pass).map((k) => k.name))}`);
	for (const [name, group, mutate] of FR_MUTATIONS) {
		const f = fixRoundFixture();
		mutate(f);
		const r = fixRoundChecks(f);
		const want = Array.isArray(group) ? group : [group];
		if (sortedJson(r.failedGroups) === sortedJson(want)) passed++;
		else failures.push(`fix-round-1 "${name}": failed groups ${JSON.stringify(r.failedGroups)}, expected ${JSON.stringify(want)}`);
	}
	return passed;
}

// ---------- --fix-round-2 ----------

// Fix round 2 answers CI on bc54b045a and f8de0175e. 74f8bd9f1 sends every name a test guard puts
// into a pattern through one helper (CodeQL js/incomplete-sanitization at three sites) and ends the
// JSX-comment ReDoS (js/redos); f8de0175e shards the mutation sweep across an 8-job matrix (the one
// job hit timeout-minutes 45 at row 155 of 179). The code diff since FR2_BASE holds tests, test
// helpers, E2E specs and helpers, the sweep script and its workflow, and nothing the app builds.
const FR2_BASE = "b628eb9f1b0c68e8d2d48cfd6660921b0660fef5";
const FR2_MAIN = "d9c7329f0fa500a597e87e7ac02d5a4fb0cf2f2d";
const FR2_DIFF_PATHS = 42;
const FR2_HELPER = "src/test/utils/regexp-source.ts";
const FR2_HELPER_TEST = {
	path: "src/lib/__tests__/regexp-source.test.ts",
	titles: [
		"escapeRegExp matches every metacharacter as itself, alone and together",
		"escapeRegExp matches nothing a metacharacter would have stood for",
		"escapeRegExp stays valid source under the u and v flags",
		"escapeRegExp leaves every other character as it is",
		"identifierSource matches a name holding `$` after a space and at a line start",
		"identifierSource does not match inside a longer identifier",
		"identifierSource takes a member path and a list of names",
		"identifierSource refuses an empty list, which would match at every boundary",
		"JSX_CHILD_GAP skips whitespace and comments to the first child",
		"JSX_CHILD_GAP ends a comment at its first `*/}`, so it cannot swallow a child",
		"JSX_CHILD_GAP fails in linear time on adversarial comment runs",
	],
};
// Every module importing the helper at the code state (its own test aside), with the unit test
// files that run it; a test file runs itself. The importer set must EQUAL this list, so a guard that
// drops the helper for a local escape fails here as well as in the escape scan.
const FR2_HELPER_USERS = [
	...[
		"scripts/reclaim-finalize.test.ts",
		"src/app/__tests__/design-token-drift.test.ts",
		"src/app/__tests__/global-error-fonts.test.tsx",
		"src/app/__tests__/marketing-home.test.tsx",
		"src/components/__tests__/no-nested-interactive.test.tsx",
		"src/components/documents/__tests__/documents-section.test.tsx",
		"src/components/layout/navbar/__tests__/navbar-desktop-nav.test.tsx",
		"src/components/shell/__tests__/label-in-name.test.tsx",
		"src/components/ui/__tests__/blur-fade-grid-placement.test.ts",
		"src/hooks/api/__tests__/collection-rate-mapper.test.ts",
		"src/hooks/api/__tests__/data-layer-callers.test.ts",
		"src/hooks/api/__tests__/report-mutations-have-callers.test.ts",
		"src/hooks/api/query-keys/__tests__/application-keys.test.ts",
		"src/hooks/api/query-keys/__tests__/application-link-keys.test.ts",
		"src/hooks/api/query-keys/__tests__/notification-keys.test.ts",
		"src/hooks/api/query-keys/document-category-keys.test.ts",
		"src/hooks/api/query-keys/document-keys.test.ts",
		"src/lib/__tests__/breadcrumbs.test.ts",
		"src/lib/__tests__/no-always-empty-local-list.test.ts",
		"src/lib/__tests__/no-deprecated-library-api.test.ts",
		"src/lib/__tests__/one-label-per-value.test.ts",
		"src/lib/formatters/__tests__/count-labels-agree.test.ts",
		"src/types/sections/__tests__/inspections.test.ts",
		"supabase/functions/__tests__/rate-limit.test.ts",
	].map((path) => ({ path, tests: [path] })),
	{ path: "src/test/utils/oklch-contrast.ts", tests: ["src/app/__tests__/destructive-pair-contrast.test.ts", "src/app/__tests__/design-token-drift.test.ts"] },
	{ path: "src/test/utils/state-fill-pairs.ts", tests: ["src/app/__tests__/state-fill-contrast.test.ts"] },
];
// The tests fix round 2 added to the guards it touched: each must still exist and pass.
const FR2_GUARD_TITLES = [
	{ path: "src/components/__tests__/no-nested-interactive.test.tsx", titles: ["no control nests another (static) looks past JSX comments to the first child, and no further", "no control nests another (static) scans adversarial comment runs in linear time"] },
	{ path: "src/components/ui/__tests__/blur-fade-grid-placement.test.ts", titles: ["BlurFade grid placement looks past JSX comments to the first child, and no further", "BlurFade grid placement scans adversarial comment runs in linear time"] },
	{ path: "src/hooks/api/__tests__/report-mutations-have-callers.test.ts", titles: ["report mutations and their keys have callers reads the object path as literal text and as a whole identifier"] },
	{ path: "src/lib/__tests__/no-always-empty-local-list.test.ts", titles: ["no local list stays the empty literal it was declared as reads a list's name as literal text and as a whole identifier"] },
	{ path: "tests/e2e/lib/__tests__/e2e-support-exports-have-callers.test.ts", titles: ["Playwright support modules export only what is imported (66.2-39 fix round 1, part F) reads a namespace name holding `$` literally and as a whole identifier"] },
];
const FR2_SWEEP_TEST = {
	path: "scripts/mutation-sweep.test.ts",
	titles: [
		"the mutation sweep's shards lists every row once, in order, with no shard set",
		"the mutation sweep's shards hands each matrix job its shard and the matrix size",
		"the mutation sweep's shards splits the rows into disjoint, non-empty shards whose union is every row",
		"the mutation sweep's shards refuses a half-set, malformed or out-of-range shard",
		"the mutation sweep's shards fails a shard that holds no row",
	],
};
// The sharded workflow's own contract is FR2_SWEEP_TEST's second test; workflow-contract.test.ts
// carries fix round 2's linear-time fix of its push-trigger matcher.
const FR2_WORKFLOW_CONTRACT_TEST = { path: "scripts/workflow-contract.test.ts", titles: ["the fixture helpers the push-trigger matcher fails in linear time"] };
const FR2_SWEEP_WORKFLOW = ".github/workflows/mutation-sweep.yml";
const FR2_SHARDS = 8;
const FR2_SHARD_TIMEOUT_MINUTES = 15;
// Every character that is special in a regex outside a character class.
const FR2_METACHARS = "\\^$.*+?()[]{}|";
// Escape helpers may live under the test roots only in the shared helper and in main's
// scripts/reclaim-finalize.ts (not a test, unchanged by this PR: it must equal FR2_MAIN's copy).
const FR2_TEST_ROOTS = ["src/", "scripts/", "tests/", "supabase/functions/__tests__/"];
const FR2_ESCAPE_HOMES = [FR2_HELPER, "scripts/reclaim-finalize.ts"];
const FR2_MAIN_COPIES = ["scripts/reclaim-finalize.ts"];
// The two backtracking forms fix round 2 removed, assembled from parts so this file never holds
// them: the JSX-comment run (blur-fade-grid-placement.test.ts:43, CodeQL js/redos, and the same
// gap in no-nested-interactive) and workflow-contract.test's two-alternative push matcher.
const FR2_OLD_REDOS = [
	["nested JSX-comment run", ["[\\s\\S]*?", "\\*\\/\\}\\s*)*"].join("")],
	["two-alternative push matcher", ["| {6}", ".*\\n)*"].join("")],
];
const FR2_SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".mjs", ".cjs", ".jsx"];

// Where each path of the code diff since FR2_BASE belongs; "application" fails the scope check.
function fr2PathClass(path) {
	if (path === FR2_SWEEP_WORKFLOW) return "workflow";
	if (path === "scripts/mutation-sweep.sh") return "sweep-script";
	if (path.endsWith(".test.ts") || path.endsWith(".test.tsx")) return "unit-test";
	if (path.startsWith("src/test/utils/") && path.endsWith(".ts")) return "test-helper";
	if (path.startsWith("tests/e2e/tests/")) return "e2e";
	return "application";
}

const FR2_WS = new Set([" ", "\t", "\n", "\r"]);

// The raw text of the string literal opening at text[open] (a quote), or null when unterminated.
function fr2Literal(text, open) {
	const quote = text[open];
	let raw = "";
	for (let k = open + 1; k < text.length; k++) {
		const ch = text[k];
		if (ch === "\\") {
			raw += ch + (text[k + 1] ?? "");
			k++;
		} else if (ch === quote) return raw;
		else if (ch === "\n" && quote !== "`") return null;
		else raw += ch;
	}
	return null;
}

// Every escape-style replace call in `text`: a regex literal as the first argument and a string
// whose text starts with an escaped backslash as the second. A one-class pattern with the
// whole-match replacement is a class escape, complete when its class holds every metacharacter; a
// single escaped metacharacter other than the backslash (the `.` and `$` forms CodeQL flagged) is
// partial. A backslash-only escape is the first step of string-literal escaping, not a regex escape.
// A linear scan: indexOf and single passes, no backtracking pattern.
function fr2EscapeSites(text) {
	const sites = [];
	const call = [".rep", "lace("].join("");
	for (let i = text.indexOf(call); i !== -1; i = text.indexOf(call, i + call.length)) {
		let k = i + call.length;
		while (FR2_WS.has(text[k])) k++;
		if (text[k] !== "/") continue;
		let body = "";
		let inClass = false;
		for (k++; k < text.length && text[k] !== "\n"; k++) {
			const ch = text[k];
			if (ch === "\\") {
				body += ch + (text[k + 1] ?? "");
				k++;
				continue;
			}
			if (!inClass && ch === "/") break;
			if (ch === "[") inClass = true;
			else if (ch === "]") inClass = false;
			body += ch;
		}
		if (text[k] !== "/") continue;
		for (k++; k < text.length && text[k] >= "a" && text[k] <= "z"; k++);
		while (FR2_WS.has(text[k])) k++;
		if (text[k] !== ",") continue;
		for (k++; FR2_WS.has(text[k]); k++);
		if (text[k] !== '"' && text[k] !== "'" && text[k] !== "`") continue;
		const replacement = fr2Literal(text, k);
		if (replacement === null || !replacement.startsWith("\\\\")) continue;
		const line = text.slice(0, i).split("\n").length;
		if (body.length > 2 && body.startsWith("[") && body.endsWith("]") && replacement === "\\\\$&") {
			const chars = new Set();
			const inner = body.slice(1, -1);
			for (let c = 0; c < inner.length; c++) {
				if (inner[c] === "\\") {
					chars.add(inner[c + 1]);
					c++;
				} else chars.add(inner[c]);
			}
			const missing = [...FR2_METACHARS].filter((m) => !chars.has(m)).join("");
			sites.push({ line, kind: "class", body, complete: missing === "", missing });
		} else if (body.length === 2 && body[0] === "\\" && body[1] !== "\\" && FR2_METACHARS.includes(body[1])) {
			sites.push({ line, kind: "single", body, complete: false, missing: FR2_METACHARS.replace(body[1], "") });
		}
	}
	return sites;
}

function fr2UnitFile(ctx, path) {
	return (ctx.unit?.files ?? []).find((f) => f.name === path) ?? null;
}

function fr2FilePasses(ctx, path, titles = []) {
	const f = fr2UnitFile(ctx, path);
	if (!f) return { ok: false, measured: MISSING };
	const missing = titles.filter((t) => !f.tests.some((x) => x.title === t && x.status === "passed"));
	return { ok: f.status === "passed" && f.numTests > 0 && f.numPassed === f.numTests && missing.length === 0, measured: { status: f.status, numTests: f.numTests, numPassed: f.numPassed, missingTitles: missing } };
}

function fixRound2Checks(ctx) {
	const c = createCollector("FR-2", "fix-round-2");
	const add = (group, name, pass, expected, measured) => {
		c.add(name, pass, expected, measured);
		c.checks[c.checks.length - 1].group = group;
	};
	const h = fr2FilePasses(ctx, FR2_HELPER_TEST.path, FR2_HELPER_TEST.titles);
	add("fr2-helper-test", `${FR2_HELPER_TEST.path} present and passing, all ${FR2_HELPER_TEST.titles.length} tests`, h.ok && ctx.exists(FR2_HELPER), "passed", h.measured);
	const importers = [...(ctx.helperImporters ?? [])].filter((p) => p !== FR2_HELPER_TEST.path).sort();
	const want = FR2_HELPER_USERS.map((u) => u.path).sort();
	add("fr2-helper-users", "the modules importing the regexp-source helper equal the recorded list", sortedJson(importers) === sortedJson(want), want.length, { count: importers.length, missing: want.filter((p) => !importers.includes(p)), extra: importers.filter((p) => !want.includes(p)) });
	for (const u of FR2_HELPER_USERS) {
		const runs = u.tests.map((t) => [t, fr2FilePasses(ctx, t)]);
		add("fr2-helper-users", `${u.path} runs and passes (${u.tests.length === 1 && u.tests[0] === u.path ? "itself" : u.tests.join(", ")})`, runs.every(([, r]) => r.ok), "passed", Object.fromEntries(runs.map(([t, r]) => [t, r.measured])));
	}
	for (const g of FR2_GUARD_TITLES) {
		const r = fr2FilePasses(ctx, g.path, g.titles);
		add("fr2-guard-titles", `${g.path} keeps its fix-round-2 tests, passing`, r.ok, g.titles, r.measured);
	}
	const sp = fr2FilePasses(ctx, FR2_SWEEP_TEST.path, FR2_SWEEP_TEST.titles);
	add("fr2-sweep-partition", `${FR2_SWEEP_TEST.path} (the shard partition proof) present and passing`, sp.ok, FR2_SWEEP_TEST.titles, sp.measured);
	const wc = fr2FilePasses(ctx, FR2_WORKFLOW_CONTRACT_TEST.path, FR2_WORKFLOW_CONTRACT_TEST.titles);
	add("fr2-workflow-contract", `${FR2_WORKFLOW_CONTRACT_TEST.path} present and passing`, wc.ok, FR2_WORKFLOW_CONTRACT_TEST.titles, wc.measured);
	const job = ctx.workflow?.jobs?.sweep ?? {};
	const matrix = job.strategy?.matrix?.shard;
	const shardList = Array.from({ length: FR2_SHARDS }, (_, i) => i + 1);
	const steps = Array.isArray(job.steps) ? job.steps : [];
	const wfOk = sortedJson(matrix ?? []) === sortedJson(shardList) && Array.isArray(matrix) && matrix.length === FR2_SHARDS && job.strategy?.["fail-fast"] === false && job.env?.SWEEP_SHARD === "${{ matrix.shard }}" && job.env?.SWEEP_SHARDS === "${{ strategy.job-total }}" && job["timeout-minutes"] === FR2_SHARD_TIMEOUT_MINUTES && steps.some((s) => s?.run === "bash scripts/mutation-sweep.sh");
	add("fr2-sweep-workflow", `${FR2_SWEEP_WORKFLOW}: ${FR2_SHARDS} shards, fail-fast false, each job handed its shard and the matrix size, ${FR2_SHARD_TIMEOUT_MINUTES}-minute timeout`, wfOk, { shards: shardList, failFast: false, timeoutMinutes: FR2_SHARD_TIMEOUT_MINUTES }, { shards: matrix ?? MISSING, failFast: job.strategy?.["fail-fast"] ?? MISSING, env: job.env ?? MISSING, timeoutMinutes: job["timeout-minutes"] ?? MISSING });
	const sw = ctx.sweep ?? {};
	const shards = Array.isArray(sw.shards) ? sw.shards : [];
	const shardRows = shards.reduce((n, s) => n + (s.rows ?? 0), 0);
	const shardsOk = shards.length === FR2_SHARDS && shards.every((s, i) => s.shard === i + 1 && s.of === FR2_SHARDS && s.rows > 0 && s.caught === s.rows && s.vacuous === 0 && s.notApplied === 0 && s.restored === true && s.exit === 0) && shardRows === ctx.sweepRows;
	const unshardedOk = sw.rows === ctx.sweepRows && sw.caught === ctx.sweepRows && sw.vacuous === 0 && sw.notApplied === 0 && sw.restored === true && sw.exit === 0;
	const ls = sw.listing ?? {};
	const listingOk = ls.rows === ctx.sweepRows && ls.union === ctx.sweepRows && ls.disjoint === true && ls.nonEmpty === true && ls.equalsUnsharded === true && Array.isArray(ls.perShard) && ls.perShard.length === FR2_SHARDS && sortedJson(ls.perShard) === sortedJson(shards.map((s) => s.rows));
	add("fr2-sweep-shards", `mutation sweep unsharded and as ${FR2_SHARDS} shards: every row caught once, 0 vacuous, 0 not applied, the listing a disjoint cover`, unshardedOk && shardsOk && listingOk, { rows: ctx.sweepRows, shards: FR2_SHARDS }, { unsharded: { rows: sw.rows ?? MISSING, caught: sw.caught ?? MISSING }, shardRows, shards: shards.length, listing: ls });
	const sites = [];
	for (const [path, text] of Object.entries(ctx.sources ?? {})) for (const s of fr2EscapeSites(text)) sites.push({ path, ...s });
	const partial = sites.filter((s) => !s.complete);
	add("fr2-escape-complete", "every escape-style replace in a tracked JS/TS file escapes every regex metacharacter", Object.keys(ctx.sources ?? {}).length > 0 && partial.length === 0, "0 partial", { sites: sites.length, partial: partial.map((s) => `${s.path}:${s.line} ${s.kind} ${s.body} (missing ${s.missing})`) });
	const outside = sites.filter((s) => FR2_TEST_ROOTS.some((r) => s.path.startsWith(r)) && !FR2_ESCAPE_HOMES.includes(s.path));
	const mainDrift = FR2_MAIN_COPIES.filter((p) => ctx.sources?.[p] !== ctx.mainSources?.[p]);
	add("fr2-escape-homes", "escape helpers under src/, scripts/, tests/ and supabase/functions/__tests__/ live only in the shared helper and main's reclaim-finalize.ts", outside.length === 0 && mainDrift.length === 0, FR2_ESCAPE_HOMES, { elsewhere: outside.map((s) => `${s.path}:${s.line}`), differsFromMain: mainDrift });
	const redos = [];
	for (const [label, needle] of FR2_OLD_REDOS) for (const [path, text] of Object.entries(ctx.sources ?? {})) if (text.includes(needle)) redos.push(`${label}: ${path}`);
	add("fr2-old-redos", "neither backtracking form fix round 2 removed is back in a tracked JS/TS file", redos.length === 0, 0, redos);
	const diff = ctx.diffPaths ?? [];
	const app = diff.filter((p) => fr2PathClass(p) === "application");
	const recorded = (ctx.paths?.paths ?? []).map((p) => `${p.path}\t${p.class}`);
	const derived = diff.map((p) => `${p}\t${fr2PathClass(p)}`);
	add("fr2-scope", `the code diff since ${FR2_BASE.slice(0, 9)} holds ${FR2_DIFF_PATHS} paths, none of them application code, and matches f39/fix-round-2-paths.json`, diff.length === FR2_DIFF_PATHS && app.length === 0 && sortedJson(recorded) === sortedJson(derived), { paths: FR2_DIFF_PATHS, application: 0 }, { paths: diff.length, application: app, recordedMatches: sortedJson(recorded) === sortedJson(derived) });
	const bi = ctx.buildIdentity ?? {};
	const css = Object.values(bi.compiledCss ?? {});
	const builds = Array.isArray(bi.builds) ? bi.builds : [];
	const trees = builds.map((b) => b.tree);
	const cmp = Array.isArray(bi.comparisons) ? bi.comparisons : [];
	const biOk = css.length >= 3 && css.every((x) => typeof x === "string" && x.length === 64 && x === css[0]) && ["b628eb9f1", "4433ca833", "f8de0175e"].every((t) => trees.includes(t)) && builds.every((b) => b.exit === 0 && b.files > 0 && b.manifestSha256 === builds[0].manifestSha256) && cmp.length >= 2 && cmp.every((x) => x.differingFiles === 0) && (bi.positiveControl?.differingFiles ?? 0) > 0;
	add("fr2-build-identity", "the app build and compiled CSS of b628eb9f1, 4433ca833 (the screenshot and probe evidence) and f8de0175e are identical, and a one-constant change is detected", biOk, "identical, control > 0", { compiledCss: bi.compiledCss ?? MISSING, builds: builds.map((b) => `${b.tree} ${b.manifestSha256?.slice(0, 12)} ${b.files}`), comparisons: cmp, positiveControl: bi.positiveControl ?? MISSING });
	const failedGroups = [...new Set(c.checks.filter((k) => !k.pass).map((k) => k.group))];
	return { mode: "fix-round-2", checks: c.checks, failedGroups, failed: c.checks.filter((k) => !k.pass).length };
}

function readFixRound2Context(dir) {
	const j = (name) => {
		const p = join(dir, name);
		return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null;
	};
	const git = (args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
	const tracked = git(["ls-files"]).split("\n").filter(Boolean);
	const sources = {};
	for (const p of tracked) if (FR2_SOURCE_EXTENSIONS.some((e) => p.endsWith(e)) && existsSync(join(ROOT, p))) sources[p] = readFileSync(join(ROOT, p), "utf8");
	// The import texts are assembled from parts so this file is not counted as an importer.
	const viaAlias = ["from \"#test/utils/", "regexp-source\""].join("");
	const viaSibling = ["from \"./", "regexp-source\""].join("");
	const importsHelper = (path, text) => text.includes(viaAlias) || (path.startsWith("src/test/utils/") && text.includes(viaSibling));
	const codeState = git(["log", "-1", "--format=%H", "--", ".", ":(exclude).planning"]).trim();
	const yaml = createRequire(join(ROOT, "package.json"))("yaml");
	const sweepText = readFileSync(join(ROOT, "scripts/mutation-sweep.sh"), "utf8");
	return {
		unit: j("unit-f39-summary.json"),
		sweep: j("sweep-f39.json"),
		buildIdentity: j("build-identity-f39.json"),
		paths: j("fix-round-2-paths.json"),
		workflow: yaml.parse(readFileSync(join(ROOT, FR2_SWEEP_WORKFLOW), "utf8")),
		sweepRows: sweepText.split("\n").filter((l) => /^\s*mutate\s/.test(l)).length,
		sources,
		mainSources: Object.fromEntries(FR2_MAIN_COPIES.map((p) => [p, gitShow(FR2_MAIN, p)])),
		helperImporters: Object.entries(sources)
			.filter(([p, t]) => p !== FR2_HELPER && importsHelper(p, t))
			.map(([p]) => p),
		diffPaths: git(["diff", "--name-only", FR2_BASE, codeState, "--", ".", ":(exclude).planning"]).split("\n").filter(Boolean),
		exists: (rel) => existsSync(join(ROOT, rel)),
	};
}

// Builds call text for the fixtures without this file holding a scannable call.
const FR2_CALL = [".rep", "lace("].join("");

function fixRound2Fixture() {
	const pass = (path, titles = []) => ({ name: path, status: "passed", numTests: titles.length + 1, numPassed: titles.length + 1, tests: [...titles.map((title) => ({ title, status: "passed" })), { title: `${path} other`, status: "passed" }] });
	const files = [pass(FR2_HELPER_TEST.path, FR2_HELPER_TEST.titles), pass(FR2_SWEEP_TEST.path, FR2_SWEEP_TEST.titles), pass(FR2_WORKFLOW_CONTRACT_TEST.path, FR2_WORKFLOW_CONTRACT_TEST.titles)];
	const named = new Set(files.map((f) => f.name));
	for (const g of FR2_GUARD_TITLES) {
		files.push(pass(g.path, g.titles));
		named.add(g.path);
	}
	for (const t of FR2_HELPER_USERS.flatMap((u) => u.tests)) {
		if (named.has(t)) continue;
		files.push(pass(t));
		named.add(t);
	}
	const complete = `export const e = (s) => s${FR2_CALL}/[.*+?^\${}()|[\\]\\\\]/g, "\\\\$&");\n`;
	const diffPaths = [FR2_SWEEP_WORKFLOW, "scripts/mutation-sweep.sh", FR2_HELPER, ...Array.from({ length: FR2_DIFF_PATHS - 4 }, (_, i) => `src/x/__tests__/t${i}.test.ts`), "tests/e2e/tests/a.spec.ts"];
	const shardRows = [23, 23, 23, 22, 22, 22, 22, 22];
	return {
		unit: { files },
		sweep: {
			rows: 179,
			caught: 179,
			vacuous: 0,
			notApplied: 0,
			restored: true,
			exit: 0,
			shards: shardRows.map((rows, i) => ({ shard: i + 1, of: FR2_SHARDS, rows, caught: rows, vacuous: 0, notApplied: 0, restored: true, exit: 0 })),
			listing: { rows: 179, union: 179, disjoint: true, nonEmpty: true, equalsUnsharded: true, perShard: [...shardRows] },
		},
		buildIdentity: {
			compiledCss: { b628eb9f1: "a".repeat(64), "4433ca833": "a".repeat(64), f8de0175e: "a".repeat(64) },
			builds: ["b628eb9f1", "4433ca833", "f8de0175e"].map((tree) => ({ tree, exit: 0, files: 10, manifestSha256: "b".repeat(64) })),
			comparisons: [{ a: "b628eb9f1", b: "f8de0175e", differingFiles: 0 }, { a: "4433ca833", b: "f8de0175e", differingFiles: 0 }],
			positiveControl: { differingFiles: 3 },
		},
		paths: { paths: diffPaths.map((path) => ({ path, class: fr2PathClass(path) })) },
		workflow: { jobs: { sweep: { "timeout-minutes": FR2_SHARD_TIMEOUT_MINUTES, strategy: { "fail-fast": false, matrix: { shard: [1, 2, 3, 4, 5, 6, 7, 8] } }, env: { SWEEP_SHARD: "${{ matrix.shard }}", SWEEP_SHARDS: "${{ strategy.job-total }}" }, steps: [{ run: "bun install --frozen-lockfile" }, { run: "bash scripts/mutation-sweep.sh" }] } } },
		sweepRows: 179,
		sources: { [FR2_HELPER]: complete, "scripts/reclaim-finalize.ts": complete, ".planning/x/tool.mjs": complete, "src/lib/sanitize.ts": `s${FR2_CALL}/\\\\/g, "\\\\\\\\");\n` },
		mainSources: { "scripts/reclaim-finalize.ts": complete },
		helperImporters: [FR2_HELPER_TEST.path, ...FR2_HELPER_USERS.map((u) => u.path)],
		diffPaths,
		exists: () => true,
	};
}

// One mutation per group; each must fail exactly that group.
const FR2_MUTATIONS = [
	["the helper test fails", "fr2-helper-test", (f) => {
		Object.assign(f.unit.files.find((x) => x.name === FR2_HELPER_TEST.path), { status: "failed", numPassed: 1 });
	}],
	["a guard drops the helper", "fr2-helper-users", (f) => {
		f.helperImporters = f.helperImporters.filter((p) => p !== "src/lib/__tests__/no-deprecated-library-api.test.ts");
	}],
	["a helper module's test fails", "fr2-helper-users", (f) => {
		Object.assign(f.unit.files.find((x) => x.name === "src/app/__tests__/state-fill-contrast.test.ts"), { status: "failed", numPassed: 0 });
	}],
	["a guard's linear-time test removed", "fr2-guard-titles", (f) => {
		const t = f.unit.files.find((x) => x.name === FR2_GUARD_TITLES[1].path);
		t.tests = t.tests.filter((x) => !x.title.includes("linear time"));
	}],
	["the partition proof is gone", "fr2-sweep-partition", (f) => {
		f.unit.files = f.unit.files.filter((x) => x.name !== FR2_SWEEP_TEST.path);
	}],
	["the push-trigger test is gone", "fr2-workflow-contract", (f) => {
		const t = f.unit.files.find((x) => x.name === FR2_WORKFLOW_CONTRACT_TEST.path);
		t.tests = t.tests.filter((x) => !x.title.startsWith("the fixture helpers"));
	}],
	["a shard dropped from the matrix", "fr2-sweep-workflow", (f) => {
		f.workflow.jobs.sweep.strategy.matrix.shard = [1, 2, 3, 4, 5, 6, 7];
	}],
	["fail-fast back on", "fr2-sweep-workflow", (f) => {
		f.workflow.jobs.sweep.strategy["fail-fast"] = true;
	}],
	["a shard loses a row", "fr2-sweep-shards", (f) => {
		f.sweep.shards[7].rows = 21;
		f.sweep.shards[7].caught = 21;
	}],
	["the listing overlaps", "fr2-sweep-shards", (f) => {
		f.sweep.listing.disjoint = false;
	}],
	["a partial class escape", "fr2-escape-complete", (f) => {
		f.sources[".planning/x/tool.mjs"] += `t${FR2_CALL}/[/.]/g, "\\\\$&");\n`;
	}],
	["a single-character escape", ["fr2-escape-complete", "fr2-escape-homes"], (f) => {
		f.sources["src/lib/__tests__/g.test.ts"] = `n${FR2_CALL}/\\$/g, "\\\\$");\n`;
	}],
	["a third escape helper under the test roots", "fr2-escape-homes", (f) => {
		f.sources["src/lib/__tests__/h.test.ts"] = f.sources[FR2_HELPER];
	}],
	["main's copy edited", "fr2-escape-homes", (f) => {
		f.sources["scripts/reclaim-finalize.ts"] += "// edited\n";
	}],
	["the nested comment run is back", "fr2-old-redos", (f) => {
		f.sources["src/components/__tests__/n.test.tsx"] = `const GAP = String.raw\`\\s*(?:\\{\\/\\*${FR2_OLD_REDOS[0][1]}\`;\n`;
	}],
	["an application path in the diff", "fr2-scope", (f) => {
		f.diffPaths[f.diffPaths.length - 1] = "src/components/ui/button.tsx";
	}],
	["the build differs", "fr2-build-identity", (f) => {
		f.buildIdentity.builds[2].manifestSha256 = "c".repeat(64);
	}],
	["the positive control saw nothing", "fr2-build-identity", (f) => {
		f.buildIdentity.positiveControl.differingFiles = 0;
	}],
];

function fixRound2SelfTest(failures) {
	let passed = 0;
	const clean = fixRound2Checks(fixRound2Fixture());
	if (clean.failed === 0) passed++;
	else failures.push(`fix-round-2 clean fixture failed ${JSON.stringify(clean.checks.filter((k) => !k.pass).map((k) => k.name))}`);
	for (const [name, group, mutate] of FR2_MUTATIONS) {
		const f = fixRound2Fixture();
		mutate(f);
		const r = fixRound2Checks(f);
		const want = Array.isArray(group) ? group : [group];
		if (sortedJson(r.failedGroups) === sortedJson(want)) passed++;
		else failures.push(`fix-round-2 "${name}": failed groups ${JSON.stringify(r.failedGroups)}, expected ${JSON.stringify(want)}`);
	}
	return passed;
}

// ---------- CLI ----------

function arg(name) {
	const i = process.argv.indexOf(name);
	return i === -1 ? null : process.argv[i + 1];
}

function readJson(p) {
	return JSON.parse(readFileSync(p, "utf8"));
}

if (process.argv.includes("--self-test")) {
	selfTest();
	process.exit(0);
}

const fixRoundDir = arg("--fix-round-1");
if (fixRoundDir) {
	const out = arg("--out");
	if (!out) {
		console.error("usage: f39-checks.mjs --fix-round-1 <f39-dir> --out <file>");
		process.exit(2);
	}
	const result = fixRoundChecks(readFixRoundContext(fixRoundDir));
	writeFileSync(out, `${JSON.stringify(result, null, "\t")}\n`);
	for (const k of result.checks.filter((x) => !x.pass)) console.error(`fix-round-1 FAIL: ${k.name}: ${JSON.stringify(k.measured).slice(0, 400)}`);
	console.log(`f39-checks (fix-round-1): ${result.checks.length} checks, ${result.failed} failed`);
	process.exit(result.failed === 0 ? 0 : 1);
}

const fixRound2Dir = arg("--fix-round-2");
if (fixRound2Dir) {
	const out = arg("--out");
	if (!out) {
		console.error("usage: f39-checks.mjs --fix-round-2 <f39-dir> --out <file>");
		process.exit(2);
	}
	const result = fixRound2Checks(readFixRound2Context(fixRound2Dir));
	writeFileSync(out, `${JSON.stringify(result, null, "\t")}\n`);
	for (const k of result.checks.filter((x) => !x.pass)) console.error(`fix-round-2 FAIL: ${k.name}: ${JSON.stringify(k.measured).slice(0, 400)}`);
	console.log(`f39-checks (fix-round-2): ${result.checks.length} checks, ${result.failed} failed`);
	process.exit(result.failed === 0 ? 0 : 1);
}

const decisionsPath = arg("--decisions");
const bodyPath = arg("--lint-body");
if (bodyPath) {
	if (!decisionsPath) {
		console.error("usage: f39-checks.mjs --lint-body <md> --decisions <json>");
		process.exit(2);
	}
	const problems = lintBody(readFileSync(bodyPath, "utf8"), readJson(decisionsPath));
	for (const p of problems) console.error(`lint-body: ${p}`);
	console.log(`f39-checks lint-body: ${problems.length} problem(s)`);
	process.exit(problems.length === 0 ? 0 : 1);
}

const outPath = arg("--out");
const probesPath = arg("--probes");
const tokensPath = arg("--tokens");
const probeOnly = process.argv.includes("--probe-only");
if (!decisionsPath || !outPath || (probeOnly && !probesPath)) {
	console.error("usage: f39-checks.mjs --decisions <json> [--probes <json>] [--tokens <json>] --out <file> [--probe-only] [--expect-fail CP-n,...] | --self-test | --lint-body <md> --decisions <json> | --fix-round-1 <f39-dir> --out <file> | --fix-round-2 <f39-dir> --out <file>");
	process.exit(2);
}
const result = run({
	decisions: readJson(decisionsPath),
	probes: probesPath ? readJson(probesPath) : null,
	tokens: tokensPath ? readJson(tokensPath) : null,
	src: diskSource(),
	probeOnly,
	withProbes: Boolean(probesPath),
});
writeFileSync(outPath, `${JSON.stringify(result, null, "\t")}\n`);
const expectFail = arg("--expect-fail");
if (expectFail !== null) {
	const want = expectFail.split(",").filter(Boolean).sort();
	const ok = JSON.stringify(want) === JSON.stringify([...result.failedCps].sort());
	console.log(`f39-checks: failed CPs ${JSON.stringify(result.failedCps)}, expected ${JSON.stringify(want)}: ${ok ? "ok" : "MISMATCH"}`);
	process.exit(ok ? 0 : 1);
}
console.log(`f39-checks (${result.mode}): ${result.checks.length} checks, ${result.failed} failed`);
process.exit(result.failed === 0 ? 0 : 1);
