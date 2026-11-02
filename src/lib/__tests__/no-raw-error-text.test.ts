/**
 * No raw error text reaches the screen.
 *
 * Toasts, error states and inline messages showed an error's own text: a
 * PostgREST message ("permission denied for table leases"), a mapper's
 * developer message, a status line ("Bad Gateway"), or a response body
 * embedded in a thrown Error ("PDF generation failed: {"error":...}"). The
 * canonical path is `handleMutationError` for a toast and
 * `userFacingErrorMessage` (the one sanitizer, `#lib/mutation-error-handler`)
 * wherever else an error is shown; a query's error state shows its own copy,
 * because a query error is never product copy.
 *
 * Covered here, over every non-test `src/**\/*.{ts,tsx}`, the shapes the
 * 66.2-39 part I AST sweep found (every read of `.message`, `.error`,
 * `.details`, `.hint`, `.statusText` or `.reason` reaching a toast, JSX, a
 * state setter or a thrown Error):
 *   1. a toast call that reads an error's `.message`, `.statusText` or a
 *      response body's `.error`;
 *   2. JSX that renders `x instanceof Error ? x.message : ...`;
 *   3. a thrown Error built from a response's text or status line, or a
 *      response read that substitutes its status line for a missing error.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");

function sourceFiles(dir: string): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const abs = join(dir, entry.name);
		if (entry.isDirectory()) {
			if (!["__tests__", "test", "mocks"].includes(entry.name)) {
				out.push(...sourceFiles(abs));
			}
		} else if (
			/\.(ts|tsx)$/.test(entry.name) &&
			!/\.(test|spec)\.(ts|tsx)$/.test(entry.name) &&
			!entry.name.endsWith(".d.ts")
		) {
			out.push(abs);
		}
	}
	return out;
}

/** The text of every `toast(...)` / `toast.x(...)` call's arguments. */
function toastArguments(source: string): { at: number; text: string }[] {
	const out: { at: number; text: string }[] = [];
	for (const match of source.matchAll(/\btoast(?:\.\w+)?\(/g)) {
		const open = match.index + match[0].length - 1;
		let depth = 0;
		for (let i = open; i < source.length; i++) {
			const ch = source[i];
			if (ch === "(") depth++;
			else if (ch === ")") {
				depth--;
				if (depth === 0) {
					out.push({ at: match.index, text: source.slice(open + 1, i) });
					break;
				}
			}
		}
	}
	return out;
}

const RAW_IN_TOAST =
	/\.(?:message|statusText)\b|\b(?:body|err|error|data|json|result)\??\.error\b|\.text\(\)/;
const RAW_IN_JSX =
	/\{\s*[\w.?]+\s+instanceof\s+Error\s*\?\s*[\w.?]+\.message\b/g;
const RAW_IN_THROW =
	/new\s+Error\(\s*`[^`]*\$\{\s*(?:errText|errorText|text|[\w.?]*statusText)\s*\}|\.catch\(\s*\(\)\s*=>\s*\(\s*\{\s*error:\s*[\w.]+\.statusText/g;

function lineOf(source: string, index: number): number {
	return source.slice(0, index).split("\n").length;
}

function rawErrorText(files: ReadonlyMap<string, string>): string[] {
	const hits: string[] = [];
	for (const [path, source] of files) {
		for (const call of toastArguments(source)) {
			if (RAW_IN_TOAST.test(call.text)) {
				hits.push(
					`${path}:${lineOf(source, call.at)} toast reads an error's text`,
				);
			}
		}
		if (path.endsWith(".tsx")) {
			for (const match of source.matchAll(RAW_IN_JSX)) {
				hits.push(
					`${path}:${lineOf(source, match.index)} JSX renders error.message`,
				);
			}
		}
		for (const match of source.matchAll(RAW_IN_THROW)) {
			hits.push(
				`${path}:${lineOf(source, match.index)} an error built from response text`,
			);
		}
	}
	return hits;
}

describe("no raw error text on screen", () => {
	const files = new Map(
		sourceFiles(SRC).map((abs) => [
			relative(process.cwd(), abs),
			readFileSync(abs, "utf8"),
		]),
	);

	it("scans the toasts", () => {
		let toasts = 0;
		for (const source of files.values())
			toasts += toastArguments(source).length;
		expect(toasts).toBeGreaterThan(150);
	});

	it("flags each shape, and passes sanitized and logged text", () => {
		const planted = new Map([
			["a.ts", 'toast.error("Failed", {\n\tdescription: err.message,\n});'],
			["b.tsx", '<p>{error instanceof Error ? error.message : "Failed"}</p>'],
			[
				"c.ts",
				"const t = await r.text();\nthrow new Error(`PDF failed: ${errText}`);",
			],
			[
				"d.ts",
				"const b = await r.json().catch(() => ({ error: r.statusText }));",
			],
			[
				"e.ts",
				'toast.error("Failed", { description: userFacingErrorMessage(err) });',
			],
			[
				"f.tsx",
				'logger.error("x", { error: error instanceof Error ? error.message : "" });',
			],
		]);
		expect(rawErrorText(planted)).toEqual([
			"a.ts:1 toast reads an error's text",
			"b.tsx:1 JSX renders error.message",
			"c.ts:2 an error built from response text",
			"d.ts:1 an error built from response text",
		]);
	});

	it("finds none in src/", () => {
		const hits = rawErrorText(files);
		expect(
			hits,
			`raw error text on screen -- use handleMutationError or userFacingErrorMessage:\n${hits.join("\n")}`,
		).toEqual([]);
	});
});
