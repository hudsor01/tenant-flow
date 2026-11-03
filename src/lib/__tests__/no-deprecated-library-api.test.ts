/**
 * No tracked source file uses a TanStack Query, React, zod, TanStack Store
 * (`@tanstack/react-form` / `react-store`), recharts or `String.prototype` API
 * that the INSTALLED version marks `@deprecated`.
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
 * The same holds for the APIs 66.2-39 replaced: zod 4's string-format
 * methods (`z.string().email()` for `z.email()`, `.url()`, `.uuid()`, ...)
 * and its `message` parameter (`error` replaces it), the `useStore` alias
 * (`useSelector`), recharts' `Cell` (the item's `shape` prop) and
 * `String.prototype.substr` (`slice`). The TypeScript language server flags
 * the first, third, fourth and fifth; it never flags a deprecated key in an
 * object literal, so nothing reported the `message` parameter.
 *
 * The deprecated names are read from the installed declaration files, not
 * copied here, so a future release's deprecations are caught too. Matching is
 * textual: a QueryClient method counts when called (`.name(`), a type or
 * interface when named as a whole word anywhere in code, a zod member or
 * parameter when it is called or passed on a chain that starts at `z.`
 * (`z.string().email(...)`, `z.object({...}).refine(fn, { message })`; a chain
 * that starts at a schema variable is not followed), a deprecated export when
 * imported from its package, and `substr` when called as a method. Scope:
 * every tracked `.ts`/`.tsx`/`.mts` file outside `node_modules`.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { escapeRegExp, identifierSource } from "#test/utils/regexp-source";

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

/** A deprecated `declare const` / `function` / `class` (an export). */
const DEPRECATED_DECLARATION = new RegExp(
	`${DEPRECATED_DOC}(?:export\\s+)?declare\\s+(?:const|function|class)\\s+([A-Za-z_$][\\w$]*)`,
	"g",
);
/** A deprecated optional key of a parameter object type. */
const DEPRECATED_KEY = new RegExp(
	`${DEPRECATED_DOC}([A-Za-z_$][\\w$]*)\\??\\s*:`,
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

function read(relPath: string): string {
	return readFileSync(join(process.cwd(), relPath), "utf8");
}

/** Every `.d.ts` file under `relDir` (recursively), concatenated. */
function declarationsUnder(relDir: string): string {
	const root = join(process.cwd(), relDir);
	return readdirSync(root, { recursive: true, encoding: "utf8" })
		.filter((path) => path.endsWith(".d.ts"))
		.map((path) => readFileSync(join(root, path), "utf8"))
		.join("\n");
}

/** TypeScript's `lib.es5.d.ts`, from the platform package `tsc` ships with. */
function libEs5(): string {
	const scope = join(process.cwd(), "node_modules/@typescript");
	for (const entry of readdirSync(scope)) {
		const path = join(scope, entry, "lib/lib.es5.d.ts");
		if (existsSync(path)) return readFileSync(path, "utf8");
	}
	throw new Error("no @typescript platform package ships lib.es5.d.ts");
}

/** The body of `interface ${name} {...}` in `declarations`. */
function interfaceBody(declarations: string, name: string): string {
	const start = declarations.search(
		new RegExp(`interface ${escapeRegExp(name)} \\{`),
	);
	if (start < 0) throw new Error(`no interface ${name}`);
	const open = declarations.indexOf("{", start);
	let depth = 0;
	for (let i = open; i < declarations.length; i++) {
		if (declarations[i] === "{") depth++;
		if (declarations[i] === "}") depth--;
		if (depth === 0) return declarations.slice(open, i + 1);
	}
	throw new Error(`unterminated interface ${name}`);
}

const ZOD_CLASSIC = read("node_modules/zod/v4/classic/schemas.d.ts");
/** zod members deprecated on any classic schema (`email`, `url`, `uuid`...). */
const DEPRECATED_ZOD_MEMBERS = deprecatedNames(ZOD_CLASSIC, DEPRECATED_MEMBER);
/** zod parameter keys deprecated in `Params` (`message`). */
const DEPRECATED_ZOD_PARAMS = deprecatedNames(
	read("node_modules/zod/v4/core/api.d.ts"),
	DEPRECATED_KEY,
);
/** TanStack Store hooks deprecated in the version react-form re-exports. */
const DEPRECATED_STORE_EXPORTS = deprecatedNames(
	declarationsUnder("node_modules/@tanstack/react-store/dist"),
	DEPRECATED_DECLARATION,
);
/** recharts exports deprecated in its type declarations (`Cell`, ...). */
const DEPRECATED_RECHARTS_EXPORTS = deprecatedNames(
	declarationsUnder("node_modules/recharts/types"),
	DEPRECATED_DECLARATION,
);
/** `String.prototype` methods lib.es5 deprecates (`substr`). */
const DEPRECATED_STRING_METHODS = deprecatedNames(
	interfaceBody(libEs5(), "String"),
	DEPRECATED_MEMBER,
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
	return [...names].map(escapeRegExp).join("|");
}

/**
 * The index just past the bracket that closes the one at `open`, skipping
 * strings, template literals, comments and regex literals inside it.
 */
function closingIndex(source: string, open: number): number {
	const pairs: Record<string, string> = { "(": ")", "{": "}", "[": "]" };
	const stack: string[] = [];
	let i = open;
	while (i < source.length) {
		const ch = source[i] ?? "";
		const next = source[i + 1];
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
		if (ch === '"' || ch === "'" || ch === "`") {
			i = stringEnd(source, i);
			continue;
		}
		if (ch === "/" && /[(,=:[!&|?{};]\s*$/.test(source.slice(open, i))) {
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
		const closer = pairs[ch];
		if (closer !== undefined) stack.push(closer);
		else if (ch === stack[stack.length - 1]) {
			stack.pop();
			if (stack.length === 0) return i + 1;
		}
		i += 1;
	}
	return source.length;
}

/** The index just past the string or template literal opening at `start`. */
function stringEnd(source: string, start: number): number {
	const quote = source[start];
	let i = start + 1;
	while (i < source.length) {
		const ch = source[i];
		if (ch === "\\") {
			i += 2;
			continue;
		}
		if (quote === "`" && ch === "$" && source[i + 1] === "{") {
			i = closingIndex(source, i + 1);
			continue;
		}
		if (ch === quote) return i + 1;
		i += 1;
	}
	return source.length;
}

/** The top-level arguments of the call whose `(` is at `open`. */
function callArguments(source: string, open: number): string[] {
	const close = closingIndex(source, open) - 1;
	const args: string[] = [];
	let start = open + 1;
	let i = start;
	while (i < close) {
		const ch = source[i] ?? "";
		if ("({[".includes(ch)) {
			i = closingIndex(source, i);
			continue;
		}
		if (ch === '"' || ch === "'" || ch === "`") {
			i = stringEnd(source, i);
			continue;
		}
		if (ch === ",") {
			args.push(source.slice(start, i));
			start = i + 1;
		}
		i += 1;
	}
	args.push(source.slice(start, close));
	return args.map((arg) => arg.trim()).filter((arg) => arg !== "");
}

/** The keys of an object literal's own (top-level) properties. */
function topLevelKeys(objectLiteral: string): string[] {
	const keys: string[] = [];
	const body = objectLiteral.slice(1, closingIndex(objectLiteral, 0) - 1);
	let i = 0;
	let expectKey = true;
	while (i < body.length) {
		const ch = body[i] ?? "";
		if ("({[".includes(ch)) {
			i = closingIndex(body, i);
			continue;
		}
		if (ch === '"' || ch === "'" || ch === "`") {
			i = stringEnd(body, i);
			continue;
		}
		if (ch === ",") expectKey = true;
		if (expectKey && /[A-Za-z_$]/.test(ch)) {
			const name = /^[A-Za-z_$][\w$]*/.exec(body.slice(i))?.[0] ?? "";
			if (/^\s*:/.test(body.slice(i + name.length))) keys.push(name);
			expectKey = false;
			i += name.length;
			continue;
		}
		i += 1;
	}
	return keys;
}

/** zod calls whose object argument is a shape or a key mask, not params. */
const SHAPE_METHODS = new Set([
	"object",
	"strictObject",
	"looseObject",
	"interface",
	"extend",
	"safeExtend",
	"merge",
	"pick",
	"omit",
	"partial",
	"required",
]);

/**
 * Every deprecated zod member called, and every deprecated parameter key
 * passed, on a chain that starts at `z.` (`line  what`).
 */
function zodChainUses(source: string): { line: number; what: string }[] {
	const hits: { line: number; what: string }[] = [];
	const lineAt = (index: number) => source.slice(0, index).split("\n").length;
	const checkArgs = (open: number, method: string) => {
		// A shape or mask argument names the schema's own fields, not params.
		if (SHAPE_METHODS.has(method)) return;
		for (const arg of callArguments(source, open)) {
			if (!arg.startsWith("{")) continue;
			for (const key of topLevelKeys(arg)) {
				if (DEPRECATED_ZOD_PARAMS.has(key)) {
					hits.push({ line: lineAt(open), what: `param ${key}` });
				}
			}
		}
	};
	const root = /(?<![\w$.])z((?:\s*\.\s*[A-Za-z_$][\w$]*)+)\s*\(/g;
	for (const match of source.matchAll(root)) {
		let open = (match.index ?? 0) + match[0].length - 1;
		const rootMethod = (match[1] ?? "").split(".").at(-1)?.trim() ?? "";
		checkArgs(open, rootMethod);
		let i = closingIndex(source, open);
		for (;;) {
			const member = /^\s*\.\s*([A-Za-z_$][\w$]*)/.exec(source.slice(i));
			if (!member) break;
			i += member[0].length;
			const name = member[1] ?? "";
			const call = /^\s*\(/.exec(source.slice(i));
			if (!call) continue;
			open = i + call[0].length - 1;
			if (DEPRECATED_ZOD_MEMBERS.has(name)) {
				hits.push({ line: lineAt(open), what: `.${name}()` });
			}
			checkArgs(open, name);
			i = closingIndex(source, open);
		}
	}
	return hits;
}

/** `source` with its comments blanked (newlines kept), strings left alone. */
function withoutComments(source: string): string {
	let out = "";
	let i = 0;
	while (i < source.length) {
		const ch = source[i] ?? "";
		const next = source[i + 1];
		if (ch === '"' || ch === "'" || ch === "`") {
			const end = stringEnd(source, i);
			out += source.slice(i, end);
			i = end;
			continue;
		}
		if (ch === "/" && (next === "/" || next === "*")) {
			const close =
				next === "/" ? source.indexOf("\n", i) : source.indexOf("*/", i + 2);
			const stop = close < 0 ? source.length : next === "/" ? close : close + 2;
			out += source.slice(i, stop).replace(/[^\n]/g, " ");
			i = stop;
			continue;
		}
		out += ch;
		i += 1;
	}
	return out;
}

/** The names a file imports from `module` (`a`, `b as c` gives `a`, `b`). */
function importedNames(source: string, module: RegExp): string[] {
	const names: string[] = [];
	const statement =
		/import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*["']([^"']+)["']/g;
	for (const match of source.matchAll(statement)) {
		if (!module.test(match[2] ?? "")) continue;
		for (const part of (match[1] ?? "").split(",")) {
			const name = part
				.trim()
				.replace(/^type\s+/, "")
				.split(/\s+as\s+/)[0];
			if (name) names.push(name);
		}
	}
	return names;
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
			// Other identifiers: `$` is an identifier character, so `\b` found the
			// deprecated name inside `$FormEvent`.
			["d.ts", "type T = $FormEvent | FormEventLike;"],
		]);
		const read = (path: string) => planted.get(path) ?? null;
		const methods = new RegExp(
			`\\.(${alternation(DEPRECATED_QUERY_CLIENT_METHODS)})\\s*\\(`,
		);
		const types = new RegExp(
			identifierSource([...DEPRECATED_QUERY_TYPES, ...DEPRECATED_REACT_TYPES]),
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
			identifierSource([...DEPRECATED_QUERY_TYPES, ...DEPRECATED_REACT_TYPES]),
		);
		const hits = findUses(FILES, readOrNull, pattern);
		expect(
			hits,
			`deprecated type(s) -- QueryExecuteOptions, SubmitEvent, RefObject:\n${hits.join("\n")}`,
		).toEqual([]);
	});
});

describe("deprecated zod, TanStack Store, recharts and String APIs", () => {
	const usesIn = (source: string) =>
		zodChainUses(withoutComments(source)).map((hit) => hit.what);

	it("reads the deprecations the installed versions declare", () => {
		for (const name of ["email", "url", "uuid", "datetime"]) {
			expect(DEPRECATED_ZOD_MEMBERS).toContain(name);
		}
		for (const name of ["min", "max", "refine", "optional", "meta"]) {
			expect(DEPRECATED_ZOD_MEMBERS).not.toContain(name);
		}
		expect(DEPRECATED_ZOD_PARAMS).toContain("message");
		expect(DEPRECATED_ZOD_PARAMS).not.toContain("error");
		expect(DEPRECATED_STORE_EXPORTS).toContain("useStore");
		expect(DEPRECATED_STORE_EXPORTS).not.toContain("useSelector");
		expect(DEPRECATED_RECHARTS_EXPORTS).toContain("Cell");
		expect(DEPRECATED_RECHARTS_EXPORTS).not.toContain("Funnel");
		expect(DEPRECATED_RECHARTS_EXPORTS).not.toContain("Trapezoid");
		expect(DEPRECATED_STRING_METHODS).toContain("substr");
		expect(DEPRECATED_STRING_METHODS).not.toContain("slice");
		expect(DEPRECATED_STRING_METHODS).not.toContain("substring");
	});

	it("finds planted uses (the scans are not vacuous)", () => {
		expect(usesIn('z.string().email("Valid email required")')).toEqual([
			".email()",
		]);
		expect(usesIn('z\n\t.string()\n\t.min(1)\n\t.url("bad")')).toEqual([
			".url()",
		]);
		expect(usesIn("z.string().uuid().optional().nullable()")).toEqual([
			".uuid()",
		]);
		expect(usesIn('z.email({ message: "Valid email" })')).toEqual([
			"param message",
		]);
		expect(
			usesIn(
				'z.object({ a: z.string() }).refine((d) => d.a !== "(", { path: ["a"], message: "x" })',
			),
		).toEqual(["param message"]);
		expect(
			usesIn('z.string().regex(/^\\(\\d{3}\\)$/, "phone").email()'),
		).toEqual([".email()"]);
		expect(
			importedNames(
				'import { useStore } from "@tanstack/react-form";',
				/^@tanstack\/react-(form|store)$/,
			),
		).toEqual(["useStore"]);
		expect(
			importedNames(
				'import {\n\tCell,\n\tFunnel,\n} from "recharts";',
				/^recharts$/,
			),
		).toEqual(["Cell", "Funnel"]);
	});

	it("passes the replacements and look-alikes", () => {
		const clean = [
			'z.email({ error: "Valid email" })',
			"z.uuid().optional().nullable()",
			"z.iso.date()",
			"z.object({ message: z.string().min(1) })",
			"z.object({ a: z.string() }).pick({ message: true })",
			"fc.uuid()",
			"page.url()",
			"// not z.string().email() but z.email()",
			"/* z.string().url() */ const u = z.url();",
			'z.string().min(1, "x").meta({ description: "y" })',
		];
		for (const source of clean) {
			expect(usesIn(source), source).toEqual([]);
		}
	});

	it("calls no deprecated zod member and passes no deprecated zod param", () => {
		const hits: string[] = [];
		for (const path of FILES) {
			const source = readOrNull(path);
			if (source === null || !source.includes("z")) continue;
			for (const hit of zodChainUses(withoutComments(source))) {
				hits.push(`${path}:${hit.line}  ${hit.what}`);
			}
		}
		expect(
			hits,
			`deprecated zod API(s) -- z.email()/z.url()/z.uuid() for the string methods, error for message:\n${hits.join("\n")}`,
		).toEqual([]);
	});

	it("imports no deprecated TanStack Store or recharts export", () => {
		const hits: string[] = [];
		for (const path of FILES) {
			const source = readOrNull(path);
			if (source === null) continue;
			for (const name of importedNames(
				source,
				/^@tanstack\/react-(form|store)$/,
			)) {
				if (DEPRECATED_STORE_EXPORTS.has(name)) hits.push(`${path}  ${name}`);
			}
			for (const name of importedNames(source, /^recharts$/)) {
				if (DEPRECATED_RECHARTS_EXPORTS.has(name))
					hits.push(`${path}  ${name}`);
			}
		}
		expect(
			hits,
			`deprecated export(s) -- useSelector for useStore, the item's shape prop for Cell:\n${hits.join("\n")}`,
		).toEqual([]);
	});

	it("calls no deprecated String.prototype method", () => {
		const pattern = new RegExp(
			`\\.(${alternation(DEPRECATED_STRING_METHODS)})\\s*\\(`,
		);
		const hits = findUses(FILES, readOrNull, pattern);
		expect(
			hits,
			`deprecated String method(s) -- slice for substr:\n${hits.join("\n")}`,
		).toEqual([]);
	});
});
