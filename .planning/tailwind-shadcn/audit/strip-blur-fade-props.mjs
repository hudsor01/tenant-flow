// BlurFade prop-strip codemod for the Tailwind v4 / shadcn remediation (66.2-27, C12c, D-30).
//
// Usage (from the repo root):
//   node .planning/tailwind-shadcn/audit/strip-blur-fade-props.mjs [--write] [--report <file>]
//   node .planning/tailwind-shadcn/audit/strip-blur-fade-props.mjs --self-test
//
// Purpose: D-30 rebuilds BlurFade as a mount-time CSS entrance, so the visibility-gate props of the
// old component go away from `BlurFadeProps` (src/types/frontend.ts). This tool removes the same
// props from every `<BlurFade …>` opening element, so the narrowed type still typechecks.
//
// Removed attributes (REMOVED): inView, yOffset, blur, onAnimationComplete, variant. `variant` was
// never read by the component and has no call site; listing it keeps the strip exhaustive for the
// type change.
//
// Scope: git-tracked `src/**/*.tsx` files (`git ls-files -z src`, argument array, no shell) whose
// text contains `<BlurFade`. Only `JSXOpeningElement`s whose name is the `JSXIdentifier` `BlurFade`
// are edited; every other element is untouched.
//
// Accuracy: spans come from rolldown `parseAst` (`lang: "tsx"`), never from a regex. Every removed
// attribute requires `text.slice(attr.start, attr.end).startsWith(attr.name.name)` (guards against
// a byte/UTF-16 offset mismatch); a failure throws before any file is written. Each edit starts at
// the run of spaces, tabs and newlines directly before the attribute and ends at the attribute's
// end, so a line that holds only the attribute disappears. Edits are applied per file in
// descending start order; overlapping edits abort the run. A `JSXSpreadAttribute` on a BlurFade
// cannot be proven prop-free: it is reported in `spreads` and the run exits 1.
//
// Default: dry run (no file written). `--write` writes the changed files. `--report <file>` writes
//   { scannedFiles, changedFiles, tags, removed: { inView, yOffset, blur, onAnimationComplete,
//     variant }, spreads, byFile: { <relPath>: [{ attr, line, text }] } }
// where `text` is the removed attribute's own source text. stdout: a one-line summary.
// `--self-test` runs the transform on in-memory fixtures and prints `self-test ok`.
// Exit: 0 on success; 1 on a spread, a self-test mismatch or a span assertion; 2 on a usage error.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const ROOT = process.cwd();
const require = createRequire(path.join(ROOT, "package.json"));
const { parseAst } = await import(require.resolve("rolldown/parseAst"));

export const REMOVED = ["inView", "yOffset", "blur", "onAnimationComplete", "variant"];

function walk(node, visit) {
	if (!node || typeof node !== "object") return;
	if (Array.isArray(node)) {
		for (const child of node) walk(child, visit);
		return;
	}
	if (typeof node.type === "string") visit(node);
	for (const key of Object.keys(node)) {
		if (key === "parent") continue;
		walk(node[key], visit);
	}
}

function lineOf(text, offset) {
	let line = 1;
	for (let i = text.indexOf("\n"); i >= 0 && i < offset; i = text.indexOf("\n", i + 1)) line += 1;
	return line;
}

/** Transforms one file's text. Pure: returns the new text and what it found. */
export function transform(text, relPath) {
	const ast = parseAst(text, { lang: "tsx" }, relPath);
	let tags = 0;
	const spreads = [];
	const edits = [];
	walk(ast, (node) => {
		if (node.type !== "JSXOpeningElement") return;
		if (node.name?.type !== "JSXIdentifier" || node.name.name !== "BlurFade") return;
		tags += 1;
		for (const attr of node.attributes) {
			if (attr.type === "JSXSpreadAttribute") {
				spreads.push({ file: relPath, start: attr.start });
				continue;
			}
			if (attr.type !== "JSXAttribute" || attr.name?.type !== "JSXIdentifier") continue;
			const name = attr.name.name;
			if (!REMOVED.includes(name)) continue;
			const attrText = text.slice(attr.start, attr.end);
			if (!attrText.startsWith(name)) {
				throw new Error(`span assertion failed: ${relPath} at offset ${attr.start} (expected ${name})`);
			}
			let start = attr.start;
			while (start > 0 && /[ \t\r\n]/.test(text[start - 1])) start -= 1;
			edits.push({ attr: name, start, end: attr.end, line: lineOf(text, attr.start), text: attrText });
		}
	});
	edits.sort((a, b) => b.start - a.start);
	for (let i = 1; i < edits.length; i += 1) {
		if (edits[i].end > edits[i - 1].start) {
			throw new Error(`overlapping edits in ${relPath} at offset ${edits[i].start}`);
		}
	}
	let out = text;
	for (const edit of edits) out = out.slice(0, edit.start) + out.slice(edit.end);
	const removed = edits
		.slice()
		.sort((a, b) => a.start - b.start)
		.map(({ attr, line, text: t }) => ({ attr, line, text: t }));
	return { text: out, tags, spreads, removed };
}

function selfTest() {
	const cases = [
		{
			name: "a: bare inView on one line",
			input: "const a = <BlurFade delay={0.1} inView>x</BlurFade>;\n",
			expected: "const a = <BlurFade delay={0.1}>x</BlurFade>;\n",
		},
		{
			name: "b: a line holding only inView disappears",
			input: "const b = (\n\t<BlurFade\n\t\tdelay={0.1}\n\t\tinView\n\t>\n\t\tx\n\t</BlurFade>\n);\n",
			expected: "const b = (\n\t<BlurFade\n\t\tdelay={0.1}\n\t>\n\t\tx\n\t</BlurFade>\n);\n",
		},
		{
			name: "c: valued inView, yOffset and blur",
			input: 'const c = <BlurFade inView={false} yOffset={8} blur="2px" delay={1}>x</BlurFade>;\n',
			expected: "const c = <BlurFade delay={1}>x</BlurFade>;\n",
		},
		{
			name: "d: AST, not regex (a > inside a removed value and a kept value)",
			input:
				'const d = <BlurFade onAnimationComplete={() => done()} className="a > b">x</BlurFade>;\n',
			expected: 'const d = <BlurFade className="a > b">x</BlurFade>;\n',
		},
		{
			name: "e: other elements untouched",
			input: "const e = <Other inView />;\n",
			expected: "const e = <Other inView />;\n",
		},
	];
	const failures = [];
	for (const c of cases) {
		const result = transform(c.input, "fixture.tsx");
		if (result.text !== c.expected) {
			failures.push(`${c.name}\n  got:      ${JSON.stringify(result.text)}\n  expected: ${JSON.stringify(c.expected)}`);
		}
	}
	const spreadCase = transform("const f = <BlurFade {...rest} inView>x</BlurFade>;\n", "fixture.tsx");
	if (spreadCase.spreads.length !== 1) {
		failures.push(`f: spread reported ${spreadCase.spreads.length} times, expected 1`);
	}
	if (failures.length > 0) {
		console.error(`self-test FAILED:\n${failures.join("\n")}`);
		process.exit(1);
	}
	console.log("self-test ok");
}

function parseArgs(argv) {
	const args = { write: false, report: null, selfTest: false };
	for (let i = 0; i < argv.length; i += 1) {
		const a = argv[i];
		if (a === "--write") args.write = true;
		else if (a === "--self-test") args.selfTest = true;
		else if (a === "--report") {
			args.report = argv[i + 1];
			i += 1;
			if (!args.report) {
				console.error("--report needs a file");
				process.exit(2);
			}
		} else {
			console.error(`unknown argument: ${a}`);
			process.exit(2);
		}
	}
	return args;
}

function main() {
	const args = parseArgs(process.argv.slice(2));
	if (args.selfTest) {
		selfTest();
		return;
	}
	const tracked = execFileSync("git", ["ls-files", "-z", "src"], { cwd: ROOT, encoding: "utf8" })
		.split("\0")
		.filter((f) => f.endsWith(".tsx"));
	const report = {
		scannedFiles: 0,
		changedFiles: 0,
		tags: 0,
		removed: Object.fromEntries(REMOVED.map((r) => [r, 0])),
		spreads: [],
		byFile: {},
	};
	const writes = [];
	for (const relPath of tracked) {
		const abs = path.join(ROOT, relPath);
		const text = fs.readFileSync(abs, "utf8");
		if (!text.includes("<BlurFade")) continue;
		report.scannedFiles += 1;
		const result = transform(text, relPath);
		report.tags += result.tags;
		report.spreads.push(...result.spreads);
		if (result.removed.length > 0) {
			report.changedFiles += 1;
			report.byFile[relPath] = result.removed;
			for (const r of result.removed) report.removed[r.attr] += 1;
			writes.push({ abs, text: result.text });
		}
	}
	if (args.write && report.spreads.length === 0) {
		for (const w of writes) fs.writeFileSync(w.abs, w.text);
	}
	if (args.report) {
		fs.mkdirSync(path.dirname(path.resolve(args.report)), { recursive: true });
		fs.writeFileSync(args.report, `${JSON.stringify(report, null, 2)}\n`);
	}
	const removedSummary = REMOVED.map((r) => `${r}=${report.removed[r]}`).join(" ");
	console.log(
		`${args.write && report.spreads.length === 0 ? "written" : "dry-run"}: scannedFiles=${report.scannedFiles} ` +
			`changedFiles=${report.changedFiles} tags=${report.tags} ${removedSummary} spreads=${report.spreads.length}`,
	);
	if (report.spreads.length > 0) process.exit(1);
}

main();
