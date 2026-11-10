// Vendored-component inventory for the Tailwind v4 / shadcn remediation (wave 5 onward).
// Classifies each src/components/ui/ file as in-sync, divergent or non-registry against the
// fetched new-york-v4 registry item, and checks every divergent file against the divergence
// register (.planning/tailwind-shadcn/registry/divergence-register.json). Read-only against the
// repo except for the --out report; normalized texts and diffs go to --scratch, outside the repo.
//
// Usage (from the repo root):
//   node .planning/tailwind-shadcn/audit/vendored-inventory.mjs --registry-dir <dir>
//        --manifest <file> --register <file> --out <file> [--files <path,...>] [--label <l>]
//        [--scratch <dir>]
//   node .planning/tailwind-shadcn/audit/vendored-inventory.mjs --print-items [--files <path,...>]
//   node .planning/tailwind-shadcn/audit/vendored-inventory.mjs --self-test
//
// Scope: the --files paths, or every .ts/.tsx file under src/components/ui/ (recursive), except
// __tests__/ and *.test.*.
// Item: ITEM_MAP for derivatives; otherwise the basename without its extension. --print-items
// prints the de-duplicated items of the non-derivative files in scope, comma-separated.
// Status: a derivative, or an item whose manifest status is 404, is non-registry. For status 200
// the upstream file is <registry-dir>/<item>/<local basename>, else the item's only file
// (neither: problem no-upstream-file). An item absent from the manifest, or any other status:
// problem not-fetched. Equal normalized texts: in-sync; otherwise divergent.
// Normalization (both texts): drop the "use client" directive, every import declaration and
// every line whose trimmed text starts with //, /* or *; remove `React.`; sort the specifiers of
// every `export { ... }` list by exported name; then `node_modules/.bin/biome format
// --stdin-file-path=<local path>`. The export-name sets are still compared (missingExports).
// Register problems: unregistered-divergence, trim-not-documented (a missing export or data-slot
// that no divergence `what` names as a whole token), bad-reason, missing-ref, item-mismatch,
// stale-entry (an entry for an in-sync or non-registry file, or, without --files, for a path that
// does not exist), bad-register (schema or registry field).
// Output (--out, 2-space JSON, no source text): { label, generatedAt, files: [{ file, item,
//   derivativeOf, registryStatus, status, normalizedDiffHunks, normalizedDiffPath,
//   missingExports, missingDataSlots, registered, divergenceCount }], counts: { inSync,
//   divergent, nonRegistry }, problems: [{ file, kind, detail }] }.
// Exit: 1 when problems is non-empty or a file has no status; 2 on a usage error.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = process.cwd();
const BIOME = path.join(ROOT, "node_modules/.bin/biome");
const UI_DIR = "src/components/ui";
const REASONS = ["D-26 customization", "Phase 19 trim", "upstream drift not adopted (D-05)"];
const ITEM_MAP = {
	"src/components/ui/chart-tooltip.tsx": { derivativeOf: "chart" },
	"src/components/ui/confirm-dialog.tsx": { derivativeOf: "alert-dialog" },
	"src/components/ui/sidebar/context.tsx": { derivativeOf: "sidebar" },
	"src/components/ui/server-sidebar-provider.tsx": { derivativeOf: "sidebar" },
};
const SLOT_RE = /data-slot="([a-z0-9-]+)"/g;

const insideRoot = (p) => {
	const abs = path.resolve(p);
	return abs === ROOT || abs.startsWith(ROOT + path.sep);
};

// ---------- scope ----------
function walk(rootDir, rel) {
	const out = [];
	const abs = path.join(rootDir, rel);
	for (const ent of fs.readdirSync(abs, { withFileTypes: true })) {
		const r = `${rel}/${ent.name}`;
		if (ent.isDirectory()) {
			if (ent.name === "__tests__") continue;
			out.push(...walk(rootDir, r));
		} else if (/\.(ts|tsx)$/.test(ent.name) && !/\.test\./.test(ent.name)) out.push(r);
	}
	return out.sort();
}
const itemOf = (file) => {
	const m = ITEM_MAP[file];
	if (m) return { item: m.derivativeOf, derivativeOf: m.derivativeOf };
	return { item: path.basename(file).replace(/\.(tsx|ts)$/, ""), derivativeOf: null };
};

// ---------- normalization ----------
const exportedName = (spec) => {
	const s = spec.replace(/^type\s+/, "").trim();
	const m = /\sas\s+([A-Za-z0-9_$]+)$/.exec(s);
	return m ? m[1] : s;
};
const sortExportLists = (text) =>
	text.replace(/export\s*(type\s*)?\{([^}]*)\}/g, (_all, typeKw, body) => {
		const specs = body
			.split(",")
			.map((s) => s.replace(/\s+/g, " ").trim())
			.filter(Boolean)
			.sort((a, b) => {
				const x = exportedName(a);
				const y = exportedName(b);
				return x < y ? -1 : x > y ? 1 : 0;
			});
		return `export ${typeKw ? "type " : ""}{ ${specs.join(", ")} }`;
	});
export function preNormalize(text) {
	let s = text.replace(/\r\n/g, "\n");
	s = s.replace(/^\s*["']use client["'];?[ \t]*$/m, "");
	s = s.replace(/^import\s*["'][^"'\n]+["'];?[ \t]*$/gm, "");
	s = s.replace(/^import\s[\s\S]*?\sfrom\s*["'][^"'\n]+["'];?[ \t]*$/gm, "");
	s = s
		.split("\n")
		.filter((line) => {
			const t = line.trim();
			return !(t.startsWith("//") || t.startsWith("/*") || t.startsWith("*"));
		})
		.join("\n");
	s = s.replace(/React\./g, "");
	s = sortExportLists(s);
	return s;
}
function biomeFormat(text, file) {
	const r = spawnSync(BIOME, ["format", `--stdin-file-path=${file}`], { cwd: ROOT, input: text, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
	if (r.status !== 0) return { ok: false, text: `\0biome-error\0${text}`, error: (r.stderr || "").split("\n").slice(0, 3).join(" ") };
	return { ok: true, text: r.stdout };
}
const normalize = (text, file) => biomeFormat(preNormalize(text), file);

// ---------- facts ----------
const exportsOf = (text) => {
	const names = new Set();
	for (const m of text.matchAll(/export\s*(?:type\s*)?\{([^}]*)\}/g)) {
		for (const spec of m[1].split(",").map((s) => s.trim()).filter(Boolean)) names.add(exportedName(spec));
	}
	for (const m of text.matchAll(/export\s+(?:async\s+)?(?:function|const|let|type|interface|class)\s+([A-Za-z0-9_$]+)/g)) names.add(m[1]);
	return [...names].sort();
};
const slotsOf = (text) => {
	const seen = [];
	for (const m of text.matchAll(SLOT_RE)) if (!seen.includes(m[1])) seen.push(m[1]);
	return seen;
};
const namesToken = (what, value) => {
	const esc = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return new RegExp(`(^|[^A-Za-z0-9_-])${esc}($|[^A-Za-z0-9_-])`).test(what);
};

// ---------- core ----------
export function inventory({ root, files, fullScope, registryDir, manifest, register, scratch, label }) {
	const problems = [];
	const rows = [];
	const counts = { inSync: 0, divergent: 0, nonRegistry: 0 };
	const regFiles = register?.files ?? {};
	if (register?.schema !== 1 || register?.registry !== "new-york-v4") problems.push({ file: null, kind: "bad-register", detail: "schema must be 1 and registry new-york-v4" });
	fs.mkdirSync(scratch, { recursive: true });
	for (const file of files) {
		const { item, derivativeOf } = itemOf(file);
		const entry = Object.hasOwn(regFiles, file) ? regFiles[file] : null;
		const m = manifest.items?.[item];
		const row = {
			file,
			item,
			derivativeOf,
			registryStatus: m?.status ?? null,
			status: null,
			normalizedDiffHunks: null,
			normalizedDiffPath: null,
			missingExports: [],
			missingDataSlots: [],
			registered: Boolean(entry),
			divergenceCount: entry?.divergences?.length ?? 0,
		};
		const localText = fs.readFileSync(path.join(root, file), "utf8");
		if (derivativeOf || m?.status === 404) {
			row.status = "non-registry";
		} else if (!m || m.status !== 200) {
			problems.push({ file, kind: "not-fetched", detail: `manifest status ${m?.status ?? "absent"} for item ${item}` });
		} else {
			const base = path.basename(file);
			let upstreamPath = path.join(registryDir, item, base);
			if (!fs.existsSync(upstreamPath) && Array.isArray(m.files) && m.files.length === 1) upstreamPath = path.join(registryDir, item, path.basename(m.files[0].path));
			if (!fs.existsSync(upstreamPath)) {
				problems.push({ file, kind: "no-upstream-file", detail: `no ${base} under ${item}` });
			} else {
				const upText = fs.readFileSync(upstreamPath, "utf8");
				const a = normalize(upText, file);
				const b = normalize(localText, file);
				if (!a.ok || !b.ok) problems.push({ file, kind: "format-error", detail: (a.error || b.error || "").slice(0, 200) });
				const upExports = exportsOf(upText);
				const localExports = exportsOf(localText);
				const upSlots = slotsOf(upText);
				const localSlots = slotsOf(localText);
				row.upstreamExports = upExports;
				row.localExports = localExports;
				row.missingExports = upExports.filter((n) => !localExports.includes(n));
				row.upstreamDataSlots = upSlots;
				row.localDataSlots = localSlots;
				row.missingDataSlots = upSlots.filter((n) => !localSlots.includes(n));
				const safe = file.replace(/[\\/]/g, "__");
				const fa = path.join(scratch, `${safe}.upstream.norm`);
				const fb = path.join(scratch, `${safe}.local.norm`);
				fs.writeFileSync(fa, a.text);
				fs.writeFileSync(fb, b.text);
				const d = spawnSync("git", ["diff", "--no-index", "--no-color", "--unified=0", fa, fb], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
				const diffPath = path.join(scratch, `${safe}.diff`);
				fs.writeFileSync(diffPath, d.stdout ?? "");
				row.normalizedDiffHunks = (d.stdout ?? "").split("\n").filter((l) => l.startsWith("@@")).length;
				row.normalizedDiffPath = diffPath;
				row.status = a.text === b.text ? "in-sync" : "divergent";
			}
		}
		if (row.status === "in-sync") counts.inSync++;
		else if (row.status === "divergent") counts.divergent++;
		else if (row.status === "non-registry") counts.nonRegistry++;

		// register checks
		if (row.status === "divergent" && (!entry || !Array.isArray(entry.divergences) || entry.divergences.length === 0)) {
			problems.push({ file, kind: "unregistered-divergence", detail: `${row.normalizedDiffHunks} normalized hunks, no register entry` });
		}
		if (entry) {
			if ((row.status === "in-sync" || row.status === "non-registry")) problems.push({ file, kind: "stale-entry", detail: `entry for a ${row.status} file` });
			if (entry.item !== item) problems.push({ file, kind: "item-mismatch", detail: `entry item ${entry.item}, computed ${item}` });
			const divs = Array.isArray(entry.divergences) ? entry.divergences : [];
			divs.forEach((dv, i) => {
				if (!REASONS.includes(dv?.reason)) problems.push({ file, kind: "bad-reason", detail: `divergences[${i}].reason ${JSON.stringify(dv?.reason)}` });
				if (typeof dv?.ref !== "string" || dv.ref.trim() === "") problems.push({ file, kind: "missing-ref", detail: `divergences[${i}]` });
			});
			if (row.status === "divergent") {
				for (const v of [...row.missingExports, ...row.missingDataSlots]) {
					if (!divs.some((dv) => typeof dv?.what === "string" && namesToken(dv.what, v))) problems.push({ file, kind: "trim-not-documented", detail: v });
				}
			}
		}
		rows.push(row);
	}
	if (fullScope) {
		for (const p of Object.keys(regFiles)) if (!fs.existsSync(path.join(root, p))) problems.push({ file: p, kind: "stale-entry", detail: "path does not exist" });
	}
	const outRows = rows.map(({ upstreamExports, localExports, upstreamDataSlots, localDataSlots, ...rest }) => rest);
	return { label: label ?? null, generatedAt: new Date().toISOString(), files: outRows, counts, problems, _full: rows };
}

// ---------- self-test ----------
function selfTest() {
	const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vendored-inventory-selftest-"));
	if (insideRoot(tmp)) throw new Error("self-test temp dir is inside the repository");
	const reg = path.join(tmp, "registry");
	const root = path.join(tmp, "root");
	const scratch = path.join(tmp, "scratch");
	const file = "src/components/ui/widget.tsx";
	const tfile = "src/components/ui/tooltip.tsx";
	fs.mkdirSync(path.join(reg, "widget"), { recursive: true });
	fs.mkdirSync(path.join(reg, "tooltip"), { recursive: true });
	fs.mkdirSync(path.join(root, UI_DIR), { recursive: true });
	const manifest = {
		items: {
			widget: { status: 200, files: [{ path: "registry/new-york-v4/ui/widget.tsx" }] },
			tooltip: { status: 200, files: [{ path: "registry/new-york-v4/ui/tooltip.tsx" }] },
		},
	};
	const upstream = [
		'import * as React from "react"',
		'import { cn } from "@/lib/utils"',
		"",
		'function Widget({ className, ...props }: React.ComponentProps<"div">) {',
		'  return <div data-slot="widget" className={cn("flex gap-2", className)} {...props} />',
		"}",
		"",
		"export { Widget }",
		"",
	].join("\n");
	const local = [
		'import type { ComponentProps } from "react";',
		"",
		'import { cn } from "#lib/utils";',
		"",
		"// local note",
		'function Widget({ className, ...props }: ComponentProps<"div">) {',
		'\treturn <div data-slot="widget" className={cn("flex gap-2", className)} {...props} />;',
		"}",
		"",
		"export { Widget };",
		"",
	].join("\n");
	const upstreamExtra = upstream.replace("export { Widget }", 'function WidgetPart() {\n  return <span data-slot="widget-part" />\n}\n\nexport { Widget, WidgetPart }');
	const tipBody = [
		'function Tooltip(props: React.ComponentProps<"div">) {\n  return <div data-slot="tooltip" {...props} />\n}',
		'function TooltipTrigger(props: React.ComponentProps<"button">) {\n  return <button data-slot="tooltip-trigger" {...props} />\n}',
		'function TooltipContent(props: React.ComponentProps<"div">) {\n  return <div data-slot="tooltip-content" {...props} />\n}',
		'function TooltipProvider(props: React.ComponentProps<"div">) {\n  return <div data-slot="tooltip-provider" {...props} />\n}',
	].join("\n\n");
	const tipUp = `import * as React from "react"\n\n${tipBody}\n\nexport { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }\n`;
	const tipLocal = `import type { ComponentProps } from "react";\n\n${tipBody.replace(/React\./g, "")}\n\nexport {\n\tTooltip,\n\tTooltipContent,\n\tTooltipProvider,\n\tTooltipTrigger,\n};\n`;
	const tipLocalDrop = tipLocal.replace("\tTooltipTrigger,\n", "");

	const run = (up, loc, register, f = file, item = "widget") => {
		fs.writeFileSync(path.join(reg, item, path.basename(f)), up);
		fs.writeFileSync(path.join(root, f), loc);
		fs.rmSync(scratch, { recursive: true, force: true });
		return inventory({ root, files: [f], fullScope: false, registryDir: reg, manifest, register, scratch, label: "self-test" });
	};
	const reg0 = { schema: 1, registry: "new-york-v4", files: {} };
	const entry = (divergences) => ({ schema: 1, registry: "new-york-v4", files: { [file]: { item: "widget", plan: "self-test", divergences } } });
	const kinds = (r) => r.problems.map((p) => p.kind);
	const changed = local.replace("flex gap-2", "flex gap-3");
	const results = [];
	const check = (name, ok, r) => results.push({ name, ok, detail: ok ? undefined : JSON.stringify({ status: r.files[0]?.status, problems: r.problems, missingExports: r.files[0]?.missingExports }) });

	let r = run(upstream, local, reg0);
	check("(a) import form and React. prefix alone stay in-sync", r.files[0].status === "in-sync" && r.problems.length === 0, r);
	r = run(upstream, changed, reg0);
	check("(b) class change with no entry is unregistered-divergence", r.files[0].status === "divergent" && kinds(r).includes("unregistered-divergence"), r);
	r = run(upstream, changed, entry([{ what: "gap-3 instead of gap-2", reason: "D-26 customization", ref: "D-26" }]));
	check("(c) class change with a valid entry has no problem", r.files[0].status === "divergent" && r.problems.length === 0, r);
	r = run(upstreamExtra, changed, entry([{ what: "gap-3 instead of gap-2", reason: "D-26 customization", ref: "D-26" }]));
	check("(d) undocumented missing export is trim-not-documented", kinds(r).includes("trim-not-documented") && r.problems.some((p) => p.detail === "WidgetPart"), r);
	r = run(upstream, changed, entry([{ what: "gap-3 instead of gap-2", reason: "because", ref: "D-26" }]));
	check("(e) reason outside the three strings is bad-reason", kinds(r).includes("bad-reason"), r);
	r = run(upstream, local, entry([{ what: "nothing", reason: "D-26 customization", ref: "D-26" }]));
	check("(f) entry on an in-sync file is stale-entry", r.files[0].status === "in-sync" && kinds(r).includes("stale-entry"), r);
	r = run(tipUp, tipLocal, reg0, tfile, "tooltip");
	const gOrder = r.files[0].status === "in-sync" && r.problems.length === 0;
	const r2 = run(tipUp, tipLocalDrop, reg0, tfile, "tooltip");
	check("(g) export-list order alone stays in-sync; a dropped name is still a missing export", gOrder && r2.files[0].missingExports.includes("TooltipTrigger"), gOrder ? r2 : r);

	fs.rmSync(tmp, { recursive: true, force: true });
	const passed = results.filter((x) => x.ok).length;
	for (const x of results) if (!x.ok) console.error(`FAIL ${x.name}: ${x.detail}`);
	if (passed === results.length) {
		console.log(`vendored-inventory self-test: ${passed} passed`);
		process.exit(0);
	}
	console.log(`vendored-inventory self-test: ${passed} passed, ${results.length - passed} failed`);
	process.exit(1);
}

// ---------- cli ----------
const usage = () => {
	console.error(
		"usage: vendored-inventory.mjs --registry-dir <dir> --manifest <file> --register <file> --out <file> [--files a,b] [--label l] [--scratch dir] | --print-items [--files a,b] | --self-test",
	);
	process.exit(2);
};
const isMain = process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname;
if (isMain) {
	const argv = process.argv.slice(2);
	const opt = {};
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === "--self-test") opt.selfTest = true;
		else if (a === "--print-items") opt.printItems = true;
		else if (["--registry-dir", "--manifest", "--register", "--out", "--files", "--label", "--scratch"].includes(a)) opt[a.slice(2)] = argv[++i];
		else usage();
	}
	if (opt.selfTest) selfTest();
	const fullScope = !opt.files;
	const files = opt.files ? opt.files.split(",").map((s) => s.trim()).filter(Boolean) : walk(ROOT, UI_DIR);
	for (const f of files) {
		if (!f.startsWith(`${UI_DIR}/`) || !fs.existsSync(path.join(ROOT, f))) {
			console.error(`vendored-inventory: not a file under ${UI_DIR}/: ${f}`);
			process.exit(2);
		}
	}
	if (opt.printItems) {
		const items = [...new Set(files.map(itemOf).filter((x) => !x.derivativeOf).map((x) => x.item))];
		console.log(items.join(","));
		process.exit(0);
	}
	if (!opt["registry-dir"] || !opt.manifest || !opt.register || !opt.out) usage();
	const scratch = path.resolve(opt.scratch ?? path.join(os.tmpdir(), "vendored-inventory"));
	if (insideRoot(scratch)) {
		console.error("vendored-inventory: --scratch must resolve outside the repository");
		process.exit(2);
	}
	const manifest = JSON.parse(fs.readFileSync(opt.manifest, "utf8"));
	const register = JSON.parse(fs.readFileSync(opt.register, "utf8"));
	const rep = inventory({ root: ROOT, files, fullScope, registryDir: path.resolve(opt["registry-dir"]), manifest, register, scratch, label: opt.label });
	const { _full, ...report } = rep;
	fs.mkdirSync(path.dirname(path.resolve(opt.out)), { recursive: true });
	fs.writeFileSync(opt.out, `${JSON.stringify(report, null, 2)}\n`);
	console.log(JSON.stringify({ counts: report.counts, problems: report.problems.length }));
	for (const p of report.problems) console.error(`${p.kind}\t${p.file}\t${p.detail}`);
	process.exit(report.problems.length || report.files.some((f) => !f.status) ? 1 : 0);
}
