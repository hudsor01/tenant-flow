/**
 * Drift guard (66.2-39): every hook, query leaf, key-factory entry and mutation
 * factory in `src/hooks/api/` has a production caller.
 *
 * `reportAnalyticsQueries.paymentAnalytics`, its `reportKeys` entry and
 * `usePaymentAnalytics` had none: only their own test called them, so the test
 * suite kept code alive that no screen or export ran (and it read snake_case
 * keys `get_billing_insights` never returns). The sweep that found them found
 * 74 more hooks, leaves, key entries and mutation factories with no caller, all
 * deleted in the same change. This keeps the class from coming back.
 *
 * What counts, read from the source text:
 *  - a HOOK is an exported top-level `use*` function in `src/hooks/api/`; it
 *    needs a reference in a production file other than its own;
 *  - a LEAF is an exported top-level `*Query` function there; same rule;
 *  - a MEMBER is a first-level member of an exported object literal named
 *    `*Queries`, `*Keys` or `*Mutations` there; `<object>.<member>` (or the same
 *    through an alias such as `export const x = y`) must appear on a production
 *    line other than the member's own definition. A key read only by a live leaf
 *    in the same file counts, which is how key factories are built.
 *
 * Production means every non-test `.ts`/`.tsx` file under `src/` and
 * `supabase/functions/`, minus the generated `src/types/supabase.ts`. Wholly
 * comment lines (`//`, `/*`, ` * `) do not count as callers: a doc comment that
 * names a deleted leaf kept `financialQueries.monthly` looking alive.
 *
 * Pure filesystem read. A failure lists each symbol and where it is defined.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const HOOKS_API = "src/hooks/api/";

function isTestFile(relPath: string): boolean {
	return (
		/\.(test|spec)\.tsx?$/.test(relPath) ||
		/(^|\/)__tests__\//.test(relPath) ||
		relPath.startsWith("src/test/")
	);
}

function collect(dir: string): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (entry.name === "node_modules") continue;
		const abs = join(dir, entry.name);
		if (entry.isDirectory()) {
			out.push(...collect(abs));
		} else if (/\.tsx?$/.test(entry.name)) {
			out.push(relative(ROOT, abs));
		}
	}
	return out;
}

const PRODUCTION = ["src", "supabase/functions"]
	.flatMap((root) => collect(join(ROOT, root)))
	.filter((f) => !isTestFile(f) && f !== "src/types/supabase.ts")
	.sort();

/** Each production file's code lines: `[lineNumber, text]`, comments dropped. */
const CODE_LINES = new Map<string, Array<readonly [number, string]>>(
	PRODUCTION.map((f) => {
		const lines = readFileSync(join(ROOT, f), "utf8").split("\n");
		const code: Array<readonly [number, string]> = [];
		lines.forEach((text, i) => {
			const trimmed = text.trim();
			if (
				trimmed.startsWith("//") ||
				trimmed.startsWith("*") ||
				trimmed.startsWith("/*")
			) {
				return;
			}
			code.push([i + 1, text]);
		});
		return [f, code];
	}),
);

function escapeRegExp(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** `export const alias = name;` and `name as alias` re-exports, by name. */
function aliasesOf(name: string): string[] {
	const out = new Set<string>([name]);
	const constAlias = new RegExp(
		`^export\\s+const\\s+(\\w+)\\s*=\\s*${escapeRegExp(name)}\\s*;`,
	);
	const asAlias = new RegExp(`\\b${escapeRegExp(name)}\\s+as\\s+(\\w+)`);
	for (const code of CODE_LINES.values()) {
		for (const [, text] of code) {
			const m = constAlias.exec(text) ?? asAlias.exec(text);
			if (m?.[1]) out.add(m[1]);
		}
	}
	return [...out];
}

/** Production `file:line`s matching `pattern`, minus one excluded line. */
function references(
	pattern: RegExp,
	exclude?: { file: string; line: number },
): string[] {
	const hits: string[] = [];
	for (const [file, code] of CODE_LINES) {
		for (const [line, text] of code) {
			if (exclude && file === exclude.file && line === exclude.line) continue;
			if (pattern.test(text)) hits.push(`${file}:${line}`);
		}
	}
	return hits;
}

/** The text of the object literal opening at `open` (index of its `{`). */
function objectBody(text: string, open: number): string {
	let depth = 0;
	for (let i = open; i < text.length; i++) {
		if (text[i] === "{") depth++;
		else if (text[i] === "}" && --depth === 0) return text.slice(open, i + 1);
	}
	return text.slice(open);
}

interface DataLayerSymbol {
	readonly name: string;
	readonly file: string;
	readonly line: number;
	readonly callers: string[];
}

function sweep(): DataLayerSymbol[] {
	const symbols: DataLayerSymbol[] = [];
	for (const file of PRODUCTION.filter((f) => f.startsWith(HOOKS_API))) {
		const text = readFileSync(join(ROOT, file), "utf8");
		const lineOf = (index: number) => text.slice(0, index).split("\n").length;

		for (const m of text.matchAll(
			/^export\s+(?:async\s+)?(?:function|const)\s+((?:use[A-Z]\w*)|(?:\w+Query))\b/gm,
		)) {
			const name = m[1] ?? "";
			const names = aliasesOf(name).map(escapeRegExp).join("|");
			const callers = references(new RegExp(`\\b(?:${names})\\b`)).filter(
				(hit) => !hit.startsWith(`${file}:`),
			);
			symbols.push({ name, file, line: lineOf(m.index ?? 0), callers });
		}

		for (const m of text.matchAll(
			/^export\s+const\s+(\w+(?:Queries|Keys|Mutations))\s*(?::[^=]+)?=\s*\{/gm,
		)) {
			const object = m[1] ?? "";
			const open = text.indexOf("{", (m.index ?? 0) + m[0].length - 1);
			const body = objectBody(text, open);
			const objects = aliasesOf(object).map(escapeRegExp).join("|");
			for (const mm of body.matchAll(/^\t([A-Za-z_$][\w$]*)\s*[:(]/gm)) {
				const member = mm[1] ?? "";
				const line = lineOf(open + (mm.index ?? 0));
				const callers = references(
					new RegExp(`\\b(?:${objects})\\.${escapeRegExp(member)}\\b`),
					{ file, line },
				);
				symbols.push({ name: `${object}.${member}`, file, line, callers });
			}
		}
	}
	return symbols;
}

const SYMBOLS = sweep();

describe("src/hooks/api has no code without a production caller", () => {
	it("examines the data layer (the sweep is not vacuous)", () => {
		// Hundreds of hooks, leaves and key entries; a parser regression that
		// matched nothing would otherwise pass the check below.
		expect(SYMBOLS.length).toBeGreaterThan(300);
		expect(SYMBOLS.map((s) => s.name)).toEqual(
			expect.arrayContaining([
				"useBalanceSheet",
				"financialQueries.balanceSheet",
				"financialKeys.balanceSheet",
				"analyticsQueries.ownerPaymentSummary",
			]),
		);
	});

	it("every hook, leaf, key entry and mutation factory is called from production code", () => {
		const uncalled = SYMBOLS.filter((s) => s.callers.length === 0).map(
			(s) => `${s.name} (${s.file}:${s.line})`,
		);
		expect(uncalled).toEqual([]);
	});
});
