/**
 * No first-party source places a "$" by hand in front of a number.
 *
 * A hand-placed symbol puts a negative value's sign after it: the Net Income
 * and Cash Flow cards on /analytics/financial rendered -250 as "$-250",
 * because a "$" span sat in front of `NumberTicker` (66.2-39). Money is
 * `formatCurrency` (Intl's currency style, "-$250") or `NumberTicker` with
 * `currency`, which formats every frame the same way.
 *
 * The scan flags, in every tracked non-test `.ts`/`.tsx` file under `src/`:
 *   - JSX text "$" followed, across whitespace and newlines, by an expression
 *     container (`${value}`, `$\n{value}`);
 *   - a "$" element right before a `<NumberTicker` (`<span>$</span><NumberTicker`);
 *   - a literal "$" in front of an interpolation in a template literal
 *     (`` `$${value}` ``).
 * It lexes just enough to tell those apart from a template literal's own
 * `${...}`: comments, quoted strings (which cannot span a line), and template
 * literals with their nested interpolations. A "$" that labels an input or a
 * printed blank (no number after it) is not flagged.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Whether the "/" at `index` opens a regex literal rather than dividing: the
 * previous significant character is an operator or opening punctuation, or
 * the previous word is a keyword that takes an expression.
 */
function startsRegex(source: string, index: number): boolean {
	const before = source.slice(Math.max(0, index - 40), index).trimEnd();
	const last = before.at(-1);
	if (last === undefined) return true;
	if ("(,=:[!&|?{};+-*%~^".includes(last)) return true;
	return /\b(return|typeof|case|in|of|void|yield|await)$/.test(before);
}

/** Line numbers (1-based) of every hand-placed "$" in `source`. */
function handPlacedDollarLines(source: string): number[] {
	const lines: number[] = [];
	const lineAt = (index: number) => source.slice(0, index).split("\n").length;
	// Each frame: "code" (with its brace depth inside a `${}`) or "template".
	const stack: { kind: "code" | "template"; depth: number }[] = [
		{ kind: "code", depth: 0 },
	];
	let i = 0;
	while (i < source.length) {
		const frame = stack[stack.length - 1] ?? { kind: "code", depth: 0 };
		const ch = source[i];
		const next = source[i + 1];
		if (frame.kind === "template") {
			if (ch === "\\") {
				i += 2;
				continue;
			}
			if (ch === "`") {
				stack.pop();
				i += 1;
				continue;
			}
			if (ch === "$" && next === "{") {
				stack.push({ kind: "code", depth: 0 });
				i += 2;
				continue;
			}
			if (ch === "$" && next === "$" && source[i + 2] === "{") {
				lines.push(lineAt(i));
			}
			i += 1;
			continue;
		}
		if (ch === "/" && next === "/") {
			const end = source.indexOf("\n", i);
			i = end < 0 ? source.length : end;
			continue;
		}
		if (ch === "/" && next === "*") {
			const end = source.indexOf("*/", i + 2);
			i = end < 0 ? source.length : end + 2;
			continue;
		}
		if (ch === "/" && startsRegex(source, i)) {
			// A regex literal: to its closing slash, past escapes and classes.
			let j = i + 1;
			let inClass = false;
			while (j < source.length && source[j] !== "\n") {
				const c = source[j];
				if (c === "\\") {
					j += 2;
					continue;
				}
				if (c === "[") inClass = true;
				if (c === "]") inClass = false;
				if (c === "/" && !inClass) break;
				j += 1;
			}
			i = j + 1;
			continue;
		}
		if (ch === '"' || ch === "'") {
			let j = i + 1;
			while (j < source.length && source[j] !== ch && source[j] !== "\n") {
				j += source[j] === "\\" ? 2 : 1;
			}
			i = j + 1;
			continue;
		}
		if (ch === "`") {
			stack.push({ kind: "template", depth: 0 });
			i += 1;
			continue;
		}
		if (ch === "{") frame.depth += 1;
		if (ch === "}") {
			if (frame.depth === 0 && stack.length > 1) {
				stack.pop();
				i += 1;
				continue;
			}
			frame.depth -= 1;
		}
		if (ch === "$" && !/[\w$]/.test(source[i - 1] ?? "")) {
			const after = source.slice(i + 1, i + 200);
			if (/^\s*\{/.test(after) || /^\s*<\/\w+>\s*<NumberTicker\b/.test(after)) {
				lines.push(lineAt(i));
			}
		}
		i += 1;
	}
	return lines;
}

function trackedSourceFiles(): string[] {
	const out = execFileSync("git", ["ls-files", "-z", "--", "src"], {
		cwd: process.cwd(),
		encoding: "utf8",
		maxBuffer: 64 * 1024 * 1024,
	});
	return out
		.split("\0")
		.filter((path) => /\.(ts|tsx)$/.test(path))
		.filter((path) => !/(^|\/)__tests__\/|\.test\.tsx?$/.test(path));
}

function readOrNull(path: string): string | null {
	try {
		return readFileSync(path, "utf8");
	} catch {
		// Tracked but deleted in the working tree: nothing to scan.
		return null;
	}
}

describe("hand-placed currency symbols", () => {
	it("flags each shape it describes", () => {
		const planted = [
			"<span>${lease.rent_amount}/mo</span>",
			"<StatValue>\n\t$\n\t{total.toLocaleString()}\n</StatValue>",
			'<span className="text-lg">$</span>\n<NumberTicker value={x} />',
			"const label = `$${amount.toFixed(2)}`;",
			"const nested = `a ${`$${b}`} c`;",
		];
		for (const source of planted) {
			expect(handPlacedDollarLines(source), source).toHaveLength(1);
		}
	});

	it("passes interpolations, labels and blanks that are not a number", () => {
		const clean = [
			"const html = `<td>${escapeHtml(formatCurrency(rent))}</td>`;",
			"const url = `${base}/${path}`;",
			'<span className="text-sm">$</span>\n<span className="inline-block w-20 border-b" />',
			'<span className="absolute left-3">\n\t$\n</span>\n<Input type="number" />',
			"// Never `$${x}` in a comment",
			'const s = "$" + "{"; placeholder: "$",',
			"<p>{formatCurrency(-250)}</p>",
			"const $state = { a: 1 };",
			'const row = `"${e.row}","${e.error.replace(/"/g, \'""\')}"`;',
			"<span>{formatCurrency(rent)}/month</span>",
		];
		for (const source of clean) {
			expect(handPlacedDollarLines(source), source).toEqual([]);
		}
	});

	it("finds none in first-party source", () => {
		const files = trackedSourceFiles();
		expect(files.length).toBeGreaterThan(500);
		const hits: string[] = [];
		for (const path of files) {
			const source = readOrNull(path);
			if (source === null) continue;
			for (const line of handPlacedDollarLines(source)) {
				hits.push(`${path}:${line}  ${source.split("\n")[line - 1]?.trim()}`);
			}
		}
		expect(
			hits,
			`hand-placed "$" (use formatCurrency, or NumberTicker with currency):\n${hits.join("\n")}`,
		).toEqual([]);
	});
});
