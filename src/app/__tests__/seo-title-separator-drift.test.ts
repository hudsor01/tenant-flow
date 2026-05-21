/**
 * Title-separator drift guard (SEO-01).
 *
 * Scans every `.ts`/`.tsx` non-test file under `src/app` plus
 * `src/lib/generate-metadata.ts`, extracts every `title:` string-literal value
 * (covers `createPageMetadata({...})`, the `metadata` export, `generateMetadata`,
 * and the `title.default` / `openGraph.title` / `twitter.title` strings in
 * `generate-metadata.ts`), and asserts NO extracted title uses a SPACED
 * em-dash / en-dash / hyphen separator.
 *
 * The canonical phrase separator is the pipe ` | ` — locked structurally by
 * `generate-metadata.ts:31` (`title.template`) and `page-metadata.ts:70`
 * (the `createPageMetadata` brand suffix). This guard fails any future PR that
 * re-introduces a spaced ` — ` / ` – ` / ` - ` title separator.
 *
 * This is a Node-environment Vitest unit-project test (it does file I/O) — it
 * runs in the lefthook pre-commit hook and the CI test gate. Test files
 * (`__tests__/`, `.test.`, `.spec.`, `.d.ts`) are skipped via `isTestPath`, so
 * this file's own regex / fixture string literals never self-trigger the scan.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// A SPACED title separator: ` — `, ` – `, or ` - ` (space-dash-space). It must
// NOT match `Quick-Reference` or `All-in-one` — hyphens inside words have no
// surrounding spaces. The pipe ` | ` (the canonical separator) is not matched.
const SPACED_SEPARATOR = / (?:[—–]|-) /;

// Captures the string-literal value of a standalone `title:` key — double- or
// single-quoted. The leading `(?<![\w$])` boundary scopes the match to the
// `title:` key itself and rejects compound keys like `heroSubtitle:` /
// `metaTitle:` whose values are body prose (where an em-dash is legitimate, not
// a `<title>` separator). Backtick titles (e.g. `${title} | TenantFlow Blog`)
// are dynamic and contain no spaced dash separator, so they are intentionally
// not extracted by this regex.
const TITLE_LITERAL = /(?<![\w$])title:\s*["']([^"'\n]+)["']/g;

function extractTitles(content: string): string[] {
	const titles: string[] = [];
	for (const match of content.matchAll(TITLE_LITERAL)) {
		const value = match[1];
		if (value !== undefined) titles.push(value);
	}
	return titles;
}

function isTestPath(relPath: string): boolean {
	return (
		relPath.includes("/__tests__/") ||
		relPath.includes(".test.") ||
		relPath.includes(".spec.") ||
		relPath.endsWith(".d.ts")
	);
}

function walkSourceFiles(root: string): string[] {
	const entries = readdirSync(root, { recursive: true, withFileTypes: true });
	const files: string[] = [];
	for (const entry of entries) {
		if (!entry.isFile()) continue;
		const parentPath =
			(entry as { parentPath?: string; path?: string }).parentPath ??
			(entry as { path?: string }).path ??
			"";
		const absPath = join(parentPath, entry.name);
		if (!/\.(ts|tsx)$/.test(entry.name)) continue;
		if (isTestPath(absPath)) continue;
		files.push(absPath);
	}
	return files;
}

const cwd = process.cwd();
const scannedFiles = [
	...walkSourceFiles(join(cwd, "src/app")),
	join(cwd, "src/lib/generate-metadata.ts"),
];

describe("SEO-01: title-separator drift guard", () => {
	for (const abs of scannedFiles) {
		const rel = relative(cwd, abs).replace(/\\/g, "/");
		const content = readFileSync(abs, "utf8");
		const titles = extractTitles(content);
		describe(rel, () => {
			it("every title uses the canonical pipe separator (no spaced em-dash/hyphen)", () => {
				const drifting = titles.filter((t) => SPACED_SEPARATOR.test(t));
				expect(
					drifting,
					`${rel}: title separator drift ${JSON.stringify(drifting)} -- use the canonical pipe \` | \` separator`,
				).toHaveLength(0);
			});
		});
	}
});

describe("meta: separator detection regex", () => {
	it("catches a spaced em-dash separator", () =>
		expect(SPACED_SEPARATOR.test("Help Center — Guides")).toBe(true));
	it("catches a spaced hyphen separator", () =>
		expect(SPACED_SEPARATOR.test("Privacy Policy - Data")).toBe(true));
	it("ignores the canonical pipe separator", () =>
		expect(
			SPACED_SEPARATOR.test("Security Deposit Laws | Quick Reference"),
		).toBe(false));
	it("ignores a hyphen inside a hyphenated word", () =>
		expect(SPACED_SEPARATOR.test("Quick-Reference Card")).toBe(false));
	it("ignores hyphens inside a multi-hyphen word", () =>
		expect(SPACED_SEPARATOR.test("All-in-one platform")).toBe(false));
});
