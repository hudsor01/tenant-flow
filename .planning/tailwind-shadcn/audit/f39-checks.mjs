// CP outcome checker for the 66.2 final plan (66.2-39). Read-only: it reads the f39 CP decision map
// (derived by jq from 66.2-38-CP-DECISIONS.json), component-probe and render-check JSON, files at
// HEAD (from disk) and at a recorded revision (`git show <sha>:<path>`), and writes only --out.
//
// Usage (from the repo root):
//   node .planning/tailwind-shadcn/audit/f39-checks.mjs --decisions <json> [--probes <json>]
//     [--tokens <json>] --out <file> [--probe-only] [--expect-fail <CP-n,...>]
//   node .planning/tailwind-shadcn/audit/f39-checks.mjs --self-test
//   node .planning/tailwind-shadcn/audit/f39-checks.mjs --lint-body <md> --decisions <json>
//
// Output: { mode, checks: [{ cp, choice, name, pass, expected, measured }], failedCps, failed }.
// Exit 1 when failed > 0; under --expect-fail, exit 0 only when exactly the listed CPs fail.
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
import { existsSync, readFileSync, writeFileSync } from "node:fs";
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
			const lacking = tags.filter((t) => !CP3_TOKENS.every((tok) => new RegExp(`(^|[\\s"'\`{])${tok.replace(/[/.]/g, "\\$&")}(?![\\w/-])`).test(t)));
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
	console.error("usage: f39-checks.mjs --decisions <json> [--probes <json>] [--tokens <json>] --out <file> [--probe-only] [--expect-fail CP-n,...] | --self-test | --lint-body <md> --decisions <json>");
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
