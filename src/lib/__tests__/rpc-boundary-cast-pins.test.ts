/**
 * Drift guard (TYPE-03, widened in 66.2-39): zero `as unknown as` assertions in
 * first-party code.
 *
 * CLAUDE.md Zero-Tolerance Rule #8 forbids `as unknown as`: the data layer
 * routes through validated mapper functions at the RPC / PostgREST boundary
 * (the canonical reference is `mapDocumentRow` in
 * `src/hooks/api/query-keys/document-keys.ts`), and everything else uses a type
 * guard, a sound annotation or a real value instead of a double assertion.
 *
 * This file first pinned only `src/hooks/api/`. The rule held there while the
 * cast survived elsewhere: the Edge Functions carried three
 * (`stripe-webhooks` writing `event.data` through an untyped client that needed
 * no cast at all, and two `crypto.subtle` feature detections that a widening
 * annotation types without an assertion). Scope is now every first-party code
 * root -- `src/`, `supabase/functions/`, `scripts/` and `tests/`.
 *
 *  - `PRODUCTION` excludes test files; `EVERYTHING` includes them.
 *  - Wholly-comment lines (`//`, `/*`, ` * `) and string literals are skipped,
 *    so prose about the rule and assertions that a source does not contain the
 *    phrase (apply-token-contract.test.ts) do not trip the guard.
 *
 * Failures list the offending `file:line → snippet` so a regression is
 * actionable. Pure filesystem read — never touches the DOM.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const CODE_ROOTS = ["src", "supabase/functions", "scripts", "tests"];
// Built from parts so this file's own code never contains the phrase.
const FORBIDDEN_CAST = ["as", "unknown", "as"].join(" ");
const SKIPPED_DIRS = new Set(["node_modules", ".next", "playwright"]);

interface CodeFile {
	/** Absolute path on disk. */
	readonly absPath: string;
	/** Path relative to the repo root, e.g. "src/hooks/api/query-keys/foo.ts". */
	readonly relPath: string;
}

/** A unit/Deno test or spec, by name or by living in a test directory. */
function isTestFile(relPath: string): boolean {
	return (
		/\.(test|spec)\.tsx?$/.test(relPath) ||
		/-test\.ts$/.test(relPath) ||
		/(^|\/)(__tests__|tests)\//.test(relPath.replace(/^tests\//, ""))
	);
}

function collect(dir: string): CodeFile[] {
	const out: CodeFile[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (SKIPPED_DIRS.has(entry.name)) continue;
		const abs = join(dir, entry.name);
		if (entry.isDirectory()) {
			out.push(...collect(abs));
			continue;
		}
		if (!/\.(ts|tsx|mts|mjs|js)$/.test(entry.name)) continue;
		out.push({ absPath: abs, relPath: relative(ROOT, abs) });
	}
	return out;
}

const EVERYTHING = CODE_ROOTS.flatMap((root) => collect(join(ROOT, root)));
const PRODUCTION = EVERYTHING.filter(
	(f) => !f.relPath.startsWith("tests/") && !isTestFile(f.relPath),
);

/** Is this line wholly a comment? */
function isCommentLine(trimmed: string): boolean {
	return (
		trimmed.startsWith("//") ||
		trimmed.startsWith("*") ||
		trimmed.startsWith("/*")
	);
}

/** The line's code with single-line string literals and a trailing `//` comment removed. */
function codeOf(trimmed: string): string {
	const withoutStrings = trimmed.replace(
		/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g,
		'""',
	);
	return withoutStrings.split("//")[0] ?? withoutStrings;
}

function findViolations(files: readonly CodeFile[]): string[] {
	const violations: string[] = [];
	for (const file of files) {
		const lines = readFileSync(file.absPath, "utf8").split("\n");
		lines.forEach((raw, index) => {
			const trimmed = raw.trim();
			if (trimmed === "" || isCommentLine(trimmed)) return;
			if (codeOf(trimmed).includes(FORBIDDEN_CAST)) {
				violations.push(`${file.relPath}:${index + 1} → ${trimmed}`);
			}
		});
	}
	return violations;
}

describe("TYPE-03 — zero double assertions in first-party code", () => {
	it("walks every code root, production and test files", () => {
		// A walker that silently matched nothing would pass vacuously.
		for (const root of CODE_ROOTS) {
			expect(
				EVERYTHING.some((f) => f.relPath.startsWith(`${root}/`)),
				root,
			).toBe(true);
		}
		expect(PRODUCTION.some((f) => f.relPath.startsWith("src/hooks/api/"))).toBe(
			true,
		);
		expect(
			PRODUCTION.some((f) =>
				f.relPath.startsWith("supabase/functions/_shared/"),
			),
		).toBe(true);
		expect(PRODUCTION.some((f) => f.relPath.includes("__tests__"))).toBe(false);
	});

	it("finds the phrase in code but not in comments or strings", () => {
		expect(codeOf(`const x = y ${FORBIDDEN_CAST} Z;`)).toContain(
			FORBIDDEN_CAST,
		);
		expect(
			codeOf(`expect(src).not.toContain("${FORBIDDEN_CAST}");`),
		).not.toContain(FORBIDDEN_CAST);
		expect(isCommentLine(`// never \`${FORBIDDEN_CAST}\``)).toBe(true);
	});

	it("no double assertion in production code (src, supabase/functions, scripts)", () => {
		const violations = findViolations(PRODUCTION);
		expect(
			violations,
			`Reintroduced double assertion(s) -- use a typed mapper, a type guard or a sound annotation (see mapDocumentRow in document-keys.ts):\n${violations.join("\n")}`,
		).toEqual([]);
	});
});
