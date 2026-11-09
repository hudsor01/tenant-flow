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
//   node .planning/tailwind-shadcn/audit/f39-checks.mjs --fix-round-3 <f39-dir> --out <file>
//   node .planning/tailwind-shadcn/audit/f39-checks.mjs --fix-round-4 <f39-dir> --out <file>
//   node .planning/tailwind-shadcn/audit/f39-checks.mjs --escape-scan <rev>
//
// Output: { mode, checks: [{ cp, choice, name, pass, expected, measured }], failedCps, failed }.
// Exit 1 when failed > 0; under --expect-fail, exit 0 only when exactly the listed CPs fail.
//
// --fix-round-1 (the re-freeze after perfect-PR cycle 1) checks what fix round 1 must keep, so a
// regression of any of it fails this checker: the six T-1 contract tokens that are allowed to be
// dead and nothing else (M8; four since fix round 1, six since the re-freeze after fix round 4),
// the light-only tokens in use (M6), the token deltas from FINAL (fix round 1's two light ones and
// fix round 4's four), the two changed utilities, every guard test the fix round added (present and
// passing in the f39 unit summary), every UI-SPEC VD row VD-01..VD-186 and VD-19b mapped to passing
// evidence (fix round 3 added VD-130..VD-151, fix round 4 VD-152..VD-186), the migration replay
// (358 files since fix round 4's move-out migration, every gate exit 0), the mutation sweep (185
// rows since fix round 3, 0 vacuous, 0 not applied), the Edge deploy list (exactly the functions
// whose bundle differs), the screenshot classification and the component-probe differences against
// the previous FROZEN head's same-session run (4476e6450 at the re-freeze after fix round 1,
// 36972318f after fix round 3, 3977aa58d after fix round 4). Inputs: the f39 JSON files named in
// readFixRoundContext, the UI-SPEC, git ls-files.
//
// --fix-round-2 (the re-freeze after CI failed on bc54b045a and f8de0175e) checks what fix round 2
// must keep: the regexp-source helper's test, every module that imports the helper (the set must
// equal the recorded list) and the guards' new linear-time and literal-name tests, the sweep's
// partition proof (scripts/mutation-sweep.test.ts) and the workflow-contract test, the sharded
// workflow (8 shards, fail-fast false, the shard and matrix size handed to each job), the sweep
// result unsharded and per shard (rows summing to every row, the listing a disjoint cover), the
// CodeQL-clean state as far as a local scan can decide it (every escape-style `.replace` in a
// tracked JS/TS file escapes every regex metacharacter, no single-metacharacter escape, and, since
// the re-freeze after fix round 3, no string-pattern escape, `.replace("<one character>", "\\…")`
// or `.replaceAll(…)`, whose result reaches `new RegExp`; escape helpers under the test roots live
// only in the shared helper and main's reclaim-finalize.ts, and neither old ReDoS form is back),
// the scope of fix round 2's own code diff (b628eb9f1..f8de0175e: no application path; fix round
// 3's diff is --fix-round-3's) and the build identity that carried the screenshot, probe and CSP
// evidence forward at that re-freeze. Inputs: the f39 JSON files named in readFixRound2Context,
// the sweep workflow, git ls-files and every tracked JS/TS file on disk.
//
// --fix-round-3 (the re-freeze after perfect-PR cycle 2 and fix round 3, a full re-run) checks
// what fix round 3 must keep: every guard test its parts added or widened (present, passing, with
// each recorded title and the code marker of its widening), that its code state b7f25511b is in
// the history of the current one, that each re-measured evidence file was measured on the current
// code state (the round-3 run's carry from 852158ab4 still accepted only while the inputs are
// unchanged), the mutation sweep at 185 rows (shards 24 and 23 x 7), the migration replay of every
// file, the Deno checks (17 functions) and in-process test counts, the Edge redeploy list (the
// functions whose bundle differs, and the PR body's deploy command naming exactly them), rule
// parity's fix-round-3 keys each with its commit and VD row, the screenshot and probe baselines,
// the PR body's fix-round-3 section and VD-130..VD-151 table, and round 3's own code diff
// f8de0175e..b7f25511b matching f39/fix-round-3-paths.json. Since the re-freeze after fix round 4
// the counts and the state a later round moved on purpose (the replay's 358 files, export-report's
// 17 Deno tests, the five-function redeploy list, the current code state and its 3977aa58d
// baseline) are read from the current freeze's constants (FR4_*), as --fix-round-1 reads the
// current VD range; heading-block-paragraph-margin.test.ts is retired (fix round 4's
// paragraph-base-margin.test.ts replaced it; --fix-round-4 pins that). Inputs: the f39 JSON files
// named in readFixRound3Context, the UI-SPEC, the PR body, git and the guard test sources on disk.
//
// --fix-round-4 (the re-freeze after perfect-PR cycle 3 and fix round 4, a full re-run) checks
// what fix round 4 must keep: every unit test file its parts added (67, present and passing with
// their recorded titles), the guards it widened (their new titles or code markers), the E2E specs
// and helpers it added or widened (passing in the CI set, with their test titles in the source),
// the code state 7f6fcc67c and the freshness of every evidence file on it (the screenshot and probe
// diffs against a same-session 3977aa58d), the sweep at 185 rows, the replay at 358 files with the
// move-out migration among them and kept out of the PR body's apply list (production holds it),
// the Deno counts, the five-function redeploy list, rule parity's fix-round-4 keys and its
// compiled-CSS changes outside the utilities each with its commit and VD row, the CSP headers equal
// to the previous freeze's, the PR body's fix-round-4 section (after fix round 3, no placeholder,
// at most 64,500 bytes), and the code diff b7f25511b..7f6fcc67c matching f39/fix-round-4-paths.json.
// Inputs: the f39 JSON files named in readFixRound4Context, the PR body, git and sources on disk.
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
	passed += fixRound3SelfTest(failures);
	passed += fixRound4SelfTest(failures);
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
// success-foreground in 8446d6bbf (VD-55). Main-session decision 2026-11-09 (the re-freeze after
// fix round 4): option B covers warning-foreground and info-foreground too, the same T-1
// fill/foreground pairs in the same table; their last uses (text-warning-foreground,
// text-info-foreground on tinted notices) left in e30353f74 (Part 5b), which moved notice text to
// the AA -text companions, and the on-fill tokens stay in the contract. The audit's dead list must
// EQUAL this list: a seventh dead var fails, and so does one of these six regaining a use (then
// remove it from this list).
const FR_ALLOWED_DEAD_THEME_VARS = ["--color-chart-2", "--color-chart-3", "--color-chart-5", "--color-success-foreground", "--color-warning-foreground", "--color-info-foreground"];
// M6 after VD-53: the mode-independent (light-only) color tokens still in use (FINAL: chart-1..5).
const FR_LIGHT_ONLY_IN_USE = ["--color-chart-1", "--color-chart-4"];
// The token values that differ from FINAL in the 71-token list (baseline/token-list.json): VD-59
// (261e7d893) and VD-38 (fa9e89502), light only; then fix round 4's af72de1aa (VD-160): light
// info-text (L 0.48 -> 0.44), light success-text (L 0.5 -> 0.47) and --input in both themes
// (L 0.8 -> 0.615 light, 0.3 -> 0.515 dark). The same commit's base link hover (primary at 80% ->
// primary-text) is a base-rule change in the compiled CSS, not a token, and the opaque focus rings
// are class changes (rule parity, fixRound4).
const FR_TOKEN_DELTAS = {
	"light accent-foreground": [27, 33, 30, 1],
	"light destructive-foreground": [253, 252, 247, 1],
	"light info-text": [0, 87, 165, 1],
	"light success-text": [0, 114, 56, 1],
	"light input": [125, 134, 141, 1],
	"dark input": [100, 104, 109, 1],
};
// The utilities present in FINAL and here whose CSS changed: VD-69 (ed7db2d48, hover parts removed).
const FR_UTILITY_CHANGED = ["showcase-card", "testimonial-card"];
// 357 through fix round 3; fix round 4 adds 20261109141151_tenants_move_out_record.sql (applied to
// production by the main session on 2026-11-09, owner-approved).
const FR_EXPECTED_MIGRATIONS = 358;
// 179 rows at the re-freeze after fix round 1; fix round 3 added 6 (Part 1: F138's four, the row
// pinning 'terminated' in the occupancy model, the row for the CLI's owner-figures dispatch).
const FR_EXPECTED_SWEEP_ROWS = 185;
const FR_REPLAY_GATES = ["applied", "no-network", "seed", "test-cast", "billing-insights", "property-performance", "owner-figures", "blog-banlist"];
// VD-01..VD-129 (fix round 1), VD-130..VD-151 (fix round 3; VD-151 is Part 6d) and VD-152..VD-186
// (fix round 4; VD-186 is Part 8o), plus VD-19b.
const FR_VD_LAST = 186;
const FR_VD_IDS = [...Array.from({ length: FR_VD_LAST }, (_, i) => `VD-${String(i + 1).padStart(2, "0")}`), "VD-19b"];
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
		// Fix round 1's classification (4476e6450 -> 4433ca833), kept when a later round re-classifies
		// against its own previous head: a row whose surface a later round left alone keeps it.
		for (const s of ctx.screensRound1 ?? []) {
			if (s.class === "intended" && Array.isArray(s.vd) && s.vd.includes(id)) ev.push({ kind: "screenshot (fix round 1)", ref: `${s.set}/${s.capture}`, pass: true });
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
	add("tokens", "tokens differ from FINAL in exactly the fix-round deltas (VD-38, VD-59; fix round 4's VD-160)",sortedJson(Object.keys(deltas)) === sortedJson(want) && want.every((k) => colorWithin(deltas[k], FR_TOKEN_DELTAS[k])), FR_TOKEN_DELTAS, deltas);
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
	add("vd-ids", `UI-SPEC VD rows are exactly VD-01..VD-${FR_VD_LAST} and VD-19b, once each`, sortedJson(ids) === sortedJson(FR_VD_IDS), FR_VD_IDS.length,{ count: ids.length, missing: FR_VD_IDS.filter((x) => !ids.includes(x)), extra: ids.filter((x, i) => !FR_VD_IDS.includes(x) || ids.indexOf(x) !== i) });
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
	add("probes", `every measured component-probe difference from the ${ctx.probesDiff?.baseline ?? "previous FROZEN"} same-session run is intended, with its commit and VD row or finding`,Array.isArray(ctx.probesDiff?.diffs) && badProbes.length === 0, "0 unattributed", { diffs: pd.length, bad: badProbes.map((x) => `${x.id} ${x.field}`) });
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
		screensRound1: j("screens-diff-fix-round-1.json"),
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
		report: { dead: { themeVars: FR_ALLOWED_DEAD_THEME_VARS.length, customProperties: 0, keyframes: 0, plainClassSelectors: 0, utilities: "0/42" }, lightOnlyColorTokensInUse: ["--color-chart-1: x", "--color-chart-4: y"], noncanonical: { firstPartyFiles: 0 } },
		dead: { deadTheme: FR_ALLOWED_DEAD_THEME_VARS.map((name) => ({ name })) },
		finalTokens: { light: { "accent-foreground": [243, 251, 246, 1], "destructive-foreground": [251, 248, 241, 1], "info-text": [0, 100, 178, 1], "success-text": [0, 123, 64, 1], input: [182, 191, 199, 1], border: [210, 216, 222, 1] }, dark: { input: [42, 46, 51, 1], border: [40, 44, 50, 1] } },
		tokens: { light: { "accent-foreground": [27, 33, 30, 1], "destructive-foreground": [253, 252, 247, 1], "info-text": [0, 87, 165, 1], "success-text": [0, 114, 56, 1], input: [125, 134, 141, 1], border: [210, 216, 222, 1] }, dark: { input: [100, 104, 109, 1], border: [40, 44, 50, 1] } },
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

// One mutation per group; each must fail exactly that group. The first three are the M8 negative
// controls the decision requires: a seventh dead var, and one of the six regaining a use (one of
// fix round 1's four, and one of the two the re-freeze after fix round 4 added).
const FR_MUTATIONS = [
	["seventh dead theme var", "M8", (f) => {
		f.dead.deadTheme.push({ name: "--color-popover-foreground" });
		f.report.dead.themeVars = 7;
	}],
	["an allowed var regains a use", "M8", (f) => {
		f.dead.deadTheme = f.dead.deadTheme.filter((v) => v.name !== "--color-chart-5");
		f.report.dead.themeVars = 5;
	}],
	["warning-foreground regains a use", "M8", (f) => {
		f.dead.deadTheme = f.dead.deadTheme.filter((v) => v.name !== "--color-warning-foreground");
		f.report.dead.themeVars = 5;
	}],
	["a round-4 token delta reverted", "tokens", (f) => {
		f.tokens.light["success-text"] = [0, 123, 64, 1];
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
		f.spec = `${f.spec}\n| VD-${FR_VD_LAST + 1} | 39 | s | b | src | \`vd-proof.test.ts\` | — |`;
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
// job hit timeout-minutes 45 at row 155 of 179). The code diff FR2_BASE..FR2_CODE_STATE holds
// tests, test helpers, E2E specs and helpers, the sweep script and its workflow, and nothing the
// app builds. FR2_CODE_STATE is fixed: fix round 3 (FR2_CODE_STATE..b7f25511b) changed application
// code on purpose and is checked by --fix-round-3, so this scope check reads round 2's own range.
const FR2_BASE = "b628eb9f1b0c68e8d2d48cfd6660921b0660fef5";
const FR2_CODE_STATE = "f8de0175e3e2c76e1429956ab4f3d5c675a0789f";
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
// drops the helper for a local escape fails here as well as in the escape scan. Fix round 3's
// 852158ab4 added group-markers.test.ts and ids-not-shown-as-text.test.tsx (each had a partial
// escape of its own: a first-occurrence "/" and a "$"-only class).
const FR2_HELPER_USERS = [
	...[
		"scripts/reclaim-finalize.test.ts",
		"src/app/__tests__/design-token-drift.test.ts",
		"src/app/__tests__/global-error-fonts.test.tsx",
		"src/app/__tests__/marketing-home.test.tsx",
		"src/components/__tests__/group-markers.test.ts",
		"src/components/__tests__/ids-not-shown-as-text.test.tsx",
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
// The replace calls the escape scan reads, assembled from parts so this file holds no scannable call.
const FR2_REPLACE_CALLS = [[".rep", "lace("].join(""), [".rep", "laceAll("].join("")];

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

// Every escape-style replace call in `text`, `.replace(` and `.replaceAll(` alike:
// - a regex literal as the first argument and a string whose text starts with an escaped backslash
//   as the second. A one-class pattern with the whole-match replacement is a class escape, complete
//   when its class holds every metacharacter; a single escaped metacharacter other than the
//   backslash (the `.` and `$` forms CodeQL flagged) is partial. A backslash-only escape is the
//   first step of string-literal escaping, not a regex escape.
// - (the re-freeze after fix round 3) a string literal of one character as the first argument and
//   a replacement that starts with a backslash: a string-pattern escape. `.replace` with a string
//   replaces only the first occurrence and `.replaceAll` only that one character, so it is always
//   partial; it counts when its result reaches `new RegExp` (fr2StringEscapeSites), which a
//   PostgREST or CSV quote escape never does.
// A linear scan: indexOf and single passes, no backtracking pattern.
function fr2EscapeSites(text) {
	const sites = [];
	for (const call of FR2_REPLACE_CALLS) {
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
	}
	for (const s of fr2StringEscapeSites(text)) if (s.reachesRegExp) sites.push(s);
	return sites.sort((a, b) => a.line - b.line);
}

// The value of a string literal's raw text when it is one character: `x`, or a one-character escape
// (`\\` is a backslash, `\/` a slash, `\$` a dollar). Anything longer is null.
function fr2OneChar(raw) {
	if (raw.length === 1 && raw !== "\\") return raw;
	if (raw.length === 2 && raw[0] === "\\") return raw[1];
	return null;
}

// The index just past the string literal opening at text[k] (a ' or "), stopping at a newline so a
// quote inside a regex literal cannot run the scan away.
function fr2SkipString(text, k) {
	const quote = text[k];
	for (k++; k < text.length; k++) {
		if (text[k] === "\\") k++;
		else if (text[k] === quote || text[k] === "\n") return k;
	}
	return k;
}

// The index of the backtick closing the template literal opening at text[k]; `${…}` is code again.
function fr2SkipTemplate(text, k) {
	for (k++; k < text.length; k++) {
		if (text[k] === "\\") k++;
		else if (text[k] === "`") return k;
		else if (text[k] === "$" && text[k + 1] === "{") k = fr2SkipCode(text, k + 2, "}");
	}
	return k;
}

// The index of the `close` (")" or "}") that ends the code starting at text[k] at depth 0, skipping
// strings, templates and comments.
function fr2SkipCode(text, k, close) {
	const open = close === ")" ? "(" : "{";
	let depth = 0;
	for (; k < text.length; k++) {
		const ch = text[k];
		if (ch === '"' || ch === "'") k = fr2SkipString(text, k);
		else if (ch === "`") k = fr2SkipTemplate(text, k);
		else if (ch === "/" && text[k + 1] === "/") k = text.indexOf("\n", k) === -1 ? text.length : text.indexOf("\n", k);
		else if (ch === "/" && text[k + 1] === "*") k = text.indexOf("*/", k + 2) === -1 ? text.length : text.indexOf("*/", k + 2) + 1;
		else if (ch === open) depth++;
		else if (ch === close) {
			if (depth === 0) return k;
			depth--;
		}
	}
	return k;
}

// The [start, end) span of each `new RegExp(` call's arguments.
function fr2RegExpSpans(text) {
	const spans = [];
	const needle = ["new Reg", "Exp("].join("");
	for (let i = text.indexOf(needle); i !== -1; i = text.indexOf(needle, i + needle.length)) {
		const start = i + needle.length;
		spans.push([start, fr2SkipCode(text, start, ")")]);
	}
	return spans;
}

const FR2_IDENT_START = /[A-Za-z_$]/;
const FR2_IDENT = /[\w$]/;

// Whether `name` occurs in `text` as a whole identifier (not after a `.`, not inside a longer name).
function fr2HasIdentifier(text, name) {
	for (let i = text.indexOf(name); i !== -1; i = text.indexOf(name, i + 1)) {
		const before = text[i - 1] ?? "";
		const after = text[i + name.length] ?? "";
		if (!FR2_IDENT.test(before) && before !== "." && !FR2_IDENT.test(after)) return true;
	}
	return false;
}

// The name the call at `index` is bound to: the declared name when its line declares one
// (`const n = …`, `const esc = (s) => …`), or the enclosing function's name when the line returns
// it (`function esc(s) {` / `const esc = (s) => {` on an earlier line). Null when neither.
function fr2BoundName(text, index) {
	const lineStart = text.lastIndexOf("\n", index - 1) + 1;
	const head = text.slice(lineStart, index).trimStart();
	const decl = /^(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/.exec(head);
	if (decl) return decl[1];
	if (!/^return\b/.test(head)) return null;
	let name = null;
	for (const m of text.slice(0, lineStart).matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(|\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\(|function\b)/g)) name = m[1] ?? m[2];
	return name;
}

// Every string-pattern escape-style replace: `.replace("<c>", "\…")` / `.replaceAll("<c>", "\…")`
// with one character c, and whether its result reaches `new RegExp`: the call sits inside a
// `new RegExp(` argument list, or the name it is bound to (fr2BoundName) is read there.
function fr2StringEscapeSites(text) {
	const out = [];
	let spans = null;
	for (const call of FR2_REPLACE_CALLS) {
		for (let i = text.indexOf(call); i !== -1; i = text.indexOf(call, i + call.length)) {
			let k = i + call.length;
			while (FR2_WS.has(text[k])) k++;
			if (text[k] !== '"' && text[k] !== "'" && text[k] !== "`") continue;
			const patternRaw = fr2Literal(text, k);
			if (patternRaw === null) continue;
			const c = fr2OneChar(patternRaw);
			if (c === null) continue;
			k += patternRaw.length + 2;
			while (FR2_WS.has(text[k])) k++;
			if (text[k] !== ",") continue;
			for (k++; FR2_WS.has(text[k]); k++);
			if (text[k] !== '"' && text[k] !== "'" && text[k] !== "`") continue;
			const replacement = fr2Literal(text, k);
			if (replacement === null || !replacement.startsWith("\\\\")) continue;
			spans ??= fr2RegExpSpans(text);
			const inside = spans.some(([a, b]) => i >= a && i < b);
			const name = inside ? null : fr2BoundName(text, i);
			const viaName = name !== null && spans.some(([a, b]) => fr2HasIdentifier(text.slice(a, b), name));
			const line = text.slice(0, i).split("\n").length;
			out.push({ line, kind: "string", body: `${call}${JSON.stringify(c)})`, complete: false, missing: [...FR2_METACHARS].filter((m) => m !== c).join(""), reachesRegExp: inside || viaName, via: inside ? "inside new RegExp" : viaName ? `through ${name}` : null });
		}
	}
	return out;
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
	const stringSites = Object.entries(ctx.sources ?? {}).flatMap(([path, text]) => fr2StringEscapeSites(text).map((s) => ({ path, ...s })));
	add("fr2-escape-complete", "every escape-style replace in a tracked JS/TS file escapes every regex metacharacter, and no string-pattern escape reaches new RegExp", Object.keys(ctx.sources ?? {}).length > 0 && partial.length === 0, "0 partial", { sites: sites.length, partial: partial.map((s) => `${s.path}:${s.line} ${s.kind} ${s.body} (missing ${s.missing})${s.via ? `, ${s.via}` : ""}`), stringPatternEscapes: { reachingRegExp: stringSites.filter((s) => s.reachesRegExp).length, notReaching: stringSites.filter((s) => !s.reachesRegExp).map((s) => `${s.path}:${s.line} ${s.body}`) } });
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
	add("fr2-scope", `fix round 2's code diff ${FR2_BASE.slice(0, 9)}..${FR2_CODE_STATE.slice(0, 9)} holds ${FR2_DIFF_PATHS} paths, none of them application code, and matches f39/fix-round-2-paths.json`, diff.length === FR2_DIFF_PATHS && app.length === 0 && sortedJson(recorded) === sortedJson(derived), { paths: FR2_DIFF_PATHS, application: 0 }, { paths: diff.length, application: app, recordedMatches: sortedJson(recorded) === sortedJson(derived) });
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
		diffPaths: git(["diff", "--name-only", FR2_BASE, FR2_CODE_STATE, "--", ".", ":(exclude).planning"]).split("\n").filter(Boolean),
		exists: (rel) => existsSync(join(ROOT, rel)),
	};
}

// Builds call text for the fixtures without this file holding a scannable call.
const FR2_CALL = [".rep", "lace("].join("");
const FR2_CALL_ALL = [".rep", "laceAll("].join("");
const FR2_NEW_REGEXP = ["new Reg", "Exp("].join("");
// Fixture texts for the string-pattern form (the re-freeze after fix round 3). The first is
// group-markers.test.ts's site at ec7353b2d: a first-occurrence "/" escape inside new RegExp.
const FR2_STRING_IN_REGEXP = `const re = ${FR2_NEW_REGEXP}\`group-[\\\\w-]+\${name${FR2_CALL}"/", "\\\\/")}:\`);\n`;
const FR2_STRING_THROUGH_NAME = `const n = s${FR2_CALL_ALL}".", "\\\\.");\nconst re = ${FR2_NEW_REGEXP}n);\n`;
const FR2_STRING_THROUGH_FUNCTION = `function esc(s) {\n\treturn s${FR2_CALL}"$", "\\\\$");\n}\nconst re = ${FR2_NEW_REGEXP}\`^\${esc(x)}\`);\n`;

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
		sources: { [FR2_HELPER]: complete, "scripts/reclaim-finalize.ts": complete, ".planning/x/tool.mjs": complete, "src/lib/sanitize.ts": `s${FR2_CALL}/\\\\/g, "\\\\\\\\");\n`, "src/lib/csv-quote.ts": `v${FR2_CALL_ALL}'"', '\\\\"');\nconst re = ${FR2_NEW_REGEXP}v${FR2_CALL}"a", "b"));\n` },
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
	["a regex-literal escape through replaceAll", ["fr2-escape-complete", "fr2-escape-homes"], (f) => {
		f.sources["src/lib/__tests__/ra.test.ts"] = `n${FR2_CALL_ALL}/\\$/g, "\\\\$");\n`;
	}],
	["a first-occurrence string escape inside new RegExp (group-markers at ec7353b2d)", ["fr2-escape-complete", "fr2-escape-homes"], (f) => {
		f.sources["src/components/__tests__/gm.test.ts"] = FR2_STRING_IN_REGEXP;
	}],
	["a replaceAll string escape bound to a name new RegExp reads", ["fr2-escape-complete", "fr2-escape-homes"], (f) => {
		f.sources["src/lib/__tests__/sn.test.ts"] = FR2_STRING_THROUGH_NAME;
	}],
	["a string escape returned by a function new RegExp calls", ["fr2-escape-complete", "fr2-escape-homes"], (f) => {
		f.sources["scripts/sf.test.ts"] = FR2_STRING_THROUGH_FUNCTION;
	}],
	["a string escape into new RegExp outside the test roots", "fr2-escape-complete", (f) => {
		f.sources[".planning/x/tool2.mjs"] = FR2_STRING_IN_REGEXP;
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

// ---------- --fix-round-3 ----------

// Fix round 3 answers perfect-PR cycle 2 (139 findings on 36972318f, code state f8de0175e): Parts 1
// to 8 plus 6b, 6c and 7b, then 852158ab4 (round 3's two guard names through the shared regexp
// helper) and Part 6d (5ab6b39e3, b7f25511b: the tour step kept inside the viewport, after this
// re-freeze's second run found step 1's footer off screen at 1280x800). It changed application
// code, migrations, replay scripts, Edge sources and vendored ui files, so the re-freeze re-ran every
// step; this mode pins what that run must keep.
const FR3_PREV_FROZEN = "36972318f30401edad3831ea624b8e281f73c3aa";
const FR3_BASE = "f8de0175e3e2c76e1429956ab4f3d5c675a0789f";
const FR3_CODE_STATE = "b7f25511b600b9cf1edd50bc56c41de55e02f29a";
// The sweep, the replay, the Deno checks and the Edge bundles were measured on 852158ab4; Part 6d
// changed none of their inputs (FR3_FRESH), so they count as measured on the code state only while
// `git diff --quiet FR3_MEASURED_EARLIER FR3_CODE_STATE -- <inputs>` holds.
const FR3_MEASURED_EARLIER = "852158ab4608087800ea3495a1de7a5ceed2715b";
const FR3_SWEEP_ROWS = 185;
const FR3_SHARD_ROWS = [24, 23, 23, 23, 23, 23, 23, 23];
// 357 at round 3's freeze; the replay check reads the current count (FR_EXPECTED_MIGRATIONS, 358
// since fix round 4), because a later round adds files on purpose.
const FR3_MIGRATIONS = 357;
const FR3_FUNCTIONS = 17;
// The functions whose `deno bundle` differed between d9c7329f0 and round 3's code state (round 3's
// record); the edge check reads the current list (FR4_DEPLOY), which fix round 4 extended.
const FR3_DEPLOY = ["export-report", "generate-pdf", "lease-signature", "n8n-blog-ingest"];
// The in-process Deno tests (CLAUDE.md's four, Part 4's export-report and generate-pdf) and their
// counts at round 3's code state (the deno check reads the current counts, FR4_DENO_TESTS).
const FR3_DENO_TESTS = { "send-lease-reminders-test.ts": 25, "lease-signature-metering-test.ts": 5, "lease-signing-test.ts": 12, "rate-limit-sentry-test.ts": 2, "export-report-test.ts": 16, "generate-pdf-test.ts": 9 };
const FR3_PR_BODY = ".planning/phases/66.2-tailwind-v4-and-shadcn-ui-canonical-remediation/66.2-PR-BODY.md";
const FR3_SECTION = "## Fix round 3 (after perfect-PR cycle 2)";
// Fix round 3's rows end at VD-151 (fix round 4 continues at VD-152, outside this table).
const FR3_VD_LAST = 151;
const FR3_VD_IDS = Array.from({ length: FR3_VD_LAST - 129 }, (_, i) => `VD-${130 + i}`);
// Every guard test fix round 3's parts added or widened (the part reports), with every title it
// must still carry and, for a widened guard, a code marker of the widening (read from disk).
// Re-freeze after fix round 4: heading-block-paragraph-margin.test.ts (Part 6b, G2h) is retired:
// fix round 4's Part 6 deleted it for paragraph-base-margin.test.ts (e86105e85), which covers its
// shapes and more and which --fix-round-4 pins. Two titles were widened on purpose: the cache
// buster's (v8 in 8f5556028, v9 in bf076f8e7) and newestRecord's (a two-row fixture, 96b15a1fb).
const FR3_GUARD_TESTS = [
	{ path: "src/hooks/api/__tests__/rent-ledger-invalidation.test.tsx", part: "2 (F107)", titles: ["a rent-ledger write invalidates every ledger-fed query recording a receipt", "a rent-ledger write invalidates every ledger-fed query adding a line", "a rent-ledger write invalidates every ledger-fed query reversing an entry", "a rent-ledger write invalidates every ledger-fed query starting tracking, which also refreshes the lease", "the ledger readers the fan-out covers names every module in src/hooks/api that reads the ledger"] },
	{ path: "src/hooks/api/__tests__/data-layer-callers.test.ts", part: "2 (OD-4, nested members)", titles: ["src/hooks/api has no code without a production caller examines the data layer (the sweep is not vacuous)", "src/hooks/api has no code without a production caller every hook, leaf, key entry and mutation factory is called from production code"], markers: ["const nestedBody = objectBody(text, nestedOpen);"] },
	{ path: "src/types/__tests__/api-contracts-exports-imported.test.ts", part: "7b", titles: ["src/types/api-contracts.ts exports only what another file imports leaves no export without an importer", "src/types/api-contracts.ts exports only what another file imports flags an export no file imports, and counts alias, relative and multi-line imports"] },
	{ path: "src/components/__tests__/list-base-rule-neutralized.test.ts", part: "7b", titles: ["every list cancels the base ul, ol and li rules rests on the globals.css rules it guards against", "every list cancels the base ul, ol and li rules leaves no open list outside the deferred and intended files", "every list cancels the base ul, ol and li rules reads both className forms and flags each open value"] },
	{ path: "src/components/__tests__/billing-auth-lists-base-rules.test.tsx", part: "7b", titles: ["the billing, auth and marketing lists cancel the base list rules the password checklist", "the billing, auth and marketing lists cancel the base list rules the upgrade dialog's gained features and its closing note", "the billing, auth and marketing lists cancel the base list rules an expiring lease's tenant and property lines"] },
	{ path: "src/components/ui/__tests__/button-caller-states.test.ts", part: "5 (OD-2)", titles: ["a caller's Button colors hold in both themes (66.2-39 F7) flags an untwinned caller class and passes a twinned one (fixtures)", "a caller's Button colors hold in both themes (66.2-39 F7) flags a state color on a Slot child and passes its layout (fixtures)", "a caller's Button colors hold in both themes (66.2-39 F7) leaves a Slot child's own classes free of state colors in shipped src", "a caller's Button colors hold in both themes (66.2-39 F7) leaves no caller class to a variant's dark class in shipped src"] },
	{ path: "src/app/__tests__/state-fill-contrast.test.ts", part: "5 (merged classes)", titles: ["state fills keep their labels at 4.5:1 (66.2-39 fix round 1, part F) measures every state pair in shipped src", "state fills keep their labels at 4.5:1 (66.2-39 fix round 1, part F) leaves no label under 4.5:1 in any state, either theme", "state fills keep their labels at 4.5:1 (66.2-39 fix round 1, part F) reads the pairs the way the cascade paints them (fixtures)"], markers: ['import { buttonClasses, buttonSites } from "#test/utils/button-sites";'] },
	{ path: "src/components/ui/__tests__/button-link-base-rule.test.tsx", part: "5 (OD-3)", titles: ["the base anchor rules pass a Button-styled link by the default variant", "the base anchor rules pass a Button-styled link by the ghost variant", "the base anchor rules pass a Button-styled link by the link variant", "the base anchor rules pass a Button-styled link by and still style a plain text link"] },
	{ path: "src/components/__tests__/no-hover-on-static-elements.test.ts", part: "5 (F56, by driver)", titles: ["hover affordances sit on controls flags a static card and passes a control", "hover affordances sit on controls finds none outside the reviewed controls-by-context", "hover affordances sit on controls keeps every reviewed entry live"], markers: ["const drivers = new Set<Node>();"] },
	{ path: "src/components/__tests__/group-markers.test.ts", part: "5 (F66)", titles: ["group markers have a consumer (66.2-39 fix round 3, F66) flags a marker nothing reads and passes one something does (fixtures)", "group markers have a consumer (66.2-39 fix round 3, F66) leaves no orphaned marker in the swept files"], markers: ["escapeRegExp(name)"] },
	{ path: "src/components/ui/__tests__/chart-recharts-classes.test.tsx", part: "6c", titles: ["ChartContainer's recharts rules against recharts 3.10.1 paints every axis tick label with the muted-foreground rule", "ChartContainer's recharts rules against recharts 3.10.1 reaches what each other rule is written for"] },
	{ path: "src/components/__tests__/ids-not-shown-as-text.test.tsx", part: "6c (names, _id columns, foreign keys)", titles: ["no id is shown as text renders no id as a JSX child, whole or cut", "no id is shown as text collects the names the UI gives an id (the name scan is not vacuous)", "no id is shown as text follows an id through a name into JSX (planted fixture)", "no id is shown as text catches the shapes it names (positive controls)"], markers: ["const FOREIGN_KEY_COLUMNS = [", "escapeRegExp(name)"] },
	{ path: "src/components/maintenance/__tests__/maintenance-list-names.test.tsx", part: "6c", titles: ["the maintenance page names each request's property and unit prints them on every board card, never the unit's id", "the maintenance page names each request's property and unit prints them in the table's Location column", "the maintenance page names each request's property and unit finds a request by its property's name"] },
	{ path: "src/components/leases/detail/__tests__/lease-details-embeds.test.tsx", part: "7", titles: ["the lease page reads its tenant and unit from the lease names the 51st tenant and shows the 51st unit on the Details tab", "the lease page reads its tenant and unit from the lease links the 51st unit from the sidebar", "the lease page reads its tenant and unit from the lease selects both embeds and maps them onto the lease"] },
	{ path: "src/components/leases/__tests__/lease-edit-unit-preselect.test.tsx", part: "7, 7b", titles: ["the lease edit page opens on the lease's property and unit", "the lease edit page names the lease's tenant, property and unit when the capped pickers leave them out"] },
	{ path: "src/components/__tests__/card-padding-v4.test.tsx", part: "6b (G4)", titles: ["cards pad as the v4 Card does the lease ledger's balance tiles: 16px all round", "cards pad as the v4 Card does the lease details card: the Card's own 24px, nothing added", "cards pad as the v4 Card does the signature status error: 16px above and below its line"] },
	{ path: "src/components/leases/detail/__tests__/lease-card-padding.test.tsx", part: "6b (G4)", titles: ["the lease page's cards pads each metric tile 16px all round", "the lease page's cards pads the load-error card with the Card's own 24px"] },
	{ path: "src/app/(owner)/reports/__tests__/report-tile-spacing.test.tsx", part: "5 (Part 3's extras)", titles: ["report tiles hold their declared spacing cash flow's activity tiles", "report tiles hold their declared spacing the tax documents' summary cards and vendor rows", "report tiles hold their declared spacing the year-end summary cards"] },
	{ path: "src/lib/reports/__tests__/report-data-notes.test.ts", part: "3 (F121, F122)", titles: ["each table says what it lists when empty the period reports", "each fallback's note is under the section its read feeds executive: a failed occupancy read notes Key Metrics, not the rent table", "each fallback's note is under the section its read feeds maintenance: a failed read notes the zeros and each empty table, never 'does not report'"] },
	{ path: "scripts/mutation-sweep.test.ts", part: "1 (F102, the sweep section guard)", titles: ["the mutation sweep's shards puts each row under its own module's section", "the mutation sweep's shards splits the rows into disjoint, non-empty shards whose union is every row"] },
	{ path: "scripts/migration-replay-assertions.test.ts", part: "1 (F97, F138, OD-1)", titles: ["the assertions module's exports exports only what a script beside it imports", "assertOwnerFiguresComputed fails when the dashboard's series count only the leases active today", "expectedOwnerFigures draws the 30-day series from T-29 to T and the 6-month one to M0"] },
	{ path: "tests/e2e/lib/__tests__/e2e-support-exports-have-callers.test.ts", part: "7 (F84, git ls-files)", titles: ["Playwright support modules export only what is imported (66.2-39 fix round 1, part F) leaves no support-module export without an importer", "Playwright support modules export only what is imported (66.2-39 fix round 1, part F) flags an uncalled export and passes every import form"], markers: ['execFileSync("git", ["ls-files", "-z"]'] },
	{ path: "tests/e2e/lib/__tests__/reflow-newest-record.test.ts", part: "7 (F90)", titles: ["newestRecord returns the newest record's id: the first row of the created_at-descending lookup", "newestRecord says owner A has no record only when the query returned none", "newestRecord fails with the error when the query failed", "newestRecord fails when the response is not a rows array or the row has no id"] },
	{ path: "src/providers/__tests__/query-cache-buster.test.ts", part: "3 (v7; v8, v9 in fix round 4)", titles: ["QUERY_CACHE_BUSTER is past v1 to v8, whose entries have the old shapes"] },
	{ path: "src/components/ui/__tests__/tour-viewport-fit.test.tsx", part: "6d", titles: ["Tour keeps every step inside the viewport runs offset, flip, shift, size, then arrow", "Tour keeps every step inside the viewport flips by side-axis overflow and shifts on both axes, limited to the target", "Tour keeps every step inside the viewport sizes with the same 16px collision padding as flip and shift", "Tour keeps every step inside the viewport publishes the available space as CSS variables, clamped at 0", "Tour keeps every step inside the viewport caps the step with those variables and lets the header, not the footer, give way", "Tour keeps every step inside the viewport gives the header a tab stop only while it scrolls"] },
];

// The evidence files this re-freeze re-measured, each with the field that names the tree it was
// measured on: every one must name the current code state (FR4_CODE_STATE since the re-freeze after
// fix round 4; or, for the screenshot and probe diffs, the current previous FROZEN head, FR4_PREV_FROZEN,
// as their same-session baseline and the code state as their head). The third entry, where
// present, lists the inputs of a step round 3's run measured on FR3_MEASURED_EARLIER: that
// measurement counts only while none of those inputs changed since (ctx.carryUnchanged, read
// against the current code state).
const FR3_CARRY_INPUTS = {
	"sweep-f39.json": ["scripts", "src/lib", ".github/workflows/mutation-sweep.yml"],
	"replay-f39.json": ["supabase", "scripts", ".github/workflows/migration-replay.yml"],
	"deno-f39.json": ["supabase/functions"],
	"edge-bundles-f39.json": ["supabase/functions"],
};
const FR3_FRESH = [
	["unit-f39-summary.json", (j) => j?.tree],
	["e2e-f39-summary.json", (j) => j?.tree],
	["sweep-f39.json", (j) => j?.tree, FR3_CARRY_INPUTS["sweep-f39.json"]],
	["replay-f39.json", (j) => j?.tree, FR3_CARRY_INPUTS["replay-f39.json"]],
	["deno-f39.json", (j) => j?.tree, FR3_CARRY_INPUTS["deno-f39.json"]],
	["edge-bundles-f39.json", (j) => j?.head, FR3_CARRY_INPUTS["edge-bundles-f39.json"]],
	["csp-f39.json", (j) => j?.tree],
	["probes-diff-f39.json", (j) => j?.head],
	["vendored-inventory-f39.json", (j) => j?.tree],
	["m1-delta.json", (j) => j?.tree],
];

function fr3Tree(v) {
	return typeof v === "string" && v.startsWith(FR4_CODE_STATE.slice(0, 9));
}

function fixRound3Checks(ctx) {
	const c = createCollector("FR-3", "fix-round-3");
	const add = (group, name, pass, expected, measured) => {
		c.add(name, pass, expected, measured);
		c.checks[c.checks.length - 1].group = group;
	};
	for (const g of FR3_GUARD_TESTS) {
		const f = (ctx.unit?.files ?? []).find((x) => x.name === g.path);
		const missingTitles = g.titles.filter((t) => !f?.tests?.some((x) => x.title === t && x.status === "passed"));
		const src = ctx.guardSources?.[g.path] ?? "";
		const missingMarkers = (g.markers ?? []).filter((m) => !src.includes(m));
		const ok = Boolean(f) && f.status === "passed" && f.numTests > 0 && f.numPassed === f.numTests && missingTitles.length === 0 && missingMarkers.length === 0;
		add(`fr3-guard:${g.path}`, `fix round 3 guard ${g.path} (part ${g.part}) present and passing, with its ${g.titles.length} title(s)${g.markers ? " and its widening" : ""}`, ok, "passed", f ? { status: f.status, numTests: f.numTests, numPassed: f.numPassed, missingTitles, missingMarkers } : MISSING);
	}
	add("fr3-code-state", `fix round 3's code state ${FR3_CODE_STATE.slice(0, 9)} is in the history of the code state (git rev-list)`, ctx.fr3InHistory === true, true, { fr3InHistory: ctx.fr3InHistory ?? MISSING, codeState: ctx.codeState ?? MISSING });
	const carried = (name, v) => Boolean(FR3_CARRY_INPUTS[name]) && typeof v === "string" && v.startsWith(FR3_MEASURED_EARLIER.slice(0, 9)) && ctx.carryUnchanged?.[name] === true;
	const stale = FR3_FRESH.filter(([name, pick]) => !fr3Tree(pick(ctx.evidence?.[name])) && !carried(name, pick(ctx.evidence?.[name]))).map(([name, pick]) => `${name}: ${pick(ctx.evidence?.[name]) ?? MISSING}${FR3_CARRY_INPUTS[name] ? ` (inputs unchanged since ${FR3_MEASURED_EARLIER.slice(0, 9)}: ${ctx.carryUnchanged?.[name] ?? MISSING})` : ""}`);
	const screenBaselines = [...new Set((ctx.screens ?? []).map((s) => s.baseline))];
	const screensFresh = (ctx.screens ?? []).length > 0 && screenBaselines.length === 1 && screenBaselines[0] === FR4_PREV_FROZEN.slice(0, 9) && (ctx.screens ?? []).every((s) => fr3Tree(s.head));
	const probesFresh = ctx.evidence?.["probes-diff-f39.json"]?.baseline === FR4_PREV_FROZEN.slice(0, 9);
	add("fr3-fresh", `every evidence file this re-freeze owns was measured on the code state, and the screenshot and probe diffs against a same-session ${FR4_PREV_FROZEN.slice(0, 9)}`, stale.length === 0 && screensFresh && probesFresh, "all on the code state", { stale, screenBaselines, screensFresh, probesBaseline: ctx.evidence?.["probes-diff-f39.json"]?.baseline ?? MISSING });
	const pdx = ctx.evidence?.["probes-diff-f39.json"] ?? {};
	const pdDiffs = Array.isArray(pdx.diffs) ? pdx.diffs : [];
	const pdNoise = Array.isArray(pdx.noise) ? pdx.noise : [];
	const badDiffs = pdDiffs.filter((x) => x.class !== "intended" || !(typeof x.ref === "string" && x.ref.length > 0) || !Array.isArray(x.vd) || x.vd.length === 0 || !x.vd.every((v) => FR_VD_IDS.includes(v)));
	// Noise only when the same field varies across same-session repeats of the one tree: the
	// repeats hold at least two values, the head's among them.
	const badNoise = pdNoise.filter((x) => x.class !== "noise" || !Array.isArray(x.repeatValues) || new Set(x.repeatValues.map((v) => JSON.stringify(v))).size < 2 || !x.repeatValues.some((v) => JSON.stringify(v) === JSON.stringify(x.head)) || !x.repeatValues.some((v) => JSON.stringify(v) === JSON.stringify(x.old)));
	add("fr3-probes", `every component-probe difference from ${FR4_PREV_FROZEN.slice(0, 9)} is intended under a VD row, or noise the same field shows across same-session repeats of the code state`, Array.isArray(pdx.diffs) && badDiffs.length === 0 && badNoise.length === 0, "0 unattributed", { diffs: pdDiffs.length, noise: pdNoise.map((x) => `${x.id} ${x.field} ${JSON.stringify(x.old)} -> ${JSON.stringify(x.head)}`), badDiffs: badDiffs.map((x) => `${x.id} ${x.field}`), badNoise: badNoise.map((x) => `${x.id} ${x.field}`) });
	const sw = ctx.evidence?.["sweep-f39.json"] ?? {};
	const shards = Array.isArray(sw.shards) ? sw.shards : [];
	const sweepOk = ctx.sweepRows === FR3_SWEEP_ROWS && sw.rows === FR3_SWEEP_ROWS && sw.caught === FR3_SWEEP_ROWS && sw.vacuous === 0 && sw.notApplied === 0 && sw.restored === true && sortedJson(shards.map((s) => s.rows)) === sortedJson(FR3_SHARD_ROWS) && shards.every((s, i) => s.rows === FR3_SHARD_ROWS[i] && s.caught === s.rows && s.vacuous === 0 && s.notApplied === 0 && s.restored === true) && sw.listing?.rows === FR3_SWEEP_ROWS && sw.listing?.disjoint === true;
	add("fr3-sweep", `the mutation sweep holds ${FR3_SWEEP_ROWS} rows, every one caught unsharded and in shards of ${FR3_SHARD_ROWS.join(", ")}`, sweepOk, { rows: FR3_SWEEP_ROWS, shards: FR3_SHARD_ROWS }, { scriptRows: ctx.sweepRows ?? MISSING, unsharded: { rows: sw.rows ?? MISSING, caught: sw.caught ?? MISSING, vacuous: sw.vacuous ?? MISSING, notApplied: sw.notApplied ?? MISSING }, shards: shards.map((s) => `${s.rows}/${s.caught}`) });
	const rp = ctx.evidence?.["replay-f39.json"] ?? {};
	add("fr3-replay", `the migration replay applies all ${FR_EXPECTED_MIGRATIONS} files from empty on the code state (${FR3_MIGRATIONS} at round 3), every gate exit 0`, rp.files === FR_EXPECTED_MIGRATIONS && rp.applied === FR_EXPECTED_MIGRATIONS && ctx.migrationsCount === FR_EXPECTED_MIGRATIONS && FR_REPLAY_GATES.every((g) => rp.gates?.[g] === 0), { files: FR_EXPECTED_MIGRATIONS }, { files: rp.files ?? MISSING, applied: rp.applied ?? MISSING, tree: ctx.migrationsCount ?? MISSING, gates: rp.gates ?? MISSING });
	const dn = ctx.evidence?.["deno-f39.json"] ?? {};
	const exits = Object.values(dn.check?.exits ?? {});
	const testsOk = Object.keys(FR3_DENO_TESTS).every((t) => dn.tests?.[t]?.passed === FR4_DENO_TESTS[t] && dn.tests?.[t]?.failed === 0);
	add("fr3-deno", `deno check is clean on all ${FR3_FUNCTIONS} functions and round 3's in-process Deno test files pass at their current counts`, exits.length === FR3_FUNCTIONS && exits.every((x) => x === 0) && testsOk, { functions: FR3_FUNCTIONS, tests: FR4_DENO_TESTS }, { functions: exits.length, nonZero: Object.entries(dn.check?.exits ?? {}).filter(([, x]) => x !== 0).map(([k]) => k), tests: dn.tests ?? MISSING });
	const ed = ctx.evidence?.["edge-bundles-f39.json"] ?? {};
	const fns = Array.isArray(ed.functions) ? ed.functions : [];
	const differing = fns.filter((f) => f.bundle === "different").map((f) => f.fn);
	const deployCmd = /deploy-edge-functions\.ts ([a-z0-9 -]+?)`/.exec(ctx.prBody ?? "");
	const bodySlugs = deployCmd ? deployCmd[1].trim().split(/\s+/) : [];
	add("fr3-edge", `the redeploy list is exactly the functions whose bundle differs from d9c7329f0 (all 17 bundled; round 3's four, ${FR4_DEPLOY.length} since fix round 4), and the PR body's deploy command names exactly them`, fns.length === FR3_FUNCTIONS && fns.every((f) => f.baseExit === 0 && f.headExit === 0) && FR3_DEPLOY.every((x) => FR4_DEPLOY.includes(x)) && sortedJson(differing) === sortedJson(FR4_DEPLOY) && sortedJson(ed.deploy ?? []) === sortedJson(FR4_DEPLOY) && sortedJson(bodySlugs) === sortedJson(FR4_DEPLOY), FR4_DEPLOY, { bundled: fns.length, differing, deploy: ed.deploy ?? MISSING, prBodyCommand: bodySlugs });
	const at = ctx.parityAttribution?.fixRound3 ?? {};
	const keyed = [...(at.added ?? []), ...(at.removed ?? []), ...(at.reversedFixRound1 ?? [])];
	const badKeys = keyed.filter((r) => !(Array.isArray(r.commits) && r.commits.length > 0 && Array.isArray(r.vd) && r.vd.length > 0 && r.vd.every((v) => v === "comment-only" || FR_VD_IDS.includes(v))));
	const lists = ctx.parity?.lists ?? {};
	const parityOk = ctx.parity?.counts?.unclassified === 0 && sortedJson(lists["intended:fix-round-3-added"] ?? []) === sortedJson((at.added ?? []).map((r) => r.key)) && sortedJson(lists["intended:fix-round-3-removed"] ?? []) === sortedJson((at.removed ?? []).map((r) => r.key)) && keyed.length > 0 && badKeys.length === 0 && (ctx.parityAttribution?.unattributed ?? []).length === 0;
	add("fr3-parity", "rule parity: every key fix round 3 added or removed has its commit and VD row, and the FINAL -> f39 diff classifies exactly those keys as fix round 3's", parityOk, "0 unclassified, 0 unattributed", { unclassified: ctx.parity?.counts?.unclassified ?? MISSING, added: (at.added ?? []).length, removed: (at.removed ?? []).length, reversed: (at.reversedFixRound1 ?? []).length, badKeys: badKeys.map((r) => r.key), unattributed: ctx.parityAttribution?.unattributed ?? MISSING });
	const body = ctx.prBody ?? "";
	const sec = body.indexOf(`\n${FR3_SECTION}\n`);
	const fr2 = body.indexOf("\n## Fix round 2 ");
	const after = body.indexOf("\n## After merge, in this order\n");
	const table = [...body.matchAll(/^\| (VD-1[3-5]\d) \| /gm)].map((m) => m[1]);
	add("fr3-pr-body", `the PR body carries the fix-round-3 section after fix round 2 and before After merge, and its VD table lists VD-130..VD-${FR3_VD_LAST} once each`, sec !== -1 && fr2 !== -1 && after !== -1 && fr2 < sec && sec < after && sortedJson(table) === sortedJson(FR3_VD_IDS), { section: FR3_SECTION, vd: `VD-130..VD-${FR3_VD_LAST}` }, { section: sec, fixRound2: fr2, afterMerge: after, table });
	const diff = ctx.diffPaths ?? [];
	const recorded = (ctx.paths?.paths ?? []).map((p) => `${p.status}\t${p.path}`);
	add("fr3-scope", `fix round 3's code diff ${FR3_BASE.slice(0, 9)}..${FR3_CODE_STATE.slice(0, 9)} equals f39/fix-round-3-paths.json`, diff.length > 0 && sortedJson(recorded) === sortedJson(diff), diff.length, { paths: diff.length, recorded: recorded.length, missing: diff.filter((p) => !recorded.includes(p)).slice(0, 10), extra: recorded.filter((p) => !diff.includes(p)).slice(0, 10) });
	const failedGroups = [...new Set(c.checks.filter((k) => !k.pass).map((k) => k.group))];
	return { mode: "fix-round-3", checks: c.checks, failedGroups, failed: c.checks.filter((k) => !k.pass).length };
}

function readFixRound3Context(dir) {
	const j = (name) => {
		const p = join(dir, name);
		return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null;
	};
	const git = (args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
	const sweepText = readFileSync(join(ROOT, "scripts/mutation-sweep.sh"), "utf8");
	const screens = j("screens-diff-f39.json");
	return {
		unit: j("unit-f39-summary.json"),
		evidence: Object.fromEntries(FR3_FRESH.map(([name]) => [name, j(name)])),
		screens: Array.isArray(screens) ? screens : [],
		parity: j("css-parity-candidate-css-final-vs-candidate-css-f39.json"),
		parityAttribution: j("css-parity-intended-f39-attribution.json"),
		paths: j("fix-round-3-paths.json"),
		prBody: existsSync(join(ROOT, FR3_PR_BODY)) ? readFileSync(join(ROOT, FR3_PR_BODY), "utf8") : null,
		guardSources: Object.fromEntries(FR3_GUARD_TESTS.map((g) => [g.path, existsSync(join(ROOT, g.path)) ? readFileSync(join(ROOT, g.path), "utf8") : ""])),
		codeState: git(["log", "-1", "--format=%H", "--", ".", ":(exclude).planning"]).trim(),
		fr3InHistory: git(["rev-list", "HEAD"]).split("\n").includes(FR3_CODE_STATE),
		sweepRows: sweepText.split("\n").filter((l) => /^\s*mutate\s/.test(l)).length,
		migrationsCount: readdirSync(join(ROOT, "supabase/migrations")).filter((f) => f.endsWith(".sql")).length,
		diffPaths: git(["diff", "--name-status", "--no-renames", FR3_BASE, FR3_CODE_STATE, "--", ".", ":(exclude).planning"]).split("\n").filter(Boolean),
		carryUnchanged: Object.fromEntries(
			Object.entries(FR3_CARRY_INPUTS).map(([name, inputs]) => {
				try {
					execFileSync("git", ["diff", "--quiet", FR3_MEASURED_EARLIER, FR4_CODE_STATE, "--", ...inputs], { cwd: ROOT, stdio: "ignore" });
					return [name, true];
				} catch {
					return [name, false];
				}
			}),
		),
	};
}

function fixRound3Fixture() {
	const head = `${FR4_CODE_STATE.slice(0, 9)} (codeStateSha)`;
	const files = FR3_GUARD_TESTS.map((g) => ({ name: g.path, status: "passed", numTests: g.titles.length + 1, numPassed: g.titles.length + 1, tests: [...g.titles.map((title) => ({ title, status: "passed" })), { title: "other", status: "passed" }] }));
	const evidence = Object.fromEntries(FR3_FRESH.map(([name]) => [name, { tree: head, head }]));
	evidence["probes-diff-f39.json"].baseline = FR4_PREV_FROZEN.slice(0, 9);
	evidence["probes-diff-f39.json"].diffs = [{ id: "chart", field: "light.axisFill", old: [102, 102, 102, 1], head: [96, 103, 112, 1], kind: "measured", class: "intended", vd: ["VD-143"], ref: "61df5a44d" }];
	evidence["probes-diff-f39.json"].noise = [{ id: "toast-loading", field: "light.iconWidth", old: 22, head: 23, class: "noise", repeatValues: [23, 22, 23] }];
	// The sweep measured on FR3_MEASURED_EARLIER and carried (its inputs unchanged): it passes.
	evidence["sweep-f39.json"] = { tree: `${FR3_MEASURED_EARLIER.slice(0, 9)} (code state at measurement)`, rows: FR3_SWEEP_ROWS, caught: FR3_SWEEP_ROWS, vacuous: 0, notApplied: 0, restored: true, shards: FR3_SHARD_ROWS.map((rows, i) => ({ shard: i + 1, rows, caught: rows, vacuous: 0, notApplied: 0, restored: true })), listing: { rows: FR3_SWEEP_ROWS, disjoint: true } };
	evidence["replay-f39.json"] = { tree: head, files: FR_EXPECTED_MIGRATIONS, applied: FR_EXPECTED_MIGRATIONS, gates: Object.fromEntries(FR_REPLAY_GATES.map((g) => [g, 0])) };
	evidence["deno-f39.json"] = { tree: head, check: { exits: Object.fromEntries(Array.from({ length: FR3_FUNCTIONS }, (_, i) => [`fn${i}`, 0])) }, tests: Object.fromEntries(Object.entries(FR4_DENO_TESTS).map(([t, n]) => [t, { passed: n, failed: 0 }])) };
	evidence["edge-bundles-f39.json"] = { head, deploy: [...FR4_DEPLOY], functions: Array.from({ length: FR3_FUNCTIONS }, (_, i) => ({ fn: i < FR4_DEPLOY.length ? FR4_DEPLOY[i] : `same${i}`, bundle: i < FR4_DEPLOY.length ? "different" : "identical", baseExit: 0, headExit: 0 })) };
	const vdTable = FR3_VD_IDS.map((id) => `| ${id} | x | \`c\` |`).join("\n");
	const prBody = `## Summary\n\n## Fix round 2 (x)\n\n${FR3_SECTION}\n\n${vdTable}\n\n## After merge, in this order\n\n2. **Edge Functions**: \`bun scripts/deploy-edge-functions.ts ${FR4_DEPLOY.join(" ")}\`, then\n`;
	return {
		unit: { files },
		evidence,
		screens: [{ set: "public", capture: "a.png", class: "identical", baseline: FR4_PREV_FROZEN.slice(0, 9), head }],
		parity: { counts: { unclassified: 0 }, lists: { "intended:fix-round-3-added": ["a"], "intended:fix-round-3-removed": ["b"] } },
		parityAttribution: { fixRound3: { added: [{ key: "a", commits: ["c1 x"], vd: ["VD-134"] }], removed: [{ key: "b", commits: ["c2 y"], vd: ["comment-only"] }], reversedFixRound1: [] }, unattributed: [] },
		paths: { paths: [{ status: "M", path: "src/a.tsx" }, { status: "A", path: "src/b.test.ts" }] },
		prBody,
		guardSources: Object.fromEntries(FR3_GUARD_TESTS.map((g) => [g.path, (g.markers ?? []).join("\n")])),
		codeState: FR4_CODE_STATE,
		fr3InHistory: true,
		carryUnchanged: Object.fromEntries(Object.keys(FR3_CARRY_INPUTS).map((name) => [name, true])),
		sweepRows: FR3_SWEEP_ROWS,
		migrationsCount: FR_EXPECTED_MIGRATIONS,
		diffPaths: ["M\tsrc/a.tsx", "A\tsrc/b.test.ts"],
	};
}

// One mutation per group; each must fail exactly that group (the red proof of each check).
const FR3_MUTATIONS = [
	["a guard test fails", `fr3-guard:${FR3_GUARD_TESTS[0].path}`, (f) => {
		Object.assign(f.unit.files[0], { status: "failed", numPassed: 1 });
	}],
	["a guard drops a recorded title", `fr3-guard:${FR3_GUARD_TESTS[20].path}`, (f) => {
		f.unit.files[20].tests = f.unit.files[20].tests.filter((t) => t.title !== FR3_GUARD_TESTS[20].titles[0]);
	}],
	["the nested-member widening is reverted", "fr3-guard:src/hooks/api/__tests__/data-layer-callers.test.ts", (f) => {
		f.guardSources["src/hooks/api/__tests__/data-layer-callers.test.ts"] = "";
	}],
	["the e2e exports guard reads the disk again", "fr3-guard:tests/e2e/lib/__tests__/e2e-support-exports-have-callers.test.ts", (f) => {
		f.guardSources["tests/e2e/lib/__tests__/e2e-support-exports-have-callers.test.ts"] = "readdirSync(dir)";
	}],
	["a guard file is gone", "fr3-guard:tests/e2e/lib/__tests__/reflow-newest-record.test.ts", (f) => {
		f.unit.files = f.unit.files.filter((x) => x.name !== "tests/e2e/lib/__tests__/reflow-newest-record.test.ts");
	}],
	["round 3's code state is not in the history", "fr3-code-state", (f) => {
		f.fr3InHistory = false;
	}],
	["the unit summary is carried from the previous freeze", "fr3-fresh", (f) => {
		f.evidence["unit-f39-summary.json"].tree = "f8de0175e (codeStateSha)";
	}],
	["the sweep carried forward though its inputs changed", "fr3-fresh", (f) => {
		f.carryUnchanged["sweep-f39.json"] = false;
	}],
	["a unit summary carried forward (the suite is never carried)", "fr3-fresh", (f) => {
		f.evidence["unit-f39-summary.json"].tree = `${FR3_MEASURED_EARLIER.slice(0, 9)} (code state at measurement)`;
	}],
	["the screenshots diffed against FINAL", "fr3-fresh", (f) => {
		f.screens[0].baseline = "final";
	}],
	["a probe difference with no VD row", "fr3-probes", (f) => {
		f.evidence["probes-diff-f39.json"].diffs[0].vd = [];
	}],
	["probe noise whose repeats never vary", "fr3-probes", (f) => {
		f.evidence["probes-diff-f39.json"].noise[0].repeatValues = [23, 23, 23];
	}],
	["the sweep back at 179 rows", "fr3-sweep", (f) => {
		f.sweepRows = 179;
	}],
	["a shard lost a row", "fr3-sweep", (f) => {
		f.evidence["sweep-f39.json"].shards[0].rows = 23;
		f.evidence["sweep-f39.json"].shards[0].caught = 23;
	}],
	["the replay misses a file", "fr3-replay", (f) => {
		f.evidence["replay-f39.json"].applied = FR_EXPECTED_MIGRATIONS - 1;
	}],
	["a function fails deno check", "fr3-deno", (f) => {
		f.evidence["deno-f39.json"].check.exits.fn3 = 1;
	}],
	["an in-process test count drops", "fr3-deno", (f) => {
		f.evidence["deno-f39.json"].tests["generate-pdf-test.ts"].passed = 8;
	}],
	["an identical bundle added to the deploy list", "fr3-edge", (f) => {
		f.evidence["edge-bundles-f39.json"].deploy.push("same9");
	}],
	["the PR body's deploy command drops a slug", "fr3-edge", (f) => {
		f.prBody = f.prBody.replace(" stripe-webhooks`", "`");
	}],
	["a fix-round-3 key with no VD row", "fr3-parity", (f) => {
		f.parityAttribution.fixRound3.added[0].vd = [];
	}],
	["an unattributed key", "fr3-parity", (f) => {
		f.parityAttribution.unattributed.push({ side: "added", key: "z" });
	}],
	["the PR body loses VD-150", "fr3-pr-body", (f) => {
		f.prBody = f.prBody.replace("| VD-150 |", "| VD-15 |");
	}],
	["the fix-round-3 section moved after After merge", "fr3-pr-body", (f) => {
		f.prBody = f.prBody.replace(`${FR3_SECTION}\n`, "").replace("## After merge, in this order\n", `## After merge, in this order\n\n${FR3_SECTION}\n`);
	}],
	["a code path missing from the record", "fr3-scope", (f) => {
		f.diffPaths.push("M\tsrc/c.tsx");
	}],
];

function fixRound3SelfTest(failures) {
	let passed = 0;
	const clean = fixRound3Checks(fixRound3Fixture());
	if (clean.failed === 0) passed++;
	else failures.push(`fix-round-3 clean fixture failed ${JSON.stringify(clean.checks.filter((k) => !k.pass).map((k) => k.name))}`);
	for (const [name, group, mutate] of FR3_MUTATIONS) {
		const f = fixRound3Fixture();
		mutate(f);
		const r = fixRound3Checks(f);
		const want = Array.isArray(group) ? group : [group];
		if (sortedJson(r.failedGroups) === sortedJson(want)) passed++;
		else failures.push(`fix-round-3 "${name}": failed groups ${JSON.stringify(r.failedGroups)}, expected ${JSON.stringify(want)}`);
	}
	return passed;
}

// ---------- --fix-round-4 ----------

// Fix round 4 answers perfect-PR cycle 3 (71 distinct findings on 3977aa58d, 70 kept; code state
// b7f25511b): Parts 1 to 8, 5b, 5c, 5d and 8b to 8o, the main session's ae038ed02 (the success
// badge's anchor hover at /15) and 7f6fcc67c (robots.txt's three dead disallows), 232 commits. It
// changed application code, ui primitives, tests, E2E specs and helpers, the e2e-smoke
// globalTimeout, Edge _shared sources and added one migration (production already holds it), so the
// re-freeze re-ran every step; this mode pins what that run must keep.
const FR4_PREV_FROZEN = "3977aa58d6710e971969b6e9429a95ad56183a18";
// 3977aa58d holds b7f25511b's code outside .planning/ (git diff --quiet 3977aa58d b7f25511b).
const FR4_BASE = "b7f25511b600b9cf1edd50bc56c41de55e02f29a";
const FR4_CODE_STATE = "7f6fcc67c3d2d939a2f765713510b2943fc6b6f8";
const PRE_39_SHA = "23f42a97635ff9c8cb157be63ee7d365dd5f20d8";
// The functions whose `deno bundle` differs between d9c7329f0 and the code state: Part 8's four
// (export-report, generate-pdf, lease-signature, n8n-blog-ingest) and stripe-webhooks (Parts 8n and
// 8o: the failed-payment and trial-ending emails). The redeploy list.
const FR4_DEPLOY = ["export-report", "generate-pdf", "lease-signature", "n8n-blog-ingest", "stripe-webhooks"];
// The six in-process Deno test files at the code state: export-report-test.ts gained a test in
// Part 8n (4ff4f987a, the past-due 402), 16 -> 17.
const FR4_DENO_TESTS = { "send-lease-reminders-test.ts": 25, "lease-signature-metering-test.ts": 5, "lease-signing-test.ts": 12, "rate-limit-sentry-test.ts": 2, "export-report-test.ts": 17, "generate-pdf-test.ts": 9 };
// The migration fix round 4 added; the main session applied it to production on 2026-11-09 (MCP
// apply_migration, owner-approved), so the PR body records it as applied and keeps it out of
// "After merge" step 1's apply list.
const FR4_MOVE_OUT_MIGRATION = "20261109141151_tenants_move_out_record.sql";
const FR4_SECTION = "## Fix round 4 (after perfect-PR cycle 3)";
const FR4_COMMENT = "https://github.com/hudsor01/tenant-flow/pull/1057#issuecomment-6712549001";
// GitHub's PR body limit is 65,536 bytes; the re-freeze keeps the body at or under this so later
// edits have room.
const FR4_BODY_LIMIT = 64500;
// The VD labels a fix-round-4 parity key may carry besides a UI-SPEC row: a key that stands only in
// a source comment, and a key whose only source was a deleted component no screen rendered.
const FR4_PARITY_LABELS = ["comment-only", "unrendered"];
// The retired round-3 guard and the round-4 guard that replaced it (Part 6, e86105e85).
const FR4_RETIRED_GUARD = "src/components/__tests__/heading-block-paragraph-margin.test.ts";
const FR4_RETIRED_BY = "src/components/__tests__/paragraph-base-margin.test.ts";
// Every unit test file fix round 4 added (67; `git diff --diff-filter=A b7f25511b 7f6fcc67c`), with
// the part and commit that added it and up to six of its titles as the code state runs them.
const FR4_GUARD_TESTS = [
	{ path: "src/app/(auth)/login/__tests__/login-mfa-cancel.test.tsx", part: "8k (182de2bc8)", titles: ["login: cancelling the two-factor challenge signs out this session only (scope local), never every session"] },
	{ path: "src/app/(owner)/analytics/financial/_components/__tests__/financial-analytics-skeleton.test.tsx", part: "5 (7da0456ad)", titles: ["the financial analytics first chart row is the chart beside one card, the breakdown as the grid's own item", "the financial analytics first chart row loads as the same chart beside one card"] },
	{ path: "src/app/(owner)/billing/checkout/cancel/page.test.tsx", part: "8l (e8d5c2da4)", titles: ["CheckoutCancelPage offers Try Again and billing settings, both reachable whatever the plan"] },
	{ path: "src/app/(owner)/billing/checkout/success/page.test.tsx", part: "8m (5da054158)", titles: ["/billing/checkout/success before the status is admitted: says the plan is being activated, offers Billing Settings, no dashboard", "/billing/checkout/success once a read says the status is admitted: the dashboard link, and the reads stop", "/billing/checkout/success active, which the proxy admits, offers the dashboard", "/billing/checkout/success trialing, which the proxy admits, offers the dashboard", "/billing/checkout/success past_due, which the proxy admits, offers the dashboard", "/billing/checkout/success unpaid, which the proxy does not admit, never offers it"] },
	{ path: "src/app/(owner)/dashboard/__tests__/dashboard-page-portfolio-rows.test.tsx", part: "2 (75ede0b66)", titles: ["the dashboard page's portfolio rows pass each property's rendered fields, and not its occupancy rate"] },
	{ path: "src/app/(owner)/documents/templates/components/dynamic-form-control-names.test.tsx", part: "8h (350bdf99e)", titles: ["the template form's controls are each named by their visible label"] },
	{ path: "src/app/(owner)/properties/__tests__/property-delete-confirmation.test.tsx", part: "8h (936041dc7)", titles: ["a property's delete confirmation on the property's page names it and claims no cascade or permanence", "a property's delete confirmation on the properties list names it and claims no permanence"] },
	{ path: "src/app/(owner)/properties/units/components/__tests__/unit-actions-spinner.test.tsx", part: "5 (f79a26902)", titles: ["the Delete Unit deleting state spins in the destructive fill's own foreground"] },
	{ path: "src/app/(owner)/tenants/components/__tests__/move-out-dialog.test.tsx", part: "8j (73dc01687)", titles: ["MoveOutDialog bounds the notes and states the bound under the field", "MoveOutDialog offers the shared list of reasons, in its order", "MoveOutDialog says the date, reason and notes are saved"] },
	{ path: "src/app/(owner)/tenants/components/__tests__/move-out-record.test.tsx", part: "8j (73dc01687)", titles: ["MoveOutRecord shows the date, the reason's label and the notes", "MoveOutRecord reads each slug as its label from the shared list", "MoveOutRecord shows a 2,000-character reason's notes in full", "MoveOutRecord shows a reason whose slug is not in the list as written", "MoveOutRecord shows a date it cannot read as written", "MoveOutRecord renders nothing when neither is set"] },
	{ path: "src/app/__tests__/reduced-motion-transitions.test.ts", part: "8f (e37a20b8a)", titles: ["the reduced-motion rule makes a transition 0s, so no element transitions a property it never declared", "the reduced-motion rule keeps an animation at 0.01ms, so animationend still fires"] },
	{ path: "src/app/__tests__/url-text-is-never-shown.test.tsx", part: "7 (cdd28a8cf)", titles: ["a URL value never reaches the page as text /auth/update-password with the auth callback's failure hash shows fixed copy", "a URL value never reaches the page as text /auth/update-password with a crafted description shows fixed copy", "a URL value never reaches the page as text /auth/update-password with Supabase's expired-token code shows fixed copy", "a URL value never reaches the page as text /auth/update-password with an unknown error shows fixed copy", "a URL value never reaches the page as text /search does not quote ?q= in its no-results title; the search box holds it", "a URL value never reaches the page as text /billing/checkout/success does not print ?session_id="] },
	{ path: "src/app/auth/signout/__tests__/signout-page.test.tsx", part: "8l (9ae65c7cb)", titles: ["/auth/signout a successful sign-out lands on /login once", "/auth/signout no timer navigates after a successful sign-out (fake timers, 10 s)", "/auth/signout an arrival with no session says so, offers Sign In and never navigates on its own", "/auth/signout centers every state at the other auth pages' width (max-w-md)"] },
	{ path: "src/components/__tests__/confirmation-copy-voice.test.ts", part: "8h (4da185a01)", titles: ["the scan finds the question in every shape of copy (fixtures) reads JSX text wrapped across lines, strings and templates, not comments", "no copy in src asks \"Are you sure\" reads the app's copy", "no copy in src asks \"Are you sure\" finds none"] },
	{ path: "src/components/__tests__/controls-have-accessible-names.test.ts", part: "8h (bf0ed2052)", titles: ["the scan names each control shape (fixtures) finds a control with no name, and one whose Label renders in another branch", "the scan names each control shape (fixtures) leaves every named shape alone", "the scan names each control shape (fixtures) follows a wrapper to its call sites", "every control in src has a name reads the controls the app renders", "every control in src has a name leaves no control unnamed", "every control in src has a name keeps each named-elsewhere entry a live site"] },
	{ path: "src/components/__tests__/dialog-rows-fit-narrow-screens.test.tsx", part: "5d (8aff69588)", titles: ["a dialog's content never widens the dialog DialogContent and AlertDialogContent declare one minmax(0, 1fr) column", "rows inside a dialog fit a phone-width dialog the two-factor setup's code row shares its width between the six slots", "rows inside a dialog fit a phone-width dialog the sign-in verification's code row shares its width between the six slots", "rows inside a dialog fit a phone-width dialog the bulk-import stepper's step text is screen-reader only below sm, shown from sm"] },
	{ path: "src/components/__tests__/icon-only-values-have-text.test.tsx", part: "5c (15defea36)", titles: ["icons that are a cell's only content carry a text alternative (WCAG 1.1.1) pricing comparison table (/pricing)", "icons that are a cell's only content carry a text alternative (WCAG 1.1.1) features comparison table (/features)", "icons that are a cell's only content carry a text alternative (WCAG 1.1.1) compare feature table (/compare/buildium)", "icons that are a cell's only content carry a text alternative (WCAG 1.1.1) compare feature table (/compare/appfolio)", "icons that are a cell's only content carry a text alternative (WCAG 1.1.1) compare feature table (/compare/rentredi)"] },
	{ path: "src/components/__tests__/inline-svg-names.test.ts", part: "5c (3346b053d)", titles: ["every hand-written svg is hidden or named (WCAG 1.1.1; 66.2-39 fix round 4, Part 5c) finds the svgs it rules on", "every hand-written svg is hidden or named (WCAG 1.1.1; 66.2-39 fix round 4, Part 5c) leaves no svg the accessibility tree exposes without a name"] },
	{ path: "src/components/__tests__/menu-item-focus-labels.test.ts", part: "5c (098de0896)", titles: ["a menu item keeps its label and icons legible on its focus fill (66.2-39 fix round 4, Part 5c) finds the menu items it rules on", "a menu item keeps its label and icons legible on its focus fill (66.2-39 fix round 4, Part 5c) colors a destructive item only through the destructive variant", "a menu item keeps its label and icons legible on its focus fill (66.2-39 fix round 4, Part 5c) restates recolored icons as accent-foreground on focus"] },
	{ path: "src/components/__tests__/no-native-browser-dialogs.test.ts", part: "8g (f64eef8c8)", titles: ["the scan finds each native dialog shape (fixtures) a bare global call or reference, and a read on a global object", "the scan finds each native dialog shape (fixtures) leaves a local binding of the same name, and names that are not reads", "the scan finds each native dialog shape (fixtures) a local in one scope does not hide the global in another", "no native browser dialog in the app scans the app's sources (the scan is not vacuous)", "no native browser dialog in the app asks through the app's own dialogs: no confirm, alert or prompt"] },
	{ path: "src/components/__tests__/paragraph-base-margin.test.ts", part: "6 (e86105e85)", titles: ["paragraphs carry no base margin where it breaks declared spacing rests on the globals.css rule it guards against", "paragraphs carry no base margin where it breaks declared spacing reads the ui components as the boxes they render", "paragraphs carry no base margin where it breaks declared spacing finds each shape, through a component and a conditional", "paragraphs carry no base margin where it breaks declared spacing passes a paragraph whose margin is declared or cannot break anything", "paragraphs carry no base margin where it breaks declared spacing follows a margin that reaches a component's root to its callers", "paragraphs carry no base margin where it breaks declared spacing leaves no hit outside the deferred files", "paragraphs carry no base margin where it breaks declared spacing defers only files left as they were at the PR's base"], markers: ['import { gitBlobId } from "#test/utils/git-blob";', "\tcrossFileHits,"] },
	{ path: "src/components/__tests__/paragraph-margin-pins.test.tsx", part: "6 (061a948db)", titles: ["the cycle-3 base-margin findings hold their declared spacing G12: the cash flow balance figures, each the last child of a flex item", "the cycle-3 base-margin findings hold their declared spacing G20: the renew dialog's two notes, flex items of a padded box", "the cycle-3 base-margin findings hold their declared spacing G21: the lead paint disclosure's title and body", "the cycle-3 base-margin findings hold their declared spacing G22: each clause section's subtitle, ahead of its 12px list gap", "the cycle-3 base-margin findings hold their declared spacing G23: the properties tiles' labels and figures, flex items of their rows", "the cycle-3 base-margin findings hold their declared spacing G24: the profile's four read-only values, flex items beside their icons"] },
	{ path: "src/components/__tests__/raw-field-boundary.test.ts", part: "5c (d97a286fd)", titles: ["a native text field draws its boundary in the input token (WCAG 1.4.11; 66.2-39 fix round 4, Part 5c) finds the native fields it rules on", "a native text field draws its boundary in the input token (WCAG 1.4.11; 66.2-39 fix round 4, Part 5c) leaves no native text field with a border-border boundary"] },
	{ path: "src/components/__tests__/reservation-release-keys-on-the-row.test.ts", part: "5 (1dfbba30d)", titles: ["stat label reservations release on the row's width leave no viewport release outside the reviewed rows", "stat label reservations release on the row's width keeps every reviewed row live", "stat label reservations release on the row's width reads a release the way the class string writes it (fixtures)", "stat label reservations release on the row's width extracts and compiles each row's container and its 56rem release"] },
	{ path: "src/components/__tests__/stat-rows-hold-their-figures.test.tsx", part: "8c (1d14ffb22)", titles: ["stat tiles hold their figures give a Stat value the tile's width, under its label and indicator, unwrapped", "stat tiles hold their figures finds the stat rows in the source, and only where the list cannot", "stat tiles hold their figures step every stat row's columns on its own container, never the viewport", "stat tiles hold their figures keeps every reviewed grid live", "stat tiles hold their figures never lets a stat row's sized icon shrink", "stat tiles hold their figures reads a viewport step and a shrinkable icon the way a class string writes them (fixtures)"] },
	{ path: "src/components/__tests__/submit-buttons-inside-a-form.test.ts", part: "5d (8e39dcac7)", titles: ["every submit button sits inside the form it submits, or names it finds the submit buttons (the scan is not vacuous)", "every submit button sits inside the form it submits, or names it renders no submit button through a slot, a variable or a portal out of its form", "every submit button sits inside the form it submits, or names it renders a submit button at a component's root only where every caller wraps it in a <form>", "every submit button sits inside the form it submits, or names it keeps RENDERED_INSIDE_A_FORM current (each file still renders its submit button at a root)"] },
	{ path: "src/components/__tests__/submit-buttons-submit-their-form.test.tsx", part: "5d (8e39dcac7)", titles: ["a submit button submits the form it renders with TenantEditForm (Save Changes rendered in CardLayout's footer) Save Changes belongs to the tenant form", "a submit button submits the form it renders with TenantEditForm (Save Changes rendered in CardLayout's footer) the action row fills CardLayout's flex footer, so its justify-end puts the buttons right", "a submit button submits the form it renders with TenantEditForm (Save Changes rendered in CardLayout's footer) clicking Save Changes sends the update", "a submit button submits the form it renders with AddTenantForm (no <form> of its own before the fix) Add Tenant belongs to the tenant form", "a submit button submits the form it renders with AddTenantForm (no <form> of its own before the fix) Enter in a field submits the form"] },
	{ path: "src/components/__tests__/untyped-buttons-outside-forms.test.ts", part: "8f (f9f80cc43)", titles: ["no button without a type sits in a form finds the untyped buttons (the scan is not vacuous)", "no button without a type sits in a form leaves no untyped button where a form holds it, in its file or through its callers"] },
	{ path: "src/components/auth/__tests__/two-factor-setup-enroll-once.test.tsx", part: "8b (b12ed3aa3)", titles: ["TwoFactorSetupDialog enrollment posts one enrollment per opening when it fails, and keeps the error up", "TwoFactorSetupDialog enrollment posts again when it is closed and opened again"] },
	{ path: "src/components/dashboard/components/__tests__/portfolio-preset-menu-roles.test.tsx", part: "8h (1e5289d09)", titles: ["the Presets menu owns only menu items, and saves through a labelled dialog field"] },
	{ path: "src/components/inspections/__tests__/inspection-room-card.test.tsx", part: "8g (694886452)", titles: ["InspectionRoomCard delete confirmation opens the confirmation on the trash button, and deletes nothing", "InspectionRoomCard delete confirmation deletes the room once, only from the confirmation's Delete room", "InspectionRoomCard delete confirmation deletes nothing on Cancel"] },
	{ path: "src/components/leases/detail/__tests__/lease-timeline-disc.test.tsx", part: "5 (2c9129491)", titles: ["the lease timeline's event discs paint an opaque disc over the rail for every event type"] },
	{ path: "src/components/maintenance/__tests__/maintenance-sortable-card-roles.test.tsx", part: "8h (644853fa0)", titles: ["a maintenance board card is a link, not a button wrapped around one"] },
	{ path: "src/components/maintenance/__tests__/maintenance-tenant-option-names.test.tsx", part: "8h (ec4c49289)", titles: ["the maintenance form's tenant options each read a name"] },
	{ path: "src/components/maintenance/detail/__tests__/maintenance-details-delete.test.tsx", part: "8g (46c4f858e)", titles: ["MaintenanceDetails delete confirmation opens the confirmation on Delete Request, and deletes nothing", "MaintenanceDetails delete confirmation deletes once from the confirmation's Delete request, then leaves for the list", "MaintenanceDetails delete confirmation deletes nothing on Cancel", "MaintenanceDetails delete confirmation stays on the request when the delete fails"] },
	{ path: "src/components/properties/__tests__/property-table-checkbox-names.test.tsx", part: "8h (565c9d781)", titles: ["the properties table's selection checkboxes name the select-all's scope and each row's property"] },
	{ path: "src/components/settings/__tests__/account-deletion-claims.test.tsx", part: "8i (06e5cb82f)", titles: ["the account-deletion copy is what the job does reads the job from the ledger's newest bodies", "the account-deletion copy is what the job does the request only stamps the date, so it never refuses for a lease or a payment", "the account-deletion copy is what the job does the nightly job runs once the request is 30 days old and retries a failure", "the account-deletion copy is what the job does waits while a lease is active", "the account-deletion copy is what the job does removes the profile's name, email, phone and photo", "the account-deletion copy is what the job does marks the properties inactive and deletes notifications and applications"] },
	{ path: "src/components/settings/__tests__/category-rename-error-toast.test.tsx", part: "5d (a41de08ae)", titles: ["a failed category rename toasts copy, never the mapper's diagnostic toasts the generic copy when the updated row has no slug", "a failed category rename toasts copy, never the mapper's diagnostic still toasts the success copy for a well-formed row (positive control)"] },
	{ path: "src/components/settings/__tests__/deletion-scheduled-notice.test.tsx", part: "6 (d0dc01daa)", titles: ["DeletionScheduledNotice names the earliest date the job runs and the days until it, 30 days after the request", "DeletionScheduledNotice says the deletion is due, not a negative count, once the date has passed", "DeletionScheduledNotice leaves no base paragraph margin on either line", "DeletionScheduledNotice is the notice both Danger Zones render, with no copy of its helpers"] },
	{ path: "src/components/shared/__tests__/date-range-picker-months.test.tsx", part: "5d (8aff69588)", titles: ["the date-range picker shows two months only where they sit side by side shows one month on a 390px screen", "the date-range picker shows two months only where they sit side by side shows one month just below md (767px)", "the date-range picker shows two months only where they sit side by side shows two months from md (768px)", "the date-range picker shows two months only where they sit side by side asks for the compiled theme's md breakpoint"] },
	{ path: "src/components/shared/__tests__/owner-error-box.test.tsx", part: "6 (22f316658)", titles: ["the owner error box renders its title and a message with no base paragraph margin", "the owner error box is the box every owner list and edit page renders on a failed load"] },
	{ path: "src/components/shell/__tests__/app-shell-sign-out.test.tsx", part: "8l (9ae65c7cb)", titles: ["the shell's Sign out, from the user menu lands on /login once, after the auth data is cleared", "the shell's Sign out, from the user menu stays after a failed first request, whose session is kept", "the shell's Sign out, from the user menu lands on /login after a failed second request, whose browser is signed out", "the shell's Sign out, from the command palette lands on /login once, after the auth data is cleared", "the shell's Sign out, from the command palette stays after a failed first request, whose session is kept", "the shell's Sign out, from the command palette lands on /login after a failed second request, whose browser is signed out"] },
	{ path: "src/components/ui/__tests__/calendar-day-label.test.tsx", part: "8h (7a5c2eb2c)", titles: ["a calendar day's name holds the day number the button shows"] },
	{ path: "src/components/ui/__tests__/card-header-flex-is-live.test.ts", part: "8e (47a12e556)", titles: ["CardHeader flex classes (66.2-39 fix round 4, Part 8e) reads the CardHeader sites", "CardHeader flex classes (66.2-39 fix round 4, Part 8e) gives every CardHeader with flex classes a flex display", "CardHeader flex classes (66.2-39 fix round 4, Part 8e) catches flex classes on the grid, at a variant too (the check is not vacuous)"] },
	{ path: "src/components/ui/__tests__/combobox-aria.test.tsx", part: "8h (73f04f269)", titles: ["the combobox names its trigger, and links its input and trigger to the named list"] },
	{ path: "src/components/ui/__tests__/dropzone.test.tsx", part: "4 (c7da0d673)", titles: ["Dropzone with react-dropzone has one tab stop, the select button, and a root that is none", "Dropzone with react-dropzone opens the picker once per activation of the select button", "Dropzone with react-dropzone still opens the picker once on a click anywhere on the root"] },
	{ path: "src/components/ui/__tests__/input-otp-row-clip.test.tsx", part: "8f (95a473255)", titles: ["the InputOTP row clips its overflow 4px out, so the widened input never widens the box around it"] },
	{ path: "src/components/ui/__tests__/item-roles.test.tsx", part: "8h (c99ec947b)", titles: ["Item roles are list items inside a group and roleless outside one"] },
	{ path: "src/components/ui/__tests__/overlay-content-bounds.test.tsx", part: "5d (8aff69588)", titles: ["every overlay list fits the space beside its trigger, and scrolls PopoverContent is bounded by --radix-popover-content-available-height and --radix-popover-content-available-width and scrolls", "every overlay list fits the space beside its trigger, and scrolls SelectContent is bounded by --radix-select-content-available-height and --radix-select-content-available-width and scrolls", "every overlay list fits the space beside its trigger, and scrolls DropdownMenuContent is bounded by --radix-dropdown-menu-content-available… and --radix-dropdown-menu-content-available… and scrolls", "every overlay list fits the space beside its trigger, and scrolls ComboboxContent is bounded by --dice-available-height and --dice-available-width and scrolls", "every overlay list fits the space beside its trigger, and scrolls SelectTrigger is capped at its container's width, with a definite minimum so the cap holds in grid and flex cells"] },
	{ path: "src/components/ui/__tests__/scroll-region.test.tsx", part: "8h (536e4d9f1)", titles: ["ScrollRegion is a tab stop while its content overflows", "ScrollRegion is no tab stop while its content fits", "ScrollRegion is the table's container"] },
	{ path: "src/components/ui/__tests__/stepper-trigger-aria.test.tsx", part: "8h (565147221)", titles: ["the stepper's store hands a selector a new steps map after each step registers", "the stepper's triggers state their position in the step set", "the stepper's triggers name in aria-controls only the panel that is rendered", "the stepper's triggers render a separator after every step but the last"] },
	{ path: "src/components/ui/__tests__/tour-step-order.test.tsx", part: "8f (3fb6c7fc2)", titles: ["a tour step whose props change stays the current step, in its place"] },
	{ path: "src/hooks/__tests__/use-reduced-motion-consumers.test.tsx", part: "4 (146710b61)", titles: ["useReducedMotion consumers commit the reduced branch first KpiBentoRow: the tiles' first commit after the skeleton holds their figures", "useReducedMotion consumers commit the reduced branch first KpiBentoRow: a row mounted with its data commits no BlurFade and its figures first", "useReducedMotion consumers commit the reduced branch first CollectionRateKpi: the first commit prints the rate, not a ticker at 0", "useReducedMotion consumers commit the reduced branch first RevenueAreaChart: every commit that holds the series holds it static", "useReducedMotion consumers commit the reduced branch first OccupancyDonutChart: every commit that holds the pie holds it static", "useReducedMotion consumers commit the reduced branch first NumberTicker: started at its value, it commits the value first and schedules no frame"] },
	{ path: "src/hooks/api/__tests__/sign-out-real-auth-js.test.tsx", part: "8k (182de2bc8)", titles: ["useSignOutMutation, with the real auth-js a failing first request keeps the session and throws, and a retry sends again", "useSignOutMutation, with the real auth-js success sends scope=others, then scope=local, and removes the session", "useSignOutMutation, with the real auth-js asks the server for the user first, then sends the two logouts", "useSignOutMutation, with the real auth-js a session another device already ended (403 session_not_found) is the incomplete outcome, with no logout sent", "useSignOutMutation, with the real auth-js a JWT the server rejects (401) is the same outcome, and the rejected session is removed", "useSignOutMutation, with the real auth-js a getUser() failure that is not an ended session (500) is left to the logouts"] },
	{ path: "src/hooks/api/__tests__/tour-progress-e2e-answer.test.ts", part: "7 (f044623ca)", titles: ["the sidebar spec's answer to a tour progress write is the written row's selected columns, which updateTourProgress returns", "the sidebar spec's answer to a tour progress write an empty 201 body, the old answer, rejects an in-progress write in the client"] },
	{ path: "src/lib/__tests__/exports-have-readers.test.ts", part: "2 (41364e700)", titles: ["exports have readers reads imports, not words, and holds each kind of module to its reader", "exports have readers holds each re-export to a reader of its own", "exports have readers finds no unread export outside the seams and the ratchet", "exports have readers names, for each seam, a test that reads it"] },
	{ path: "src/lib/__tests__/no-duplicate-exported-type-names.test.ts", part: "2 (9f2f56b8c)", titles: ["exported type names are unique in src counts a name once per file, across files only", "exported type names are unique in src adds no duplicate beyond the ratchet, and keeps the ratchet current"] },
	{ path: "src/lib/__tests__/no-duplicate-type-shapes.test.ts", part: "3 (47cb521a9)", titles: ["no declaration repeats a src/types type member for member groups same-member declarations with a src/types one (fixtures)", "no declaration repeats a src/types type member for member adds no shared shape beyond the ratchet, and keeps the ratchet current"] },
	{ path: "src/lib/__tests__/no-enabled-matcher-beside-aria-disabled.test.ts", part: "3 (f4e09d56b)", titles: ["no enabled matcher beside aria-disabled (66.2-39 D1) flags the matchers in a test that reaches an aria-disabled module (fixtures)", "no enabled matcher beside aria-disabled (66.2-39 D1) leaves none in src"] },
	{ path: "src/lib/__tests__/thrown-error-messages-are-reviewed.test.ts", part: "5d (a41de08ae)", titles: ["every plain Error thrown in src carries copy, or never reaches a screen finds the plain Error throws (the scan is not vacuous)", "every plain Error thrown in src carries copy, or never reaches a screen throws a DiagnosticError, not a plain Error, for every message not reviewed as copy", "every plain Error thrown in src carries copy, or never reaches a screen throws a SERVER entry only from a server-only module", "every plain Error thrown in src carries copy, or never reaches a screen keeps REVIEWED current (every entry is still thrown somewhere)"] },
	{ path: "src/lib/__tests__/vi-mock-hoisted-bindings.test.ts", part: "2 (2dd52fb4b)", titles: ["vi.mock factories read only vi.hoisted bindings flags each shape it describes, and passes the hoisted ones", "vi.mock factories read only vi.hoisted bindings finds no binding outside the ratchet, and every ratchet entry still there"] },
	{ path: "src/lib/constants/__tests__/move-out-reason.test.ts", part: "8j (73dc01687)", titles: ["the move-out reason keeps the longest slug, its separator and a full note within the column's limit", "the move-out reason saves the slug alone, or the slug and the trimmed notes", "the move-out reason reads each slug back as its label, with its notes", "the move-out reason shows a reason whose slug is not in the list whole, as written", "the move-out reason is the one list: no other source names a move-out slug or its own label"] },
	{ path: "src/test/__tests__/msw-handlers-contract.test.ts", part: "2 (e31848448)", titles: ["the maintenance MSW handlers against the maintenance mappers serve the list a row that maps to DEFAULT_MAINTENANCE_REQUEST", "the maintenance MSW handlers against the maintenance mappers serve the detail one row, with the tenant's email and phone", "the maintenance MSW handlers against the maintenance mappers answer a create with the request's own columns", "the maintenance MSW handlers against the maintenance mappers answer an update with the detail's row, which replaces the cached detail", "the maintenance MSW handlers against the maintenance mappers answer a delete with no row", "the unit handlers against the unit queries serve the list each unit with its property's name"] },
	{ path: "src/types/__tests__/tenant-row-not-hand-kept.test.ts", part: "8k (5db409c85)", titles: ["the tenants Row is read from the generated type, never copied reads the Row's columns, the two the generator added included", "the tenants Row is read from the generated type, never copied no hand-written type in src/types declares a tenants-only column"] },
	{ path: "supabase/functions/__tests__/billing-email-claims.test.ts", part: "8n (51889b3fa)", titles: ["the failed-payment email says what Stripe's Revenue recovery settings and the gates do: retried, paused, canceled if every retry fails", "the failed-payment email ties the features to the first failure, not the cancellation, and names no retry count, duration or invoice", "the failed-payment email names only what the gates stop while past due", "the trial-ending email states both outcomes, since Stripe sends it whether or not a payment method is on file", "the trial-ending email no longer tells every owner to add a payment method", "the trial-ending email rests on the carry-over trial's cancel-without-a-card setting"] },
	{ path: "supabase/functions/__tests__/tier-gate-decision.test.ts", part: "8n (4ff4f987a)", titles: ["tierGateRefusal admits an entitled plan whose subscription the gate admits", "tierGateRefusal refuses a past-due Growth or Max owner with Billing Settings, not an upgrade", "tierGateRefusal names the subscription, not the plan, for every other status an entitled plan is refused with", "tierGateRefusal sends a plan without the feature to the plans page whatever the status", "tierGateRefusal writes only the reasons it lists", "tier-gate.ts answers with the leaf's refusal builds its 402 body from tierGateRefusal, with no message of its own"] },
	{ path: "tests/e2e/lib/__tests__/reflow-route-accounting.test.ts", part: "7 (01b3cf044)", titles: ["reflow route accounting reads the page tree", "reflow route accounting covers every page: listed, measured by a named spec, a redirect, or a reason", "reflow route accounting catches a page with no entry and an entry the tree contradicts (the audit is not vacuous)", "reflow route accounting lands a listed URL on the most specific page, as the router does"] },
];
// The guards fix round 4 widened in files an earlier round added: the titles the widening added
// (the f39 unit summary's titles at 3977aa58d against the code state's) and, where the widening is
// a code path no title names, a code marker read from disk.
const FR4_WIDENED_TESTS = [
	{ path: "src/components/__tests__/list-base-rule-neutralized.test.ts", part: "6, 8b (blob-keyed ratchet, 98430d7cf)", titles: ["every list cancels the base ul, ol and li rules defers only files left as they were at the PR's base"], markers: ['import { gitBlobId } from "#test/utils/git-blob";'] },
	{ path: "src/app/__tests__/state-fill-contrast.test.ts", part: "5 (STACK_FIXTURES), 5b, 5c", titles: ["a faded resting label keeps 4.5:1 (66.2-39 fix round 4, Part 5b) leaves no faded label under 4.5:1, either theme", "control boundaries and focus indicators hold 3:1 (WCAG 1.4.11; 66.2-39 fix round 4, Part 5b) draws the input token, every control's boundary, at 3:1 on each surface", "control boundaries and focus indicators hold 3:1 (WCAG 1.4.11; 66.2-39 fix round 4, Part 5b) gives every focus state a ring, outline, border or fill at 3:1 on each surface", "a focus-visible outline after outline-none names its style (66.2-39 fix round 4, Part 5b) restores the outline style wherever a string hides the outline and draws one", "a hovered text link keeps 4.5:1 (66.2-39 fix round 4, Part 5b) paints the base link hover in a token that clears 4.5:1 on each surface", "a focused destructive menu item shows its focus at 3:1 (66.2-39 fix round 4, Part 5c) dark"], markers: ["const STACK_FIXTURES: {"] },
	{ path: "src/lib/__tests__/no-deprecated-library-api.test.ts", part: "7 (ab6d35a87, the comment scan)", titles: ["deprecated zod, TanStack Store, recharts and String APIs shows no deprecated TanStack Store or recharts export called in a comment"] },
	{ path: "src/lib/__tests__/mutation-error-handler.test.ts", part: "2 (G62), 5d", titles: ["handleMutationError — leaky SQLSTATE → friendly copy (UIX-04) never shows Postgres's own text under any other SQLSTATE (66.2-39 fix round 4, Part 5d)", "userFacingErrorMessage — a failed fetch, as each library passes it on (fix round 4, G62) toasts the network copy for a mutation whose PostgREST call failed offline"] },
	{ path: "src/components/ui/__tests__/button-caller-states.test.ts", part: "3 (G15)", titles: ["a caller's Button colors hold in both themes (66.2-39 F7) cancels the variant's hover on every aria-disabled Button in shipped src"] },
	{ path: "src/components/shell/__tests__/app-shell.test.tsx", part: "4 (G42)", titles: ["AppShell mobile navigation sheet displays the rail in the open sheet at no sheet-mode width"] },
	{ path: "src/components/ui/__tests__/sidebar.test.tsx", part: "4 (G42)", titles: ["SidebarProvider and Sidebar (desktop) uses the lg breakpoint and renders no sm: or md: class"] },
	{ path: "scripts/mutation-sweep.test.ts", part: "1 (G51)", titles: ["the mutation sweep's shards gives the fullest shard a timeout of at least twice its runtime", "the sweep's comments .github/workflows/mutation-sweep.yml writes no current row count", "the sweep's comments scripts/mutation-sweep.sh writes no current row count"] },
	{ path: "src/app/robots.test.ts", part: "main session (7f6fcc67c)", titles: ["every robots-only path is served /auth/signout has a src/app route", "every robots-only path is served /monitoring is still the Sentry tunnel"] },
];
// The E2E specs fix round 4 added or widened: each must run in the CI set (e2e-f39-summary.json)
// with every test passed and none failed, and carry the titles or code that hold the class.
const FR4_E2E = [
	{ spec: "tests/e2e/tests/owner/properties-table-a11y.e2e.spec.ts", part: "8h (af37b6b5d)", markers: ["the properties table view has zero WCAG 2.1 A/AA violations"] },
	{ spec: "tests/e2e/tests/public/text-contrast-axe.spec.ts", part: "5b (4bed12d10), 7", markers: ["has no text under 4.5:1"] },
	{ spec: "tests/e2e/tests/owner-reflow-320.spec.ts", part: "8e, 8f (the states, the overlay across a viewport change)", markers: ["pages and the states their controls open fit", "the states owner A has no data for fit", "a positioned overlay keeps its place when the viewport changes"] },
	{ spec: "tests/e2e/tests/public/reflow-320.spec.ts", part: "8e (the states)", markers: ["and the states its controls open fit", "a blog post, a blog category and every comparison page fit"] },
	{ spec: "tests/e2e/tests/owner/app-shell-sidebar.spec.ts", part: "8b, 8c (the /properties stat row)", markers: ["/properties stat row at every rail state", "each tile's long figure fits its tile, icons keep their size, and each grid row shares a top"] },
];
// The E2E helpers the states guard stands on (Parts 7 and 8e): read from disk.
const FR4_E2E_HELPERS = [
	{ path: "tests/e2e/lib/reflow-states.ts", part: "8e (the CI states guard's write boundary)", markers: ["export async function blockWrites("] },
	{ path: "tests/e2e/lib/measure.ts", part: "8e (readReflow)", markers: ["readReflow"] },
	{ path: "tests/e2e/lib/reflow.ts", part: "7 (G47, REFLOW_UNLISTED_PAGES)", markers: ["REFLOW_UNLISTED_PAGES"] },
];
// The evidence files this re-freeze measured, each with the field naming its tree.
const FR4_FRESH = [
	["unit-f39-summary.json", (j) => j?.tree],
	["e2e-f39-summary.json", (j) => j?.tree],
	["sweep-f39.json", (j) => j?.tree],
	["replay-f39.json", (j) => j?.tree],
	["deno-f39.json", (j) => j?.tree],
	["edge-bundles-f39.json", (j) => j?.head],
	["csp-f39.json", (j) => j?.tree],
	["probes-diff-f39.json", (j) => j?.head],
	["vendored-inventory-f39.json", (j) => j?.tree],
	["m1-delta.json", (j) => j?.tree],
];
// The CSP the proxy builds (66.2-39 plan Task 2, amended for fix round 4): Parts 8k (acdd96017) and
// 8l (d92ae61c3) changed the gate and the route-prefix matching in src/proxy.ts, so the file is no
// longer byte-identical to PRE_39's. These parts of it, and the private prefixes, must still be:
// the auth prefixes, needsNonceCsp, the theme script hash with buildNonceCsp, the nonce block and
// withCsp. Each is cut from its first line to the line that closes it.
const FR4_CSP_PARTS = [
	{ file: "src/proxy.ts", name: "AUTH_ROUTE_PREFIXES", start: "const AUTH_ROUTE_PREFIXES = ", end: ";\n" },
	{ file: "src/proxy.ts", name: "needsNonceCsp", start: "function needsNonceCsp(", end: "\n}\n" },
	{ file: "src/proxy.ts", name: "THEME_NO_FLASH_SCRIPT_HASH and buildNonceCsp", start: "const THEME_NO_FLASH_SCRIPT_HASH =", end: "\n}\n" },
	{ file: "src/proxy.ts", name: "the per-request nonce block", start: "\tlet nonceCsp: string | undefined;", end: "\n\t}\n" },
	{ file: "src/proxy.ts", name: "withCsp", start: "\tconst withCsp = ", end: "\n\t};\n" },
	{ file: "src/lib/routes/private-routes.ts", name: "PRIVATE_ROUTE_PREFIXES (code lines)", start: "export const PRIVATE_ROUTE_PREFIXES = [", end: "\n] as const;\n", codeOnly: true },
];
// The prefix rule: inline at PRE_39, matchesRoutePrefix since d92ae61c3; the same comparison.
const FR4_PREFIX_RULE = { before: '(prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),', after: "return pathname === prefix || pathname.startsWith(`${prefix}/`);" };

function fr4Cut(text, part) {
	const i = (text ?? "").indexOf(part.start);
	if (i === -1) return null;
	const j = text.indexOf(part.end, i + part.start.length);
	if (j === -1) return null;
	const cut = text.slice(i, j + part.end.length);
	return part.codeOnly ? cut.split("\n").filter((l) => !isCommentLine(l) && l.trim() !== "").join("\n") : cut;
}

function fr4Tree(v) {
	return typeof v === "string" && v.startsWith(FR4_CODE_STATE.slice(0, 9));
}

function fr4E2eSpec(ctx, spec) {
	return Object.entries(ctx.e2e?.specs ?? {}).find(([k]) => k === spec || spec.endsWith(`/${k}`) || k.endsWith(`/${spec.split("/").pop()}`))?.[1] ?? null;
}

function fixRound4Checks(ctx) {
	const c = createCollector("FR-4", "fix-round-4");
	const add = (group, name, pass, expected, measured) => {
		c.add(name, pass, expected, measured);
		c.checks[c.checks.length - 1].group = group;
	};
	for (const g of [...FR4_GUARD_TESTS, ...FR4_WIDENED_TESTS]) {
		const f = (ctx.unit?.files ?? []).find((x) => x.name === g.path);
		const missingTitles = g.titles.filter((t) => !f?.tests?.some((x) => x.title === t && x.status === "passed"));
		const src = ctx.sources?.[g.path] ?? "";
		const missingMarkers = (g.markers ?? []).filter((m) => !src.includes(m));
		const ok = Boolean(f) && f.status === "passed" && f.numTests > 0 && f.numPassed === f.numTests && missingTitles.length === 0 && missingMarkers.length === 0;
		add(`fr4-guard:${g.path}`, `fix round 4 guard ${g.path} (part ${g.part}) present and passing, with its ${g.titles.length} title(s)${g.markers ? " and its code markers" : ""}`, ok, "passed", f ? { status: f.status, numTests: f.numTests, numPassed: f.numPassed, missingTitles, missingMarkers } : MISSING);
	}
	for (const e of FR4_E2E) {
		const s = fr4E2eSpec(ctx, e.spec);
		const src = ctx.sources?.[e.spec] ?? "";
		const missingMarkers = e.markers.filter((m) => !src.includes(m));
		add(`fr4-e2e:${e.spec}`, `fix round 4 E2E spec ${e.spec} (part ${e.part}) ran in the CI set, all passed, with its tests in the source`, Boolean(s) && s.passed > 0 && s.failed === 0 && missingMarkers.length === 0, "passed", s ? { passed: s.passed, failed: s.failed, skipped: s.skipped, missingMarkers } : { spec: MISSING, missingMarkers });
	}
	for (const h of FR4_E2E_HELPERS) {
		const src = ctx.sources?.[h.path] ?? "";
		const missingMarkers = h.markers.filter((m) => !src.includes(m));
		add(`fr4-helper:${h.path}`, `fix round 4 E2E helper ${h.path} (part ${h.part}) still holds its code`, src.length > 0 && missingMarkers.length === 0, "present", { bytes: src.length, missingMarkers });
	}
	const retiredInList = FR3_GUARD_TESTS.some((g) => g.path === FR4_RETIRED_GUARD);
	const retiredInSummary = (ctx.unit?.files ?? []).some((x) => x.name === FR4_RETIRED_GUARD);
	add("fr4-retired", `the retired ${FR4_RETIRED_GUARD.split("/").pop()} is out of FR3_GUARD_TESTS, the tree and the suite, and ${FR4_RETIRED_BY.split("/").pop()} replaces it`, !retiredInList && ctx.retiredExists === false && !retiredInSummary && FR4_GUARD_TESTS.some((g) => g.path === FR4_RETIRED_BY), "retired", { retiredInList, retiredExists: ctx.retiredExists ?? MISSING, retiredInSummary });
	add("fr4-code-state", `the code state is ${FR4_CODE_STATE.slice(0, 9)} (the last commit outside .planning/)`, ctx.codeState === FR4_CODE_STATE, FR4_CODE_STATE, ctx.codeState ?? MISSING);
	const stale = FR4_FRESH.filter(([name, pick]) => !fr4Tree(pick(ctx.evidence?.[name]))).map(([name, pick]) => `${name}: ${pick(ctx.evidence?.[name]) ?? MISSING}`);
	const screenBaselines = [...new Set((ctx.screens ?? []).map((s) => s.baseline))];
	const screensFresh = (ctx.screens ?? []).length > 0 && screenBaselines.length === 1 && screenBaselines[0] === FR4_PREV_FROZEN.slice(0, 9) && (ctx.screens ?? []).every((s) => fr4Tree(s.head));
	const probesFresh = ctx.evidence?.["probes-diff-f39.json"]?.baseline === FR4_PREV_FROZEN.slice(0, 9);
	add("fr4-fresh", `every evidence file this re-freeze owns was measured on ${FR4_CODE_STATE.slice(0, 9)} (nothing carried), and the screenshot and probe diffs against a same-session ${FR4_PREV_FROZEN.slice(0, 9)}`, stale.length === 0 && screensFresh && probesFresh, "all on the code state", { stale, screenBaselines, screensFresh, probesBaseline: ctx.evidence?.["probes-diff-f39.json"]?.baseline ?? MISSING });
	const rp = ctx.evidence?.["replay-f39.json"] ?? {};
	const body = ctx.prBody ?? "";
	const afterMerge = body.slice(Math.max(0, body.indexOf("\n## After merge, in this order\n")));
	const step1 = afterMerge.slice(0, Math.max(0, afterMerge.indexOf("\n2. **Edge Functions**")));
	const version = FR4_MOVE_OUT_MIGRATION.split("_")[0];
	const appliedLine = body.split("\n").some((l) => l.includes(version) && /already applied/.test(l));
	add("fr4-replay", `the replay applies all ${FR_EXPECTED_MIGRATIONS} files from empty, ${FR4_MOVE_OUT_MIGRATION} among them; the PR body records it as already applied and keeps it out of After merge step 1's apply list`, rp.files === FR_EXPECTED_MIGRATIONS && rp.applied === FR_EXPECTED_MIGRATIONS && (ctx.migrationFiles ?? []).includes(FR4_MOVE_OUT_MIGRATION) && FR_REPLAY_GATES.every((g) => rp.gates?.[g] === 0) && step1.length > 0 && !step1.includes(version) && appliedLine, { files: FR_EXPECTED_MIGRATIONS }, { files: rp.files ?? MISSING, applied: rp.applied ?? MISSING, moveOutInTree: (ctx.migrationFiles ?? []).includes(FR4_MOVE_OUT_MIGRATION), inApplyList: step1.includes(version), appliedLine });
	const sw = ctx.evidence?.["sweep-f39.json"] ?? {};
	const shards = Array.isArray(sw.shards) ? sw.shards : [];
	const sweepOk = ctx.sweepRows === FR3_SWEEP_ROWS && sw.rows === FR3_SWEEP_ROWS && sw.caught === FR3_SWEEP_ROWS && sw.vacuous === 0 && sw.notApplied === 0 && sw.restored === true && shards.length === FR3_SHARD_ROWS.length && shards.every((s, i) => s.rows === FR3_SHARD_ROWS[i] && s.caught === s.rows && s.vacuous === 0 && s.notApplied === 0 && s.restored === true) && sw.listing?.rows === FR3_SWEEP_ROWS && sw.listing?.disjoint === true && sw.listing?.equalsUnsharded === true;
	add("fr4-sweep", `the mutation sweep holds ${FR3_SWEEP_ROWS} rows (fix round 4 changed comments only), every one caught unsharded and in shards of ${FR3_SHARD_ROWS.join(", ")}`, sweepOk, { rows: FR3_SWEEP_ROWS, shards: FR3_SHARD_ROWS }, { scriptRows: ctx.sweepRows ?? MISSING, unsharded: `${sw.rows ?? MISSING}/${sw.caught ?? MISSING}`, shards: shards.map((s) => `${s.rows}/${s.caught}`) });
	const dn = ctx.evidence?.["deno-f39.json"] ?? {};
	const exits = Object.values(dn.check?.exits ?? {});
	const denoOk = exits.length === FR3_FUNCTIONS && exits.every((x) => x === 0) && sortedJson(Object.keys(dn.tests ?? {})) === sortedJson(Object.keys(FR4_DENO_TESTS)) && Object.entries(FR4_DENO_TESTS).every(([t, n]) => dn.tests?.[t]?.passed === n && dn.tests?.[t]?.failed === 0);
	add("fr4-deno", `deno check is clean on all ${FR3_FUNCTIONS} functions and the six in-process test files pass at their counts (export-report ${FR4_DENO_TESTS["export-report-test.ts"]})`, denoOk, FR4_DENO_TESTS, { functions: exits.length, tests: dn.tests ?? MISSING });
	const ed = ctx.evidence?.["edge-bundles-f39.json"] ?? {};
	const fns = Array.isArray(ed.functions) ? ed.functions : [];
	const differing = fns.filter((f) => f.bundle === "different").map((f) => f.fn);
	const deployCmd = /deploy-edge-functions\.ts ([a-z0-9 -]+?)`/.exec(body);
	const bodySlugs = deployCmd ? deployCmd[1].trim().split(/\s+/) : [];
	add("fr4-edge", `the redeploy list is exactly the ${FR4_DEPLOY.length} functions whose bundle differs from d9c7329f0 (all ${FR3_FUNCTIONS} bundled), and the PR body's deploy command names exactly them`, fns.length === FR3_FUNCTIONS && fns.every((f) => f.baseExit === 0 && f.headExit === 0) && sortedJson(differing) === sortedJson(FR4_DEPLOY) && sortedJson(ed.deploy ?? []) === sortedJson(FR4_DEPLOY) && sortedJson(bodySlugs) === sortedJson(FR4_DEPLOY), FR4_DEPLOY, { differing, deploy: ed.deploy ?? MISSING, prBodyCommand: bodySlugs });
	const at = ctx.parityAttribution?.fixRound4 ?? {};
	const keyed = [...(at.added ?? []), ...(at.removed ?? []), ...(at.utilityChanged ?? []), ...(at.reversed ?? [])];
	const vdOk = (r) => Array.isArray(r.commits) && r.commits.length > 0 && Array.isArray(r.vd) && r.vd.length > 0 && r.vd.every((v) => FR4_PARITY_LABELS.includes(v) || FR_VD_IDS.includes(v));
	const badKeys = keyed.filter((r) => !vdOk(r));
	const hunks = at.compiledCssOutsideUtilities?.hunks ?? [];
	const badHunks = hunks.filter((h) => !vdOk(h));
	const lists = ctx.parity?.lists ?? {};
	const parityOk = ctx.parity?.counts?.unclassified === 0 && sortedJson(lists["intended:fix-round-4-added"] ?? []) === sortedJson((at.added ?? []).map((r) => r.key)) && sortedJson(lists["intended:fix-round-4-removed"] ?? []) === sortedJson((at.removed ?? []).map((r) => r.key)) && sortedJson(lists["intended:fix-round-4-utility-changed"] ?? []) === sortedJson((at.utilityChanged ?? []).map((r) => r.key)) && keyed.length > 0 && badKeys.length === 0 && hunks.length > 0 && badHunks.length === 0 && (at.reversed ?? []).every((r) => !String(r.reverses).includes("UNEXPLAINED")) && (ctx.parityAttribution?.unattributed ?? []).length === 0;
	add("fr4-parity", "rule parity: every key fix round 4 added, removed, changed or took back, and every compiled-CSS change outside the utilities, has its commit and VD row; the FINAL -> f39 diff classifies exactly those keys as fix round 4's", parityOk, "0 unclassified, 0 unattributed", { unclassified: ctx.parity?.counts?.unclassified ?? MISSING, added: (at.added ?? []).length, removed: (at.removed ?? []).length, utilityChanged: (at.utilityChanged ?? []).length, reversed: (at.reversed ?? []).length, outsideUtilities: hunks.length, badKeys: badKeys.map((r) => r.key), badHunks: badHunks.map((h) => h.block), unattributed: ctx.parityAttribution?.unattributed ?? MISSING });
	const cutsBefore = FR4_CSP_PARTS.map((p) => fr4Cut(ctx.cspSources?.before?.[p.file], p));
	const cutsAfter = FR4_CSP_PARTS.map((p) => fr4Cut(ctx.cspSources?.after?.[p.file], p));
	const changedParts = FR4_CSP_PARTS.filter((p, i) => cutsBefore[i] === null || cutsBefore[i] !== cutsAfter[i]).map((p) => p.name);
	const ruleOk = (ctx.cspSources?.before?.["src/proxy.ts"] ?? "").includes(FR4_PREFIX_RULE.before) && (ctx.cspSources?.after?.["src/lib/routes/private-routes.ts"] ?? "").includes(FR4_PREFIX_RULE.after);
	add("fr4-csp-code", `the CSP the proxy builds is PRE_39's: ${FR4_CSP_PARTS.map((p) => p.name).join(", ")} unchanged, and the prefix rule the same comparison (inline at PRE_39, matchesRoutePrefix now)`, changedParts.length === 0 && ruleOk, "unchanged", { changedParts, ruleOk });
	const csp = ctx.evidence?.["csp-f39.json"] ?? {};
	const hh = csp.headers?.head ?? {};
	const hc = csp.headers?.control ?? {};
	const routes = Object.keys(hh);
	const nonceRoutes = routes.filter((r) => hh[r]?.kind === "nonce");
	const headerDiff = [...new Set([...routes, ...Object.keys(hc)])].filter((r) => JSON.stringify(hh[r]) !== JSON.stringify(hc[r]));
	add("fr4-csp", `the CSP probe: 0 events beyond the control, and every nonce and static route's CSP header (nonce normalized) equal to the same-session ${FR4_PREV_FROZEN.slice(0, 9)}'s`, csp.total === 0 && routes.length > 0 && nonceRoutes.length > 0 && nonceRoutes.every((r) => /'nonce-<n>' 'strict-dynamic'/.test(hh[r].csp ?? "")) && headerDiff.length === 0, "equal", { total: csp.total ?? MISSING, routes: routes.length, nonceRoutes: nonceRoutes.length, headerDiff });
	const sec = body.indexOf(`\n${FR4_SECTION}\n`);
	const fr3 = body.indexOf(`\n${FR3_SECTION}\n`);
	const after = body.indexOf("\n## After merge, in this order\n");
	const bytes = ctx.prBodyBytes ?? Number.POSITIVE_INFINITY;
	add("fr4-pr-body", `the PR body carries the fix-round-4 section after fix round 3 and before After merge, with cycle 3's comment link and no placeholder, in at most ${FR4_BODY_LIMIT} bytes`, sec !== -1 && fr3 !== -1 && after !== -1 && fr3 < sec && sec < after && body.includes(FR4_COMMENT) && !body.includes("<RF4") && bytes <= FR4_BODY_LIMIT, { section: FR4_SECTION, maxBytes: FR4_BODY_LIMIT }, { section: sec, fixRound3: fr3, afterMerge: after, comment: body.includes(FR4_COMMENT), placeholder: body.includes("<RF4"), bytes });
	const diff = ctx.diffPaths ?? [];
	const recorded = (ctx.paths?.paths ?? []).map((p) => `${p.status}\t${p.path}`);
	add("fr4-scope", `fix round 4's code diff ${FR4_BASE.slice(0, 9)}..${FR4_CODE_STATE.slice(0, 9)} equals f39/fix-round-4-paths.json`, diff.length > 0 && sortedJson(recorded) === sortedJson(diff), diff.length, { paths: diff.length, recorded: recorded.length, missing: diff.filter((p) => !recorded.includes(p)).slice(0, 10), extra: recorded.filter((p) => !diff.includes(p)).slice(0, 10) });
	const failedGroups = [...new Set(c.checks.filter((k) => !k.pass).map((k) => k.group))];
	return { mode: "fix-round-4", checks: c.checks, failedGroups, failed: c.checks.filter((k) => !k.pass).length };
}

function readFixRound4Context(dir) {
	const j = (name) => {
		const p = join(dir, name);
		return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null;
	};
	const git = (args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
	const disk = (rel) => (existsSync(join(ROOT, rel)) ? readFileSync(join(ROOT, rel), "utf8") : "");
	const screens = j("screens-diff-f39.json");
	const bodyPath = join(ROOT, FR3_PR_BODY);
	const cspFiles = [...new Set(FR4_CSP_PARTS.map((p) => p.file))];
	return {
		unit: j("unit-f39-summary.json"),
		e2e: j("e2e-f39-summary.json"),
		evidence: Object.fromEntries(FR4_FRESH.map(([name]) => [name, j(name)])),
		screens: Array.isArray(screens) ? screens : [],
		parity: j("css-parity-candidate-css-final-vs-candidate-css-f39.json"),
		parityAttribution: j("css-parity-intended-f39-attribution.json"),
		paths: j("fix-round-4-paths.json"),
		prBody: existsSync(bodyPath) ? readFileSync(bodyPath, "utf8") : null,
		prBodyBytes: existsSync(bodyPath) ? readFileSync(bodyPath).length : null,
		sources: Object.fromEntries([...FR4_GUARD_TESTS, ...FR4_WIDENED_TESTS, ...FR4_E2E_HELPERS].map((g) => [g.path, disk(g.path)]).concat(FR4_E2E.map((e) => [e.spec, disk(e.spec)]))),
		cspSources: { before: Object.fromEntries(cspFiles.map((f) => [f, git(["show", `${PRE_39_SHA}:${f}`])])), after: Object.fromEntries(cspFiles.map((f) => [f, disk(f)])) },
		retiredExists: existsSync(join(ROOT, FR4_RETIRED_GUARD)),
		codeState: git(["log", "-1", "--format=%H", "--", ".", ":(exclude).planning"]).trim(),
		sweepRows: readFileSync(join(ROOT, "scripts/mutation-sweep.sh"), "utf8").split("\n").filter((l) => /^\s*mutate\s/.test(l)).length,
		migrationFiles: readdirSync(join(ROOT, "supabase/migrations")).filter((f) => f.endsWith(".sql")),
		diffPaths: git(["diff", "--name-status", "--no-renames", FR4_BASE, FR4_CODE_STATE, "--", ".", ":(exclude).planning"]).split("\n").filter(Boolean),
	};
}

function fixRound4Fixture() {
	const head = `${FR4_CODE_STATE.slice(0, 9)} (codeStateSha)`;
	const all = [...FR4_GUARD_TESTS, ...FR4_WIDENED_TESTS];
	const files = all.map((g) => ({ name: g.path, status: "passed", numTests: g.titles.length + 1, numPassed: g.titles.length + 1, tests: [...g.titles.map((title) => ({ title, status: "passed" })), { title: "other", status: "passed" }] }));
	const evidence = Object.fromEntries(FR4_FRESH.map(([name]) => [name, { tree: head, head }]));
	evidence["probes-diff-f39.json"].baseline = FR4_PREV_FROZEN.slice(0, 9);
	evidence["sweep-f39.json"] = { tree: head, rows: FR3_SWEEP_ROWS, caught: FR3_SWEEP_ROWS, vacuous: 0, notApplied: 0, restored: true, shards: FR3_SHARD_ROWS.map((rows, i) => ({ shard: i + 1, rows, caught: rows, vacuous: 0, notApplied: 0, restored: true })), listing: { rows: FR3_SWEEP_ROWS, disjoint: true, equalsUnsharded: true } };
	evidence["replay-f39.json"] = { tree: head, files: FR_EXPECTED_MIGRATIONS, applied: FR_EXPECTED_MIGRATIONS, gates: Object.fromEntries(FR_REPLAY_GATES.map((g) => [g, 0])) };
	evidence["deno-f39.json"] = { tree: head, check: { exits: Object.fromEntries(Array.from({ length: FR3_FUNCTIONS }, (_, i) => [`fn${i}`, 0])) }, tests: Object.fromEntries(Object.entries(FR4_DENO_TESTS).map(([t, n]) => [t, { passed: n, failed: 0 }])) };
	evidence["edge-bundles-f39.json"] = { head, deploy: [...FR4_DEPLOY], functions: Array.from({ length: FR3_FUNCTIONS }, (_, i) => ({ fn: i < FR4_DEPLOY.length ? FR4_DEPLOY[i] : `same${i}`, bundle: i < FR4_DEPLOY.length ? "different" : "identical", baseExit: 0, headExit: 0 })) };
	const hdr = { "/login": { kind: "nonce", status: 200, location: null, csp: "default-src 'self'; script-src 'self' 'nonce-<n>' 'strict-dynamic' 'sha256-x'" }, "/": { kind: "static", status: 200, location: null, csp: "" } };
	evidence["csp-f39.json"] = { tree: head, total: 0, headers: { head: structuredClone(hdr), control: structuredClone(hdr) } };
	const version = FR4_MOVE_OUT_MIGRATION.split("_")[0];
	const prBody = `## Summary\n\n${FR3_SECTION}\n\nx\n\n${FR4_SECTION}\n\n${FR4_COMMENT}; \`${version}\` is already applied to production.\n\n## After merge, in this order\n\n1. **Database**: apply \`20261102055400\` first.\n2. **Edge Functions**: \`bun scripts/deploy-edge-functions.ts ${FR4_DEPLOY.join(" ")}\`, then\n`;
	const proxyBefore = `const AUTH_ROUTE_PREFIXES = ["/login", "/auth"];\nfunction isPrivateRoute(p) {\n\treturn X.some(\n\t\t(prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),\n\t);\n}\nfunction needsNonceCsp(pathname: string): boolean {\n\treturn a;\n}\nconst THEME_NO_FLASH_SCRIPT_HASH =\n\t"'sha256-x'";\nfunction buildNonceCsp(nonce: string): string {\n\treturn b;\n}\n\tlet nonceCsp: string | undefined;\n\tif (x) {\n\t\tnonceCsp = y;\n\t}\n\tconst withCsp = (r) => {\n\t\treturn r;\n\t};\n`;
	const routesFile = `export const PRIVATE_ROUTE_PREFIXES = [\n\t"/admin",\n\t// a comment\n] as const;\nexport function matchesRoutePrefix(pathname: string, prefix: string): boolean {\n\treturn pathname === prefix || pathname.startsWith(\`\${prefix}/\`);\n}\n`;
	return {
		unit: { files },
		e2e: { specs: Object.fromEntries(FR4_E2E.map((e) => [e.spec, { passed: 2, failed: 0, skipped: 0 }])) },
		evidence,
		screens: [{ set: "public", capture: "a.png", class: "identical", baseline: FR4_PREV_FROZEN.slice(0, 9), head }],
		parity: { counts: { unclassified: 0 }, lists: { "intended:fix-round-4-added": ["a"], "intended:fix-round-4-removed": ["b"], "intended:fix-round-4-utility-changed": ["u"] } },
		parityAttribution: { fixRound4: { added: [{ key: "a", commits: ["c1 x"], vd: ["VD-161"] }], removed: [{ key: "b", commits: ["c2 y"], vd: ["unrendered"] }], utilityChanged: [{ key: "u", commits: ["c3 z"], vd: ["VD-176"] }], reversed: [{ side: "added", key: "r", reverses: "a fix-round-1 removed key", commits: ["c4 w"], vd: ["VD-170"] }], compiledCssOutsideUtilities: { hunks: [{ block: "@layer base", commits: ["c5 v"], vd: ["VD-160"] }] } }, unattributed: [] },
		paths: { paths: [{ status: "M", path: "src/a.tsx" }, { status: "D", path: "src/b.tsx" }] },
		prBody,
		prBodyBytes: Buffer.byteLength(prBody),
		sources: Object.fromEntries([...all, ...FR4_E2E_HELPERS].map((g) => [g.path, (g.markers ?? []).join("\n")]).concat(FR4_E2E.map((e) => [e.spec, e.markers.join("\n")]))),
		cspSources: { before: { "src/proxy.ts": proxyBefore, "src/lib/routes/private-routes.ts": routesFile.split("export function")[0] }, after: { "src/proxy.ts": proxyBefore.replace('return X.some(\n\t\t(prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),\n\t);', "return matchesAnyRoutePrefix(p, X);"), "src/lib/routes/private-routes.ts": routesFile.replace("// a comment", "// another comment") } },
		retiredExists: false,
		codeState: FR4_CODE_STATE,
		sweepRows: FR3_SWEEP_ROWS,
		migrationFiles: [FR4_MOVE_OUT_MIGRATION],
		diffPaths: ["M\tsrc/a.tsx", "D\tsrc/b.tsx"],
	};
}

// One mutation per group; each must fail exactly that group (the red proof of each check).
const FR4_MUTATIONS = [
	["a new guard test fails", `fr4-guard:${FR4_GUARD_TESTS[0].path}`, (f) => {
		Object.assign(f.unit.files[0], { status: "failed", numPassed: 0 });
	}],
	["a new guard drops a recorded title", `fr4-guard:${FR4_GUARD_TESTS[30].path}`, (f) => {
		f.unit.files[30].tests = f.unit.files[30].tests.filter((t) => t.title !== FR4_GUARD_TESTS[30].titles[0]);
	}],
	["a new guard file is gone", "fr4-guard:src/components/__tests__/no-native-browser-dialogs.test.ts", (f) => {
		f.unit.files = f.unit.files.filter((x) => x.name !== "src/components/__tests__/no-native-browser-dialogs.test.ts");
	}],
	["the paragraph ratchet stops following margins to callers", "fr4-guard:src/components/__tests__/paragraph-base-margin.test.ts", (f) => {
		f.sources["src/components/__tests__/paragraph-base-margin.test.ts"] = 'import { gitBlobId } from "#test/utils/git-blob";';
	}],
	["the list ratchet is no longer blob-keyed", "fr4-guard:src/components/__tests__/list-base-rule-neutralized.test.ts", (f) => {
		f.sources["src/components/__tests__/list-base-rule-neutralized.test.ts"] = "";
	}],
	["robots.test.ts loses the served-path test", "fr4-guard:src/app/robots.test.ts", (f) => {
		const x = f.unit.files.find((y) => y.name === "src/app/robots.test.ts");
		x.tests = x.tests.filter((t) => !t.title.startsWith("every robots-only path is served"));
	}],
	["the properties table axe spec failed in CI's set", "fr4-e2e:tests/e2e/tests/owner/properties-table-a11y.e2e.spec.ts", (f) => {
		f.e2e.specs["tests/e2e/tests/owner/properties-table-a11y.e2e.spec.ts"].failed = 1;
	}],
	["the viewport-change overlay test is gone from the reflow spec", "fr4-e2e:tests/e2e/tests/owner-reflow-320.spec.ts", (f) => {
		f.sources["tests/e2e/tests/owner-reflow-320.spec.ts"] = "pages and the states their controls open fit\nthe states owner A has no data for fit";
	}],
	["the public contrast spec did not run", "fr4-e2e:tests/e2e/tests/public/text-contrast-axe.spec.ts", (f) => {
		delete f.e2e.specs["tests/e2e/tests/public/text-contrast-axe.spec.ts"];
	}],
	["blockWrites is gone from the states helper", "fr4-helper:tests/e2e/lib/reflow-states.ts", (f) => {
		f.sources["tests/e2e/lib/reflow-states.ts"] = "export function other() {}";
	}],
	["the retired guard is back in the round-3 list's place on disk", "fr4-retired", (f) => {
		f.retiredExists = true;
	}],
	["code changed after the freeze", "fr4-code-state", (f) => {
		f.codeState = "0".repeat(40);
	}],
	["the E2E summary is carried from the previous freeze", "fr4-fresh", (f) => {
		f.evidence["e2e-f39-summary.json"].tree = "b7f25511b (codeStateSha)";
	}],
	["the screenshots diffed against 36972318f", "fr4-fresh", (f) => {
		f.screens[0].baseline = "36972318f";
	}],
	["the replay at 357 files", "fr4-replay", (f) => {
		f.evidence["replay-f39.json"].applied = FR_EXPECTED_MIGRATIONS - 1;
	}],
	["the move-out migration back in the apply list", "fr4-replay", (f) => {
		f.prBody = f.prBody.replace("apply `20261102055400` first.", "apply `20261102055400` first, then `20261109141151`.");
	}],
	["a sweep shard not restored", "fr4-sweep", (f) => {
		f.evidence["sweep-f39.json"].shards[3].restored = false;
	}],
	["export-report's Deno count back at 16", "fr4-deno", (f) => {
		f.evidence["deno-f39.json"].tests["export-report-test.ts"].passed = 16;
	}],
	["stripe-webhooks dropped from the PR body's deploy command", "fr4-edge", (f) => {
		f.prBody = f.prBody.replace(" stripe-webhooks`", "`");
	}],
	["a fix-round-4 key with no VD row", "fr4-parity", (f) => {
		f.parityAttribution.fixRound4.added[0].vd = [];
	}],
	["a base-rule change with no commit", "fr4-parity", (f) => {
		f.parityAttribution.fixRound4.compiledCssOutsideUtilities.hunks[0].commits = [];
	}],
	["the theme script hash changed", "fr4-csp-code", (f) => {
		f.cspSources.after["src/proxy.ts"] = f.cspSources.after["src/proxy.ts"].replace("'sha256-x'", "'sha256-y'");
	}],
	["a private prefix dropped", "fr4-csp-code", (f) => {
		f.cspSources.after["src/lib/routes/private-routes.ts"] = f.cspSources.after["src/lib/routes/private-routes.ts"].replace('\t"/admin",\n', "");
	}],
	["a nonce route's CSP header differs from the control's", "fr4-csp", (f) => {
		f.evidence["csp-f39.json"].headers.head["/login"].csp += "; upgrade-insecure-requests";
	}],
	["a placeholder left in the PR body", "fr4-pr-body", (f) => {
		f.prBody = f.prBody.replace("is already applied", "is <RF4: x> already applied");
	}],
	["the PR body over the byte budget", "fr4-pr-body", (f) => {
		f.prBodyBytes = FR4_BODY_LIMIT + 1;
	}],
	["a code path missing from the record", "fr4-scope", (f) => {
		f.diffPaths.push("A\tsrc/c.tsx");
	}],
];

function fixRound4SelfTest(failures) {
	let passed = 0;
	const clean = fixRound4Checks(fixRound4Fixture());
	if (clean.failed === 0) passed++;
	else failures.push(`fix-round-4 clean fixture failed ${JSON.stringify(clean.checks.filter((k) => !k.pass).map((k) => `${k.name}: ${JSON.stringify(k.measured).slice(0, 200)}`))}`);
	for (const [name, group, mutate] of FR4_MUTATIONS) {
		const f = fixRound4Fixture();
		mutate(f);
		const r = fixRound4Checks(f);
		const want = Array.isArray(group) ? group : [group];
		if (sortedJson(r.failedGroups) === sortedJson(want)) passed++;
		else failures.push(`fix-round-4 "${name}": failed groups ${JSON.stringify(r.failedGroups)}, expected ${JSON.stringify(want)}`);
	}
	return passed;
}

// --escape-scan <rev>: fr2EscapeSites over every tracked JS/TS file at <rev> (read with git
// cat-file, the worktree untouched), the red proof of the local CodeQL-clean check on a past tree.
function escapeScanAt(rev) {
	const names = execFileSync("git", ["ls-tree", "-r", "--name-only", rev], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
		.split("\n")
		.filter((p) => FR2_SOURCE_EXTENSIONS.some((e) => p.endsWith(e)));
	const buf = execFileSync("git", ["cat-file", "--batch"], { cwd: ROOT, input: names.map((p) => `${rev}:${p}`).join("\n") + "\n", maxBuffer: 512 * 1024 * 1024 });
	const sites = [];
	const stringSites = [];
	let pos = 0;
	for (const p of names) {
		const nl = buf.indexOf(10, pos);
		const size = Number(buf.subarray(pos, nl).toString("utf8").split(" ")[2]);
		const text = buf.subarray(nl + 1, nl + 1 + size).toString("utf8");
		pos = nl + 1 + size + 1;
		for (const s of fr2EscapeSites(text)) sites.push({ path: p, ...s });
		for (const s of fr2StringEscapeSites(text)) stringSites.push({ path: p, ...s });
	}
	const partial = sites.filter((s) => !s.complete).map((s) => `${s.path}:${s.line} ${s.kind} ${s.body}${s.via ? ` (${s.via})` : ""}`);
	const outside = sites.filter((s) => FR2_TEST_ROOTS.some((r) => s.path.startsWith(r)) && !FR2_ESCAPE_HOMES.includes(s.path)).map((s) => `${s.path}:${s.line}`);
	return { rev, files: names.length, sites: sites.length, partial, escapeHelpersOutsideHomes: outside, stringPatternEscapes: stringSites.map((s) => `${s.path}:${s.line} ${s.body} ${s.reachesRegExp ? `reaches new RegExp (${s.via})` : "does not reach new RegExp"}`) };
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

const fixRound3Dir = arg("--fix-round-3");
if (fixRound3Dir) {
	const out = arg("--out");
	if (!out) {
		console.error("usage: f39-checks.mjs --fix-round-3 <f39-dir> --out <file>");
		process.exit(2);
	}
	const result = fixRound3Checks(readFixRound3Context(fixRound3Dir));
	writeFileSync(out, `${JSON.stringify(result, null, "\t")}\n`);
	for (const k of result.checks.filter((x) => !x.pass)) console.error(`fix-round-3 FAIL: ${k.name}: ${JSON.stringify(k.measured).slice(0, 400)}`);
	console.log(`f39-checks (fix-round-3): ${result.checks.length} checks, ${result.failed} failed`);
	process.exit(result.failed === 0 ? 0 : 1);
}

const fixRound4Dir = arg("--fix-round-4");
if (fixRound4Dir) {
	const out = arg("--out");
	if (!out) {
		console.error("usage: f39-checks.mjs --fix-round-4 <f39-dir> --out <file>");
		process.exit(2);
	}
	const result = fixRound4Checks(readFixRound4Context(fixRound4Dir));
	writeFileSync(out, `${JSON.stringify(result, null, "\t")}\n`);
	for (const k of result.checks.filter((x) => !x.pass)) console.error(`fix-round-4 FAIL: ${k.name}: ${JSON.stringify(k.measured).slice(0, 400)}`);
	console.log(`f39-checks (fix-round-4): ${result.checks.length} checks, ${result.failed} failed`);
	process.exit(result.failed === 0 ? 0 : 1);
}

const escapeRev = arg("--escape-scan");
if (escapeRev) {
	console.log(JSON.stringify(escapeScanAt(escapeRev), null, "\t"));
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
	console.error("usage: f39-checks.mjs --decisions <json> [--probes <json>] [--tokens <json>] --out <file> [--probe-only] [--expect-fail CP-n,...] | --self-test | --lint-body <md> --decisions <json> | --fix-round-1 <f39-dir> --out <file> | --fix-round-2 <f39-dir> --out <file> | --fix-round-3 <f39-dir> --out <file> | --fix-round-4 <f39-dir> --out <file> | --escape-scan <rev>");
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
