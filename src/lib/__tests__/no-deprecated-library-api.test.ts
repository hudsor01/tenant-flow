/**
 * No tracked source file uses a TanStack Query or React API that the INSTALLED
 * version marks `@deprecated`.
 *
 * TanStack Query 5.105 deprecates `fetchQuery`, `prefetchQuery` and
 * `ensureQueryData` (and their infinite twins) in favor of
 * `queryClient.query(options)`, with `{ staleTime: "static" }` standing in for
 * `ensureQueryData` (its cached data is returned until something invalidates
 * it), along with their option types. @types/react 19 deprecates `FormEvent`
 * ("doesn't actually exist": a form's submit handler takes `SubmitEvent`) and
 * `MutableRefObject` (`RefObject` is mutable since React 19). Editors flag
 * these as TS6385 / TS6387, which `tsc` never reports, so the typecheck passed
 * while they spread into new tests.
 *
 * The deprecated names are read from the installed declaration files, not
 * copied here, so a future release's deprecations are caught too. Matching is
 * textual: a QueryClient method counts when called (`.name(`), a type or
 * interface when named as a whole word anywhere in code. Scope: every tracked
 * `.ts`/`.tsx`/`.mts` file outside `node_modules`.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

// A JSDoc block holding `@deprecated`, then the declaration it documents.
const DEPRECATED_DOC =
	"\\/\\*\\*(?:(?!\\*\\/)[\\s\\S])*?@deprecated(?:(?!\\*\\/)[\\s\\S])*?\\*\\/\\s*";
/** A deprecated class member: `name(` or `name<`. */
const DEPRECATED_MEMBER = new RegExp(
	`${DEPRECATED_DOC}([A-Za-z_$][\\w$]*)\\s*[<(]`,
	"g",
);
/** A deprecated `interface` or `type` declaration. */
const DEPRECATED_TYPE = new RegExp(
	`${DEPRECATED_DOC}(?:export\\s+)?(?:declare\\s+)?(?:interface|type)\\s+([A-Za-z_$][\\w$]*)`,
	"g",
);

/** Every name `pattern` captures in a declaration file. */
function deprecatedNames(declarations: string, pattern: RegExp): Set<string> {
	const names = new Set<string>();
	for (const match of declarations.matchAll(pattern)) {
		const name = match[1];
		if (name !== undefined) names.add(name);
	}
	return names;
}

/** The query-core chunk that declares `class QueryClient`. */
function queryCoreDeclarations(): string {
	const entry = join(
		process.cwd(),
		"node_modules/@tanstack/query-core/build/modern/index.d.ts",
	);
	const index = readFileSync(entry, "utf8");
	for (const match of index.matchAll(/from "\.\/([\w.-]+)\.js"/g)) {
		const file = join(dirname(entry), `${match[1]}.d.ts`);
		const text = readFileSync(file, "utf8");
		if (/declare class QueryClient\b/.test(text)) return text;
	}
	throw new Error("no query-core declaration file declares class QueryClient");
}

/** The body of `declare class QueryClient { ... }` (its members only). */
function queryClientBody(declarations: string): string {
	const start = declarations.search(/declare class QueryClient\b/);
	const open = declarations.indexOf("{", start);
	let depth = 0;
	for (let i = open; i < declarations.length; i++) {
		if (declarations[i] === "{") depth++;
		if (declarations[i] === "}") depth--;
		if (depth === 0) return declarations.slice(open, i + 1);
	}
	throw new Error("unterminated QueryClient declaration");
}

const QUERY_CORE = queryCoreDeclarations();
const DEPRECATED_QUERY_CLIENT_METHODS = deprecatedNames(
	queryClientBody(QUERY_CORE),
	DEPRECATED_MEMBER,
);
const DEPRECATED_QUERY_TYPES = deprecatedNames(QUERY_CORE, DEPRECATED_TYPE);
const DEPRECATED_REACT_TYPES = deprecatedNames(
	readFileSync(
		join(process.cwd(), "node_modules/@types/react/index.d.ts"),
		"utf8",
	),
	DEPRECATED_TYPE,
);

function trackedSourceFiles(): string[] {
	const out = execFileSync(
		"git",
		["ls-files", "-z", "--", "*.ts", "*.tsx", "*.mts"],
		{ cwd: process.cwd(), encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
	);
	return out
		.split("\0")
		.filter((path) => path !== "" && !path.includes("node_modules/"));
}

/** `path:line  text` for every line where `pattern` matches. */
function findUses(
	files: readonly string[],
	read: (path: string) => string | null,
	pattern: RegExp,
): string[] {
	const hits: string[] = [];
	for (const path of files) {
		const text = read(path);
		if (text === null) continue;
		text.split("\n").forEach((line, index) => {
			if (pattern.test(line)) hits.push(`${path}:${index + 1}  ${line.trim()}`);
		});
	}
	return hits;
}

function readOrNull(path: string): string | null {
	try {
		return readFileSync(path, "utf8");
	} catch {
		// Tracked but deleted in the working tree: nothing to scan.
		return null;
	}
}

function alternation(names: Iterable<string>): string {
	return [...names].map((name) => name.replace(/\$/g, "\\$")).join("|");
}

// This file names the deprecated APIs in its own prose; it is not a user.
const SELF = "src/lib/__tests__/no-deprecated-library-api.test.ts";
const FILES = trackedSourceFiles().filter((path) => path !== SELF);

describe("deprecated library APIs (read from the installed declarations)", () => {
	it("reads the deprecations the installed versions declare", () => {
		// A parser that found nothing would make every scan below pass.
		for (const name of ["fetchQuery", "prefetchQuery", "ensureQueryData"]) {
			expect(DEPRECATED_QUERY_CLIENT_METHODS).toContain(name);
		}
		expect(DEPRECATED_QUERY_CLIENT_METHODS).not.toContain("query");
		expect(DEPRECATED_QUERY_CLIENT_METHODS).not.toContain("getQueryData");
		expect(DEPRECATED_QUERY_TYPES).toContain("FetchQueryOptions");
		expect(DEPRECATED_QUERY_TYPES).toContain("EnsureQueryDataOptions");
		expect(DEPRECATED_REACT_TYPES).toContain("FormEvent");
		expect(DEPRECATED_REACT_TYPES).toContain("MutableRefObject");
		expect(DEPRECATED_REACT_TYPES).not.toContain("SubmitEvent");
		expect(DEPRECATED_REACT_TYPES).not.toContain("RefObject");
		expect(FILES.length).toBeGreaterThan(1000);
	});

	it("finds a planted use (the scan is not vacuous)", () => {
		const planted = new Map([
			["a.ts", "const d = await client.ensureQueryData(opts);"],
			["b.tsx", "function f(e: React.FormEvent) {}"],
			["c.ts", "import type { FetchQueryOptions } from 'x';"],
		]);
		const read = (path: string) => planted.get(path) ?? null;
		const methods = new RegExp(
			`\\.(${alternation(DEPRECATED_QUERY_CLIENT_METHODS)})\\s*\\(`,
		);
		const types = new RegExp(
			`\\b(${alternation([...DEPRECATED_QUERY_TYPES, ...DEPRECATED_REACT_TYPES])})\\b`,
		);
		expect(findUses([...planted.keys()], read, methods)).toHaveLength(1);
		expect(findUses([...planted.keys()], read, types)).toHaveLength(2);
	});

	it("calls no deprecated QueryClient method", () => {
		const pattern = new RegExp(
			`\\.(${alternation(DEPRECATED_QUERY_CLIENT_METHODS)})\\s*\\(`,
		);
		const hits = findUses(FILES, readOrNull, pattern);
		expect(
			hits,
			`deprecated QueryClient call(s) -- use queryClient.query(options), with { staleTime: "static" } for ensureQueryData:\n${hits.join("\n")}`,
		).toEqual([]);
	});

	it("names no deprecated TanStack Query or React type", () => {
		const pattern = new RegExp(
			`\\b(${alternation([...DEPRECATED_QUERY_TYPES, ...DEPRECATED_REACT_TYPES])})\\b`,
		);
		const hits = findUses(FILES, readOrNull, pattern);
		expect(
			hits,
			`deprecated type(s) -- QueryExecuteOptions, SubmitEvent, RefObject:\n${hits.join("\n")}`,
		).toEqual([]);
	});
});
