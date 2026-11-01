// VD-01..VD-37 proof table for the Tailwind v4 / shadcn remediation (66.2-37), consumed by 66.2-38
// and 66.2-39. Read-only: it reads the persisted final gate artifacts and writes one JSON report.
//
// Usage (from the repo root):
//   node .planning/tailwind-shadcn/audit/vd-register.mjs --final <dir> --w4 <dir> --out <file>
//   node .planning/tailwind-shadcn/audit/vd-register.mjs --self-test
//
// Every row of the UI-SPEC "Intended Visual Deltas" register maps to proofs drawn from its Proof
// column. A proof has a kind:
//   json   a measured value in a final artifact (file + key path + predicate)
//   claim  a claim id that passed in claims-final.json (w5-claims.mjs)
//   assert a `PASS <id>` line in a named assertion output (w6-assertions, source-assertions-w2)
//   unit   a test file suffix + title pattern in unit-final-summary.json with status passed
//   e2e    a spec file suffix + title pattern in e2e-final-summary.json with status expected
// A row passes only when every one of its proofs passes and at least one is of a measured kind
// (json, claim, unit or e2e); class presence in source never proves a row.
// Output: { rows: [{ id, wave, proofs: [{ kind, ref, pass, measured }], pass }], failed }; exit 1
// when failed > 0. --self-test builds an in-memory input set that passes one row of each proof
// kind, flips one measured value per kind and asserts that exactly that row fails.
import fs from "node:fs";
import path from "node:path";

const get = (obj, keys) => keys.reduce((o, k) => (o == null ? undefined : o[k]), obj);
const near = (a, b, tol) => typeof a === "number" && Math.abs(a - b) <= tol;
const within1 = (rgb, target) => Array.isArray(rgb) && target.every((v, i) => near(rgb[i], v, 1));

// ---------- proof constructors ----------
const json = (file, keys, test, ref) => ({ kind: "json", file, keys, test, ref: ref ?? `${file}:${keys.join(".")}` });
const claim = (id) => ({ kind: "claim", id, ref: `claims-final.json:${id}` });
const assertLine = (file, id) => ({ kind: "assert", file, id, ref: `${file}:PASS ${id}` });
const unit = (file, title) => ({ kind: "unit", file, title, ref: `${file} :: ${title}` });
const e2e = (file, title, project) => ({ kind: "e2e", file, title, project, ref: `${file}${project ? ` [${project}]` : ""} :: ${title}` });

const SIDEBAR_SPEC = "tests/e2e/tests/owner/app-shell-sidebar.spec.ts";
const RENDER = "render-final.json";
const PROBES = "probes-final.json";
const contrastAtLeast = (mode, key, min) => json(RENDER, ["contrast", mode, key], (v) => typeof v === "number" && v >= min, `${RENDER}:contrast.${mode}["${key}"] >= ${min}`);
const stubFont = (mode, key, prefix) => json(RENDER, ["fonts", mode, key], (v) => typeof v === "string" && v.startsWith(prefix), `${RENDER}:fonts.${mode}.${key} starts ${prefix}`);
const DOCK = "quick-actions-dock-centering";
const dockOk = (r) => r && r.sidebarWidthToken === "14rem" && near(r.expandedLeft, r.viewportWidth / 2 + 112, 1) && near(r.collapsedLeft, r.viewportWidth / 2, 1) && near(r.reExpandedLeft, r.expandedLeft, 1) && r.collapsedAttr === "offcanvas" && r.transitionProperty === "left" && r.transitionDuration === "0.2s" && r.transitionTimingFunction === "linear";

export const VD_PROOFS = {
	"VD-01": { wave: 1, proofs: [json(RENDER, ["secondaryPixel", "light"], (v) => within1(v, [222, 243, 255]), `${RENDER}:secondaryPixel.light within 1 of 222,243,255`)] },
	"VD-02": { wave: 1, proofs: [json(RENDER, ["touch390", "switch"], (v) => v && near(v.width, 32, 0.5) && near(v.height, 18.4, 0.5), `${RENDER}:touch390.switch 32x18.4 (0.5)`)] },
	"VD-03": {
		wave: 1,
		proofs: [
			json(RENDER, ["touch390", "buttonSecondary"], (v) => v && v.height >= 44 && v.padding === "8px 16px", `${RENDER}:touch390.buttonSecondary >= 44px, padding 8px 16px`),
			json(RENDER, ["touch390", "iconButton"], (v) => v && near(v.width, 44, 0.5) && near(v.height, 44, 0.5) && v.padding === "0px", `${RENDER}:touch390.iconButton 44x44, padding 0`),
			json(RENDER, ["touch390", "input"], (v) => v && near(v.height, 44, 0.5) && v.padding === "4px 12px", `${RENDER}:touch390.input 44px, padding 4px 12px`),
			e2e("tests/e2e/tests/public/apply-token.spec.ts", /E-2: every applicant input renders exactly 48px tall at 375px/),
			e2e("tests/e2e/tests/public/apply-token.spec.ts", /E-3: every textarea renders at least 96px tall at 375px/),
		],
	},
	"VD-04": { wave: 1, proofs: [e2e("tests/e2e/tests/owner/applications.spec.ts", /E-22: the status tabs fit or scroll in place at 375px/, "owner-axe")] },
	"VD-05": { wave: 1, proofs: [stubFont("light", "html", "Stubfontroboto"), stubFont("dark", "html", "Stubfontroboto"), json(RENDER, ["globalError", "fontVarsOn"], (v) => v === "html", `${RENDER}:globalError.fontVarsOn == html`)] },
	"VD-06": { wave: 1, proofs: [stubFont("light", "fontMono", "Stubfontgeistmono"), stubFont("dark", "fontMono", "Stubfontgeistmono")] },
	"VD-07": { wave: 1, proofs: [stubFont("light", "codeTag", "Stubfontgeistmono"), stubFont("dark", "codeTag", "Stubfontgeistmono")] },
	"VD-08": {
		wave: 1,
		proofs: ["light", "dark"].flatMap((m) => [contrastAtLeast(m, "renew-lease heading", 4.5), contrastAtLeast(m, "renew-lease body", 4.5), contrastAtLeast(m, "renew-lease icon", 3)]),
	},
	"VD-09": {
		wave: 1,
		proofs: [
			json("redproof-head-final.json", ["guards", "G4", "count"], (v) => v === 0, "redproof-head-final.json:guards.G4.count == 0 (no light-only black-alpha token)"),
			json("token-parity-final.json", ["cumulative", "deletedNotZero"], (v) => Array.isArray(v) && v.length === 0, "token-parity-final.json:cumulative.deletedNotZero empty (the 12 label/fill/separator tokens are gone)"),
		],
	},
	"VD-10": {
		wave: 1,
		proofs: ["lease template preview", "admin blog review"].flatMap((s) => ["h2", "p", "strong", "a"].map((t) => contrastAtLeast("dark", `${s} ${t}`, 13.5))),
	},
	"VD-11": {
		wave: 1,
		proofs: ["border-beam-grid", "border-beam-stats"].flatMap((id) => ["light", "dark"].map((m) => json(PROBES, ["results", id, m, "afterBackgroundImage"], (v) => typeof v === "string" && v !== "none", `${PROBES}:results.${id}.${m}.afterBackgroundImage != none`))),
	},
	"VD-12": { wave: 2, proofs: [json("owner-loading-final.json", ["captures"], (v) => Array.isArray(v) && v.length === 4 && v.every((c) => c.allPass === true), "owner-loading-final.json:(.captures|length)==4 and all(.captures[].allPass)")] },
	"VD-13": {
		wave: 4,
		proofs: [
			json("redproof-head-final.json", ["guards", "G8", "count"], (v) => v === 0, "redproof-head-final.json:guards.G8.count == 0"),
			{ kind: "json", file: "@w4/pair-parity-w4.json", keys: [], test: (v) => v && v.counts?.unproven === 0 && Array.isArray(v.pairs) && v.pairs.length === v.total && v.pairs.every((p) => ["text-equal", "computed-equal", "rem-for-px"].includes(p.class)), ref: "w4/pair-parity-w4.json: every pair text-equal, computed-equal or rem-for-px, unproven 0" },
		],
	},
	"VD-14": { wave: 5, proofs: [claim("C1")] },
	"VD-15": { wave: 5, proofs: [claim("C7")] },
	"VD-16": { wave: 5, proofs: [claim("C2")] },
	"VD-17": { wave: 5, proofs: [claim("C2")] },
	"VD-18": { wave: 5, proofs: [claim("C3")] },
	"VD-19": { wave: 5, proofs: [claim("C9")] },
	"VD-20": { wave: 5, proofs: [claim("C9")] },
	"VD-21": { wave: 5, proofs: [claim("C12b")] },
	"VD-22": { wave: 5, proofs: [claim("C12a")] },
	"VD-23": { wave: 5, proofs: [claim("C12c")] },
	"VD-24": { wave: 5, proofs: [claim("C4")] },
	"VD-25": { wave: 5, proofs: [claim("C4")] },
	"VD-26": { wave: 6, proofs: [e2e(SIDEBAR_SPEC, /VD-26\/VD-34: hover never underlines/, "owner-axe"), assertLine("w6-assertions-final.txt", "S-NEUTRALIZE")] },
	"VD-27": { wave: 6, proofs: [unit("src/components/shell/__tests__/main-nav.test.tsx", /opens Reports on a Reports route and marks the current sub link/), unit("src/components/shell/__tests__/main-nav.test.tsx", /opens Reports without a click when the pathname moves into it/), e2e(SIDEBAR_SPEC, /VD-27\/VD-35: active section open/, "owner-axe")] },
	"VD-28": { wave: 6, proofs: [unit("src/components/shell/__tests__/main-nav.test.tsx", /holds exactly the Settings and Help & Support links/), unit("src/components/shell/__tests__/main-nav.test.tsx", /marks Settings current on a settings route/), unit("src/components/shell/__tests__/main-nav.test.tsx", /drops the dead shortcuts item and its kbd hint/), assertLine("w6-assertions-final.txt", "S-NAV")] },
	"VD-29": { wave: 6, proofs: [e2e(SIDEBAR_SPEC, /D-34\/D-52\/D-36: collapse controls, shortcut guards, cookie and SSR state/, "owner-axe"), e2e(SIDEBAR_SPEC, /S12\/VD-37: collapsed rail is inert and skipped by Tab/, "owner-axe"), assertLine("w6-assertions-final.txt", "S-COLLAPSE")] },
	"VD-30": { wave: 5, proofs: [claim("N1")] },
	"VD-31": { wave: 6, proofs: [unit("src/components/shell/__tests__/app-shell.test.tsx", /names the header trigger and reports the expanded rail/), unit("src/components/ui/__tests__/sidebar.test.tsx", /SidebarTrigger toggles, reports aria-expanded, calls onClick and persists the cookie/), e2e(SIDEBAR_SPEC, /S-2\/S-9: geometry, list neutralizers and locked navigation/, "owner-axe")] },
	"VD-32": { wave: 6, proofs: [e2e(SIDEBAR_SPEC, /open: named Radix dialog, 288px, focus moves in and stays trapped/, "owner-axe"), e2e(SIDEBAR_SPEC, /every close path returns focus to the trigger/, "owner-axe")] },
	"VD-33": { wave: 6, proofs: [e2e(SIDEBAR_SPEC, /every sheet row is at least 44px below 48rem \(VD-33\)/, "owner-axe")] },
	"VD-34": { wave: 6, proofs: [e2e(SIDEBAR_SPEC, /VD-26\/VD-34: hover never underlines, current row keeps its tint, focus ring/, "owner-axe")] },
	"VD-35": { wave: 6, proofs: [e2e(SIDEBAR_SPEC, /VD-27\/VD-35: active section open, sub rows and pinned footer/, "owner-axe")] },
	"VD-36": { wave: 6, proofs: [unit("src/components/tours/__tests__/sidebar-tour-target.test.ts", /targets the trigger when the sidebar is a sheet/), e2e(SIDEBAR_SPEC, /step 5 sits below the trigger with the menu copy/, "owner-axe"), e2e(SIDEBAR_SPEC, /1280px expanded: step 5 sits right of the rail with the rail copy/, "owner-axe")] },
	"VD-37": {
		wave: 6,
		proofs: [
			json(PROBES, ["results", DOCK, "light"], dockOk, `${PROBES}:results.${DOCK}.light meets the 66.2-35 thresholds`),
			json(PROBES, ["results", DOCK, "dark"], dockOk, `${PROBES}:results.${DOCK}.dark meets the 66.2-35 thresholds`),
			e2e(SIDEBAR_SPEC, /S12\/VD-37: collapsed rail is inert and skipped by Tab; dock re-centers/, "owner-axe"),
			assertLine("w6-assertions-final.txt", "S-DOCK"),
		],
	},
};
const MEASURED = new Set(["json", "claim", "unit", "e2e"]);

// ---------- evaluation over an input set ----------
// inputs = { files: { "<name>": parsed JSON | text }, w4: { "<name>": parsed JSON } }
const evaluateProof = (p, inputs) => {
	if (p.kind === "json") {
		const doc = p.file.startsWith("@w4/") ? inputs.w4[p.file.slice(4)] : inputs.files[p.file];
		const v = doc === undefined ? undefined : p.keys.length ? get(doc, p.keys) : doc;
		const shown = p.keys.length ? v : { counts: v?.counts, total: v?.total };
		return { pass: v !== undefined && Boolean(p.test(v)), measured: v === undefined ? "missing" : shown };
	}
	if (p.kind === "claim") {
		const c = inputs.files["claims-final.json"]?.claims?.find((x) => x.id === p.id);
		return { pass: c?.pass === true, measured: c ? { pass: c.pass, checks: c.checks.length, failedChecks: c.checks.filter((k) => !k.pass).length } : "missing" };
	}
	if (p.kind === "assert") {
		const text = inputs.files[p.file] ?? "";
		const line = text.split("\n").find((l) => l.startsWith(`PASS ${p.id} `) || l.startsWith(`FAIL ${p.id} `)) ?? null;
		return { pass: Boolean(line?.startsWith("PASS ")), measured: line ?? "missing" };
	}
	if (p.kind === "unit") {
		const f = inputs.files["unit-final-summary.json"]?.files?.find((x) => x.name.endsWith(p.file));
		const hits = (f?.tests ?? []).filter((t) => p.title.test(t.title));
		return { pass: f?.status === "passed" && hits.length > 0 && hits.every((t) => t.status === "passed"), measured: f ? { fileStatus: f.status, matched: hits.map((t) => `${t.status}: ${t.title}`).slice(0, 3), matchedCount: hits.length } : "missing" };
	}
	if (p.kind === "e2e") {
		const hits = (inputs.files["e2e-final-summary.json"]?.tests ?? []).filter((t) => t.file.endsWith(p.file) && p.title.test(t.title) && (!p.project || t.project === p.project));
		return { pass: hits.length > 0 && hits.every((t) => t.status === "expected"), measured: { matched: hits.map((t) => `${t.status}: [${t.project}] ${t.title}`).slice(0, 4), matchedCount: hits.length } };
	}
	return { pass: false, measured: `unknown kind ${p.kind}` };
};
export const evaluate = (table, inputs) => {
	const rows = Object.entries(table).map(([id, row]) => {
		const proofs = row.proofs.map((p) => ({ kind: p.kind, ref: p.ref, ...evaluateProof(p, inputs) }));
		const pass = proofs.length > 0 && proofs.every((p) => p.pass) && proofs.some((p) => MEASURED.has(p.kind));
		return { id, wave: row.wave, proofs, pass };
	});
	return { rows, failed: rows.filter((r) => !r.pass).length };
};

// ---------- self-test ----------
function selfTest() {
	const pick = { json: "VD-01", claim: "VD-14", assert: "VD-26", unit: "VD-28", e2e: "VD-04" };
	const table = Object.fromEntries(Object.values(pick).map((id) => [id, VD_PROOFS[id]]));
	const base = () => ({
		files: {
			"render-final.json": { secondaryPixel: { light: [222, 243, 255] } },
			"claims-final.json": { claims: [{ id: "C1", pass: true, checks: [{ pass: true }] }] },
			"w6-assertions-final.txt": "PASS S-NEUTRALIZE 2 checks\nPASS S-NAV 4 checks\n",
			"unit-final-summary.json": {
				files: [
					{
						name: "src/components/shell/__tests__/main-nav.test.tsx",
						status: "passed",
						tests: ["holds exactly the Settings and Help & Support links", "marks Settings current on a settings route", "drops the dead shortcuts item and its kbd hint"].map((t) => ({ title: `MainNav footer ${t}`, status: "passed" })),
					},
				],
			},
			"e2e-final-summary.json": {
				tests: [
					{ file: "tests/e2e/tests/owner/applications.spec.ts", project: "owner-axe", title: "/applications > E-22: the status tabs fit or scroll in place at 375px, scroll at 320px", status: "expected" },
					{ file: SIDEBAR_SPEC, project: "owner-axe", title: "desktop rail at 1280px > VD-26/VD-34: hover never underlines, current row keeps its tint, focus ring", status: "expected" },
				],
			},
		},
		w4: {},
	});
	const flips = {
		json: (i) => (i.files["render-final.json"].secondaryPixel.light = [255, 0, 255]),
		claim: (i) => (i.files["claims-final.json"].claims[0].pass = false),
		assert: (i) => (i.files["w6-assertions-final.txt"] = i.files["w6-assertions-final.txt"].replace("PASS S-NEUTRALIZE 2 checks", "FAIL S-NEUTRALIZE missing: no-underline")),
		unit: (i) => (i.files["unit-final-summary.json"].files[0].tests[0].status = "failed"),
		e2e: (i) => (i.files["e2e-final-summary.json"].tests[0].status = "unexpected"),
	};
	let passed = 0;
	const fail = (msg) => {
		console.error(`vd-register self-test FAILED: ${msg}`);
		process.exit(1);
	};
	const clean = evaluate(table, base());
	if (clean.failed !== 0) fail(`the clean input set fails ${clean.rows.filter((r) => !r.pass).map((r) => r.id).join(", ")}`);
	passed++;
	for (const [kind, flip] of Object.entries(flips)) {
		const inputs = base();
		flip(inputs);
		const r = evaluate(table, inputs);
		const failing = r.rows.filter((x) => !x.pass).map((x) => x.id);
		if (failing.length !== 1 || failing[0] !== pick[kind]) fail(`flipping the ${kind} value failed [${failing.join(", ")}], expected exactly ${pick[kind]}`);
		passed++;
	}
	// A row whose only proof is an assert line is not proven (no measured kind).
	const assertOnly = evaluate({ X: { wave: 0, proofs: [assertLine("w6-assertions-final.txt", "S-NEUTRALIZE")] } }, base());
	if (assertOnly.failed !== 1) fail("an assert-only row passed without a measured proof");
	passed++;
	if (Object.keys(VD_PROOFS).length !== 37) fail(`VD_PROOFS has ${Object.keys(VD_PROOFS).length} rows, expected 37`);
	passed++;
	console.log(`vd-register self-test: ${passed} passed`);
}

// ---------- main ----------
const argv = process.argv.slice(2);
if (argv.includes("--self-test")) {
	selfTest();
	process.exit(0);
}
const arg = (name) => {
	const i = argv.indexOf(name);
	return i >= 0 ? argv[i + 1] : null;
};
const finalDir = arg("--final");
const w4Dir = arg("--w4");
const out = arg("--out");
if (!finalDir || !w4Dir || !out) {
	console.error("usage: vd-register.mjs --final <dir> --w4 <dir> --out <file> | --self-test");
	process.exit(2);
}
const load = (dir, name) => {
	const f = path.join(dir, name);
	if (!fs.existsSync(f)) return undefined;
	const text = fs.readFileSync(f, "utf8");
	return name.endsWith(".json") ? JSON.parse(text) : text;
};
const fileNames = new Set(Object.values(VD_PROOFS).flatMap((r) => r.proofs.map((p) => (p.kind === "claim" ? "claims-final.json" : p.kind === "unit" ? "unit-final-summary.json" : p.kind === "e2e" ? "e2e-final-summary.json" : p.file))));
const inputs = { files: {}, w4: {} };
for (const name of fileNames) {
	if (name.startsWith("@w4/")) inputs.w4[name.slice(4)] = load(w4Dir, name.slice(4));
	else inputs.files[name] = load(finalDir, name);
}
const result = evaluate(VD_PROOFS, inputs);
fs.writeFileSync(out, `${JSON.stringify(result, null, 1)}\n`);
for (const r of result.rows) console.log(`${r.pass ? "PASS" : "FAIL"} ${r.id} (wave ${r.wave}) ${[...new Set(r.proofs.map((p) => p.kind))].join(",")}`);
console.log(`vd-register: ${result.rows.length - result.failed}/${result.rows.length} rows proven`);
process.exit(result.failed === 0 ? 0 : 1);
