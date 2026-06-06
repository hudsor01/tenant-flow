/**
 * Drift guard (TYPE-03, Phase 2): zero `as unknown as` casts at the
 * PostgREST/RPC boundaries under `src/hooks/api/`.
 *
 * CLAUDE.md Zero-Tolerance Rule #8 forbids `as unknown as` type assertions —
 * the data layer must route through validated mapper functions at the RPC /
 * PostgREST boundary instead (the canonical reference is `mapDocumentRow` in
 * `src/hooks/api/query-keys/document-keys.ts`). The 2026-05-29 audit flagged
 * this violation; it is already resolved (only comment/docstring mentions and
 * legitimate test-mock `fetch` casts remain). This test PINS that state so the
 * violation cannot silently return.
 *
 * Scope: production source under `src/hooks/api/` only.
 *  - `*.test.ts` / `*.test.tsx` / `*.spec.ts` are EXCLUDED — test-mock casts
 *    like `fetchMock as unknown as typeof fetch` are legitimate test
 *    scaffolding, not production boundary code.
 *  - Wholly-comment lines (`//`, `/*`, ` * `) are SKIPPED so the docstring /
 *    comment mentions of the rule (e.g. "...never `as unknown as`") don't trip
 *    the guard.
 *  - The library-shim casts (chart-tooltip / slider) live under
 *    `src/components/ui/`, NOT `src/hooks/api/`, so this scan is naturally
 *    clean on the production-boundary surface.
 *
 * Failures list the offending `file:line → snippet` so a regression is
 * actionable. Pure filesystem read — never touches the DOM.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const HOOKS_API_DIR = join(process.cwd(), "src", "hooks", "api");
const FORBIDDEN_CAST = "as unknown as";

interface BoundaryFile {
	/** Absolute path on disk. */
	readonly absPath: string;
	/** Path relative to the repo root, e.g. "src/hooks/api/query-keys/foo.ts". */
	readonly relPath: string;
}

/** A `*.test.ts`/`*.test.tsx`/`*.spec.ts(x)` file — test scaffolding, excluded. */
function isTestFile(name: string): boolean {
	return /\.(test|spec)\.tsx?$/.test(name);
}

/** Recursively collect production `.ts`/`.tsx` files under `src/hooks/api/`. */
function collectBoundaryFiles(dir: string): BoundaryFile[] {
	const out: BoundaryFile[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const abs = join(dir, entry.name);
		if (entry.isDirectory()) {
			out.push(...collectBoundaryFiles(abs));
			continue;
		}
		if (!/\.tsx?$/.test(entry.name)) continue;
		if (isTestFile(entry.name)) continue;
		out.push({ absPath: abs, relPath: relative(process.cwd(), abs) });
	}
	return out;
}

/**
 * Is this line wholly a comment? We strip the production-boundary scope to
 * actual code, so docstring / comment mentions of the rule (the only current
 * matches under `src/hooks/api/`) don't register as violations.
 */
function isCommentLine(trimmed: string): boolean {
	return (
		trimmed.startsWith("//") ||
		trimmed.startsWith("*") ||
		trimmed.startsWith("/*")
	);
}

function findViolations(files: BoundaryFile[]): string[] {
	const violations: string[] = [];
	for (const file of files) {
		const lines = readFileSync(file.absPath, "utf8").split("\n");
		lines.forEach((raw, index) => {
			const trimmed = raw.trim();
			if (trimmed === "" || isCommentLine(trimmed)) return;
			// Strip a trailing `//` line-comment so an inline mention after real
			// code doesn't trip the guard (the cast itself, if real, lives in the
			// code portion before any `//`).
			const codePortion = trimmed.split("//")[0] ?? trimmed;
			if (codePortion.includes(FORBIDDEN_CAST)) {
				violations.push(`${file.relPath}:${index + 1} → ${trimmed}`);
			}
		});
	}
	return violations;
}

describe("TYPE-03 — zero `as unknown as` at src/hooks/api boundaries", () => {
	const files = collectBoundaryFiles(HOOKS_API_DIR);

	it("finds at least one production boundary file to guard", () => {
		// Sanity check: if the walker silently matched nothing, the assertion
		// below would vacuously pass and the guard would be useless.
		expect(files.length).toBeGreaterThan(0);
	});

	it("no `as unknown as` cast at any src/hooks/api PostgREST/RPC boundary", () => {
		const violations = findViolations(files);
		expect(
			violations,
			`Reintroduced \`as unknown as\` boundary cast(s) — route through a validated mapper instead (see mapDocumentRow in document-keys.ts):\n${violations.join("\n")}`,
		).toEqual([]);
	});
});
