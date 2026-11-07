// Slot-only diff prover for the Tailwind v4 / shadcn remediation (wave 5 component sync).
// Proves that a vendored file differs from a base git revision only by added data-slot
// attributes, plus any declared exact-substring replacements. Read-only against the repo.
//
// Usage (from the repo root):
//   node .planning/tailwind-shadcn/audit/slot-diff.mjs --base <rev> [--root <dir>]
//        [--manifest <file>] [--item <file>=<item>]... [--replace "<file>::<old>::<new>"]...
//        <file>...
//
// For each repo-relative <file>:
//   base text    = `git show <rev>:<file>` (run in cwd)
//   current text = <root>/<file> (default root = cwd)
//   1. Every /\s+data-slot="([a-z0-9-]+)"/g match is collected (addedSlots, in order) and removed
//      from the current text.
//   2. Each --replace for that file is applied to the base text as an exact substring
//      replacement that must match exactly once; otherwise the file fails with replace-miss.
//   3. Both texts are normalized with `<cwd>/node_modules/.bin/biome format --stdin-file-path=<file>`
//      and compared. The Biome mode is calibrated first: format(base) must equal base for the
//      first file; if it does not, every comparison falls back to a whitespace-free mode that
//      also drops a `(` directly before `<` after `return`/`=>` and a `)` directly after a JSX
//      close. `mode` in the output records which ran.
//   4. With --manifest, every collected slot must appear in
//      manifest.items[<item>].files[*].dataSlots; <item> = the file basename without .tsx/.ts
//      unless --item overrides it. Values not found are unknownSlots.
// Output (stdout): { base, mode, files: [{ file, equal, addedSlots, unknownSlots,
//   replacementsApplied, problems }] }.
// Exit: 1 when any file is not equal, has unknownSlots or a replace-miss; 2 on a usage error.
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const BIOME = path.join(ROOT, "node_modules/.bin/biome");
const SLOT_RE = /\s+data-slot="([a-z0-9-]+)"/g;

const usage = () => {
	console.error(
		'usage: slot-diff.mjs --base <rev> [--root <dir>] [--manifest <file>] [--item <file>=<item>]... [--replace "<file>::<old>::<new>"]... <file>...',
	);
	process.exit(2);
};

const argv = process.argv.slice(2);
let base = null;
let root = ROOT;
let manifestPath = null;
const itemOverride = new Map();
const replaces = [];
const files = [];
for (let i = 0; i < argv.length; i++) {
	const a = argv[i];
	if (a === "--base") base = argv[++i];
	else if (a === "--root") root = path.resolve(argv[++i] ?? "");
	else if (a === "--manifest") manifestPath = argv[++i];
	else if (a === "--item") {
		const v = argv[++i] ?? "";
		const at = v.lastIndexOf("=");
		if (at <= 0) usage();
		itemOverride.set(v.slice(0, at), v.slice(at + 1));
	} else if (a === "--replace") {
		const parts = (argv[++i] ?? "").split("::");
		if (parts.length !== 3) usage();
		replaces.push({ file: parts[0], old: parts[1], new: parts[2] });
	} else if (a.startsWith("--")) usage();
	else files.push(a);
}
if (!base || files.length === 0) usage();
const manifest = manifestPath ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : null;

const gitShow = (rev, file) => execFileSync("git", ["show", `${rev}:${file}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const biomeFormat = (text, file) => {
	const r = spawnSync(BIOME, ["format", `--stdin-file-path=${file}`], { cwd: ROOT, input: text, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
	if (r.status !== 0) return null;
	return r.stdout;
};
const wsFree = (text) =>
	text
		.replace(/(return|=>)\s*\(\s*(?=<)/g, "$1")
		.replace(/(\/>|<\/[A-Za-z0-9.]*>)\s*\)/g, "$1")
		.replace(/\s+/g, "");

// Calibration on the first file's base text.
let mode = "biome-stdin";
{
	const first = gitShow(base, files[0]);
	const f = biomeFormat(first, files[0]);
	if (f !== first) mode = "whitespace-free";
}
const normalize = (text, file) => {
	if (mode === "biome-stdin") {
		const f = biomeFormat(text, file);
		return f ?? `\0biome-error\0${text}`;
	}
	return wsFree(text);
};

const allowedSlots = (file) => {
	if (!manifest) return null;
	const item = itemOverride.get(file) ?? path.basename(file).replace(/\.(tsx|ts)$/, "");
	const entry = manifest.items?.[item];
	if (!entry || !Array.isArray(entry.files)) return { item, slots: new Set() };
	return { item, slots: new Set(entry.files.flatMap((f) => f.dataSlots ?? [])) };
};

const out = { base, mode, files: [] };
let failed = false;
for (const file of files) {
	const problems = [];
	let baseText;
	try {
		baseText = gitShow(base, file);
	} catch {
		problems.push("base-missing");
		baseText = "";
	}
	let cur;
	try {
		cur = fs.readFileSync(path.join(root, file), "utf8");
	} catch {
		problems.push("current-missing");
		cur = "";
	}
	const addedSlots = [...cur.matchAll(SLOT_RE)].map((m) => m[1]);
	const stripped = cur.replace(SLOT_RE, "");
	let replacementsApplied = 0;
	for (const r of replaces.filter((x) => x.file === file)) {
		const n = baseText.split(r.old).length - 1;
		if (n !== 1) {
			problems.push(`replace-miss: ${JSON.stringify(r.old)} matched ${n} times`);
			continue;
		}
		baseText = baseText.replace(r.old, () => r.new);
		replacementsApplied++;
	}
	const equal = problems.length === 0 && normalize(baseText, file) === normalize(stripped, file);
	const allow = allowedSlots(file);
	const unknownSlots = allow ? addedSlots.filter((s) => !allow.slots.has(s)) : [];
	if (!equal || unknownSlots.length || problems.length) failed = true;
	out.files.push({ file, equal, addedSlots, unknownSlots, replacementsApplied, problems });
}
console.log(JSON.stringify(out, null, 2));
process.exit(failed ? 1 : 0);
