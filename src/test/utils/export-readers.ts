/**
 * Which file reads each export: the scan behind the exports-have-readers
 * guard (`src/lib/__tests__/exports-have-readers.test.ts`, 66.2-39 fix round
 * 4, class B).
 *
 * NOT A BARREL FILE. Everything below is declared here and nothing is
 * re-exported (CLAUDE.md zero-tolerance rule 2).
 *
 * Every tracked code file outside `.planning/` is parsed (oxc, through
 * `rolldown/utils`, as in `button-sites.ts`). A file reads an export when it
 * imports the name from the declaring module: a static import or re-export of
 * the name, a namespace import whose `ns.name` it reads, a dynamic `import()`
 * it destructures, reads a member of or reads `m.name` of in a `.then((m) =>
 * …)` callback, or an `import("…").name` type. A namespace or dynamic import
 * used any other way reads every export of the module. A file reading its own
 * export does not count. Specifiers resolve through `package.json` `imports`
 * (the `#` aliases) or relative to the importing file; anything else is a
 * package. A reader is test code when it is a test file (`__tests__/`,
 * `*.test.*`, `*.spec.*`, `supabase/functions/tests/`), a test helper
 * (`src/test/`, anything under `tests/`) or `vitest.config.ts`; every other
 * file is production code.
 *
 * The declaring modules are the non-test `.ts`/`.tsx` files under `src/`,
 * `scripts/`, `supabase/functions/_shared/` and `tests/e2e/lib/`, less the
 * generated `src/types/supabase.ts`, `.d.ts` files, and the files Next.js
 * reads by name (a route segment's `page`, `layout`, `route` and the rest,
 * `src/proxy.ts`, `src/instrumentation.ts`): the framework reads those
 * exports, and no file imports them.
 */

import { posix } from "node:path";
import { parseSync } from "rolldown/utils";

type Node = {
	type: string;
	start: number;
	end: number;
	[key: string]: unknown;
};

function isNode(value: unknown): value is Node {
	return (
		typeof value === "object" &&
		value !== null &&
		typeof (value as { type?: unknown }).type === "string"
	);
}

function childNodes(node: Node): Node[] {
	const out: Node[] = [];
	for (const [key, value] of Object.entries(node)) {
		if (key === "type" || key === "start" || key === "end") continue;
		if (Array.isArray(value)) {
			for (const v of value) if (isNode(v)) out.push(v);
		} else if (isNode(value)) {
			out.push(value);
		}
	}
	return out;
}

function visit(node: Node, parents: Node[], fn: (n: Node, p: Node[]) => void) {
	fn(node, parents);
	const next = [...parents, node];
	for (const child of childNodes(node)) visit(child, next, fn);
}

/** A test file: a runner collects it. */
const TEST_FILE =
	/(^|\/)__tests__\/|\.(test|spec)\.[cm]?[jt]sx?$|^supabase\/functions\/tests\//;

/** Test code: a test file, a test helper or a test runner's config. */
const TEST_CODE = /^src\/test\/|^tests\/|^vitest\.config\.ts$/;

/** A test helper module: what it exports is for tests. */
const TEST_HELPER = /^src\/test\/|^tests\/e2e\/lib\//;

const CODE_PATH = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;

const DECLARING_ROOT =
	/^(src|scripts|supabase\/functions\/_shared|tests\/e2e\/lib)\/.*\.(ts|tsx|mts)$/;

/** The files Next.js reads by name: their exports have no importer. */
const FRAMEWORK_FILE =
	/^src\/app\/(.*\/)?(page|layout|template|loading|error|global-error|not-found|default|route|sitemap|robots|manifest|opengraph-image|twitter-image|icon|apple-icon)\.(ts|tsx)$|^src\/(proxy|instrumentation)\.ts$/;

/** Test code (a test file, a helper, a runner's config): it never ships. */
function isTestCode(path: string): boolean {
	return TEST_FILE.test(path) || TEST_CODE.test(path);
}

/** A test helper: its exports need a test reader, not a production one. */
function isTestHelper(path: string): boolean {
	return TEST_HELPER.test(path) && !TEST_FILE.test(path);
}

/** Whether the guard holds `path`'s exports to having a reader. */
function isDeclaringModule(path: string): boolean {
	return (
		DECLARING_ROOT.test(path) &&
		!TEST_FILE.test(path) &&
		!/\.d\.ts$/.test(path) &&
		path !== "src/types/supabase.ts" &&
		!FRAMEWORK_FILE.test(path)
	);
}

/** One export of a declaring module, and the files that read it. */
export interface ExportReaders {
	file: string;
	name: string;
	line: number;
	/**
	 * A `type` or `interface`: erased, so it needs no reader of its own while
	 * a live export's signature in its module names it.
	 */
	isType: boolean;
	/** The type names this export's signature refers to (function bodies excluded). */
	signatureTypes: string[];
	/** The module's own code refers to it beyond its declaration. */
	usedInOwnModule: boolean;
	productionReaders: string[];
	testReaders: string[];
}

type OxcModule = ReturnType<typeof parseSync>["module"];

interface ParsedFile {
	path: string;
	source: string;
	program: Node;
	module: OxcModule;
}

function parseFile(path: string, source: string): ParsedFile {
	const lang = /\.(tsx|jsx)$/.test(path)
		? "tsx"
		: /\.[cm]?js$/.test(path)
			? "js"
			: "ts";
	const result = parseSync(path, source, { lang });
	if (result.errors.length > 0) {
		throw new Error(`${path}: ${result.errors[0]?.message}`);
	}
	const program: unknown = result.program;
	if (!isNode(program))
		throw new Error(`${path}: the parser returned no program`);
	return { path, source, program, module: result.module };
}

function lineAt(source: string, index: number): number {
	return source.slice(0, index).split("\n").length;
}

/** The binding names a declaration introduces (`const { a, b } = …` too). */
function bindingNames(pattern: unknown): string[] {
	if (!isNode(pattern)) return [];
	if (pattern.type === "Identifier") return [String(pattern.name)];
	if (pattern.type === "ObjectPattern") {
		return ((pattern.properties as Node[]) ?? []).flatMap((p) =>
			p.type === "RestElement"
				? bindingNames(p.argument)
				: bindingNames(p.value),
		);
	}
	if (pattern.type === "ArrayPattern") {
		return ((pattern.elements as unknown[]) ?? []).flatMap(bindingNames);
	}
	if (pattern.type === "AssignmentPattern") return bindingNames(pattern.left);
	if (pattern.type === "RestElement") return bindingNames(pattern.argument);
	return [];
}

interface LocalExport {
	name: string;
	/** The binding's name in the module (differs under `export { a as b }`). */
	local: string;
	start: number;
	isType: boolean;
	/** The declaration the name binds (null for `export default <expression>`). */
	declaration: Node | null;
}

const TYPE_DECLARATION = /^(TSInterfaceDeclaration|TSTypeAliasDeclaration)$/;

/** Each top-level declaration by the names it binds, exported or not. */
function topLevelDeclarations(program: Node): Map<string, Node> {
	const out = new Map<string, Node>();
	for (const statement of (program.body as Node[]) ?? []) {
		const declaration =
			statement.type === "ExportNamedDeclaration" ||
			statement.type === "ExportDefaultDeclaration"
				? statement.declaration
				: statement;
		if (!isNode(declaration)) continue;
		if (declaration.type === "VariableDeclaration") {
			for (const d of (declaration.declarations as Node[]) ?? []) {
				for (const name of bindingNames(d.id)) out.set(name, d);
			}
			continue;
		}
		const id = declaration.id;
		if (isNode(id) && id.type === "Identifier")
			out.set(String(id.name), declaration);
	}
	return out;
}

/** The module's own exports (`export <declaration>`, `export { a as b }`, `export default`). */
function localExports(file: ParsedFile): LocalExport[] {
	const declarations = topLevelDeclarations(file.program);
	const out: LocalExport[] = [];
	for (const statement of file.module.staticExports) {
		for (const entry of statement.entries) {
			if (entry.moduleRequest) continue;
			const name =
				entry.exportName.kind === "Default" ? "default" : entry.exportName.name;
			if (!name) continue;
			const local = entry.localName.name;
			const declaration = local ? (declarations.get(local) ?? null) : null;
			out.push({
				name,
				local: local ?? name,
				start: statement.start,
				isType:
					entry.isType ||
					(declaration !== null && TYPE_DECLARATION.test(declaration.type)),
				declaration,
			});
		}
	}
	return out;
}

/** A function's body: the part of an exported value that is no signature. */
function isFunctionBody(node: Node, parents: Node[]): boolean {
	const parent = parents[parents.length - 1];
	return (
		node.type === "BlockStatement" &&
		!!parent &&
		/^(FunctionDeclaration|FunctionExpression|ArrowFunctionExpression)$/.test(
			parent.type,
		) &&
		parent.body === node
	);
}

/** Type names an exported declaration's signature refers to. */
function signatureTypeNames(declaration: Node): Set<string> {
	const names = new Set<string>();
	const walk = (node: Node, parents: Node[]) => {
		if (isFunctionBody(node, parents)) return;
		if (node.type === "TSTypeReference" || node.type === "TSTypeQuery") {
			let head =
				node.type === "TSTypeReference" ? node.typeName : node.exprName;
			while (isNode(head) && head.type === "TSQualifiedName") head = head.left;
			if (isNode(head) && head.type === "Identifier")
				names.add(String(head.name));
		}
		if (
			node.type === "TSClassImplements" ||
			node.type === "TSInterfaceHeritage"
		) {
			const expression = node.expression;
			if (isNode(expression) && expression.type === "Identifier") {
				names.add(String(expression.name));
			}
		}
		const next = [...parents, node];
		for (const child of childNodes(node)) walk(child, next);
	};
	walk(declaration, []);
	return names;
}

/** How often each name is referred to in the file, declarations excluded. */
function referenceCounts(file: ParsedFile): Map<string, number> {
	const counts = new Map<string, number>();
	const add = (name: string) => counts.set(name, (counts.get(name) ?? 0) + 1);
	visit(file.program, [], (node, parents) => {
		if (node.type !== "Identifier" && node.type !== "JSXIdentifier") return;
		const parent = parents[parents.length - 1];
		if (!parent) return;
		// A member's or key's own name is no reference to a binding.
		if (
			(parent.type === "MemberExpression" &&
				parent.property === node &&
				!parent.computed) ||
			(parent.type === "Property" &&
				parent.key === node &&
				!parent.computed &&
				!parent.shorthand) ||
			(/^(PropertyDefinition|MethodDefinition|TSPropertySignature|TSMethodSignature)$/.test(
				parent.type,
			) &&
				parent.key === node) ||
			parent.type === "ExportSpecifier" ||
			parent.type === "ImportSpecifier" ||
			parent.type === "JSXAttribute" ||
			(parent.type === "TSQualifiedName" && parent.right === node) ||
			(parent.type === "JSXMemberExpression" && parent.property === node)
		) {
			return;
		}
		// A shorthand `{ name }` holds the Identifier twice (key and value).
		if (parent.type === "Property" && parent.shorthand && parent.key === node) {
			return;
		}
		// The declared name itself.
		if (
			(parent.type === "VariableDeclarator" && parent.id === node) ||
			(/^(FunctionDeclaration|ClassDeclaration|TSInterfaceDeclaration|TSTypeAliasDeclaration|TSEnumDeclaration)$/.test(
				parent.type,
			) &&
				parent.id === node)
		) {
			return;
		}
		add(String(node.name));
	});
	return counts;
}

const TS_EXTENSIONS = [".ts", ".tsx", ".mts", ".js", ".mjs", ".cjs"];

/** The tracked file a specifier names, or null for a package. */
function resolveSpecifier(
	specifier: string,
	from: string,
	files: ReadonlySet<string>,
	aliases: ReadonlyMap<string, string>,
): string | null {
	let base: string | null = null;
	const exact = aliases.get(specifier);
	if (exact) {
		base = exact;
	} else if (specifier.startsWith("#")) {
		for (const [pattern, target] of aliases) {
			if (!pattern.endsWith("/*")) continue;
			const prefix = pattern.slice(0, -1);
			if (specifier.startsWith(prefix)) {
				base = target.slice(0, -1) + specifier.slice(prefix.length);
				break;
			}
		}
	} else if (specifier.startsWith(".")) {
		base = posix.join(posix.dirname(from), specifier);
	}
	if (base === null) return null;
	base = posix.normalize(base.replace(/^\.\//, ""));
	const candidates = [
		base,
		base.replace(/\.js$/, ".ts"),
		base.replace(/\.js$/, ".tsx"),
		...TS_EXTENSIONS.map((ext) => base + ext),
		...TS_EXTENSIONS.map((ext) => `${base}/index${ext}`),
	];
	return candidates.find((candidate) => files.has(candidate)) ?? null;
}

const ALL = "*";

/** The names `file` reads from each module it imports, keyed by the module's path. */
function namesRead(
	file: ParsedFile,
	files: ReadonlySet<string>,
	aliases: ReadonlyMap<string, string>,
): Map<string, Set<string>> {
	const reads = new Map<string, Set<string>>();
	const read = (target: string | null, name: string) => {
		if (target === null || target === file.path) return;
		const set = reads.get(target) ?? new Set<string>();
		set.add(name);
		reads.set(target, set);
	};
	const resolve = (specifier: string) =>
		resolveSpecifier(specifier, file.path, files, aliases);

	const namespaces = new Map<string, string | null>();
	for (const entry of file.module.staticImports) {
		const target = resolve(entry.moduleRequest.value);
		for (const e of entry.entries) {
			if (e.importName.kind === "Name" && e.importName.name) {
				read(target, e.importName.name);
			} else if (e.importName.kind === "Default") {
				read(target, "default");
			} else if (e.importName.kind === "NamespaceObject") {
				namespaces.set(e.localName.value, target);
			}
		}
	}
	for (const statement of file.module.staticExports) {
		for (const e of statement.entries) {
			if (!e.moduleRequest) continue;
			const target = resolve(e.moduleRequest.value);
			if (e.importName.kind === "Name" && e.importName.name) {
				read(target, e.importName.name);
			} else {
				read(target, ALL);
			}
		}
	}

	const dynamicStarts = new Set(
		file.module.dynamicImports.map((d) => d.moduleRequest.start),
	);
	visit(file.program, [], (node, parents) => {
		const parent = parents[parents.length - 1];
		if (node.type === "Identifier" && namespaces.has(String(node.name))) {
			const target = namespaces.get(String(node.name)) ?? null;
			if (parent?.type === "ImportNamespaceSpecifier") return;
			if (
				parent?.type === "MemberExpression" &&
				parent.object === node &&
				!parent.computed &&
				isNode(parent.property)
			) {
				read(target, String(parent.property.name));
			} else if (
				parent?.type === "TSQualifiedName" &&
				parent.left === node &&
				isNode(parent.right)
			) {
				read(target, String(parent.right.name));
			} else {
				read(target, ALL);
			}
		}
		if (node.type === "ImportExpression") {
			const source = node.source;
			if (!isNode(source) || !dynamicStarts.has(source.start)) return;
			if (source.type !== "Literal" || typeof source.value !== "string") return;
			const target = resolve(source.value);
			// `await import("…")`, or the import itself.
			let outer: Node = node;
			let index = parents.length - 1;
			const holder = parents[index];
			if (holder?.type === "AwaitExpression") {
				outer = holder;
				index -= 1;
			}
			let up = parents[index];
			while (up?.type === "ParenthesizedExpression") {
				outer = up;
				index -= 1;
				up = parents[index];
			}
			if (
				up?.type === "VariableDeclarator" &&
				up.init === outer &&
				isNode(up.id) &&
				up.id.type === "ObjectPattern"
			) {
				for (const p of (up.id.properties as Node[]) ?? []) {
					if (p.type === "Property" && isNode(p.key) && !p.computed) {
						read(target, String(p.key.name ?? p.key.value));
					} else {
						read(target, ALL);
					}
				}
			} else if (
				up?.type === "MemberExpression" &&
				up.object === outer &&
				!up.computed &&
				isNode(up.property) &&
				up.property.name === "then"
			) {
				// `import("…").then((m) => m.name)`: the names the callback reads.
				const call = parents[index - 1];
				const callback =
					call?.type === "CallExpression" && call.callee === up
						? (call.arguments as Node[] | undefined)?.[0]
						: undefined;
				const param = isNode(callback)
					? (callback.params as Node[] | undefined)?.[0]
					: undefined;
				if (
					!isNode(callback) ||
					!isNode(param) ||
					param.type !== "Identifier"
				) {
					read(target, ALL);
					return;
				}
				let namedOnly = true;
				const names: string[] = [];
				visit(callback, [], (inner, innerParents) => {
					if (inner === param) return;
					if (inner.type !== "Identifier" || inner.name !== param.name) return;
					const innerParent = innerParents[innerParents.length - 1];
					if (
						innerParent?.type === "MemberExpression" &&
						innerParent.object === inner &&
						!innerParent.computed &&
						isNode(innerParent.property)
					) {
						names.push(String(innerParent.property.name));
					} else {
						namedOnly = false;
					}
				});
				if (!namedOnly) read(target, ALL);
				for (const name of names) read(target, name);
			} else if (
				up?.type === "MemberExpression" &&
				up.object === outer &&
				!up.computed &&
				isNode(up.property)
			) {
				read(target, String(up.property.name));
			} else {
				read(target, ALL);
			}
		}
		if (node.type === "TSImportType") {
			const argument = node.argument;
			let literal: unknown = argument;
			if (isNode(argument) && argument.type === "TSLiteralType") {
				literal = argument.literal;
			}
			if (!isNode(literal) || typeof literal.value !== "string") return;
			let qualifier = node.qualifier;
			while (isNode(qualifier) && qualifier.type === "TSQualifiedName") {
				qualifier = qualifier.left;
			}
			if (isNode(qualifier) && qualifier.type === "Identifier") {
				read(resolve(literal.value), String(qualifier.name));
			}
		}
	});
	return reads;
}

export interface ExportScanInput {
	/** Every tracked path (repo-relative, forward slashes). */
	paths: readonly string[];
	/** A tracked file's text, or null when it is gone from the working tree. */
	read: (path: string) => string | null;
	/** `package.json`'s `imports` map. */
	aliases: Readonly<Record<string, string>>;
	/**
	 * Modules a file reads whole by path rather than by import, as a bundler
	 * alias does (`vitest.config.ts` resolves `recharts` to its mock): module
	 * path to the reading file.
	 */
	wholeModuleReaders?: Readonly<Record<string, string>>;
}

/** Every export of a declaring module, with the files that read it. */
export function scanExportReaders(input: ExportScanInput): ExportReaders[] {
	const codePaths = input.paths.filter(
		(p) => CODE_PATH.test(p) && !p.startsWith(".planning/"),
	);
	const fileSet = new Set(codePaths);
	const aliases = new Map(
		Object.entries(input.aliases).map(([key, value]) => [
			key,
			value.replace(/^\.\//, ""),
		]),
	);
	const parsed: ParsedFile[] = [];
	for (const path of codePaths) {
		const source = input.read(path);
		if (source === null) continue;
		parsed.push(parseFile(path, source));
	}

	const readersOf = new Map<
		string,
		{ production: Set<string>; test: Set<string> }
	>();
	for (const file of parsed) {
		const isTest = isTestCode(file.path);
		for (const [target, names] of namesRead(file, fileSet, aliases)) {
			for (const name of names) {
				const key = `${target}\0${name}`;
				const entry = readersOf.get(key) ?? {
					production: new Set<string>(),
					test: new Set<string>(),
				};
				(isTest ? entry.test : entry.production).add(file.path);
				readersOf.set(key, entry);
			}
		}
	}

	for (const [target, reader] of Object.entries(
		input.wholeModuleReaders ?? {},
	)) {
		const key = `${target}\0${ALL}`;
		const entry = readersOf.get(key) ?? {
			production: new Set<string>(),
			test: new Set<string>(),
		};
		(isTestCode(reader) ? entry.test : entry.production).add(reader);
		readersOf.set(key, entry);
	}

	const out: ExportReaders[] = [];
	for (const file of parsed) {
		if (!isDeclaringModule(file.path)) continue;
		const exports = localExports(file);
		const counts = referenceCounts(file);
		const signatureNames = new Map<string, Set<string>>();
		for (const e of exports) {
			signatureNames.set(
				e.name,
				e.declaration ? signatureTypeNames(e.declaration) : new Set<string>(),
			);
		}
		const all = readersOf.get(`${file.path}\0${ALL}`);
		for (const e of exports) {
			const own = readersOf.get(`${file.path}\0${e.name}`);
			const production = new Set([
				...(own?.production ?? []),
				...(all?.production ?? []),
			]);
			const test = new Set([...(own?.test ?? []), ...(all?.test ?? [])]);
			const signatureTypes = [...(signatureNames.get(e.name) ?? [])].filter(
				(name) => name !== e.local,
			);
			out.push({
				file: file.path,
				name: e.name,
				line: lineAt(file.source, e.start),
				isType: e.isType,
				signatureTypes: signatureTypes.sort(),
				usedInOwnModule: (counts.get(e.local) ?? 0) > 0,
				productionReaders: [...production].sort(),
				testReaders: [...test].sort(),
			});
		}
	}
	return out;
}

/**
 * The exports with no reader of the kind they need: a production module's
 * needs a production file, a test helper's any file. A type needs none of its
 * own while a live export of its module names it in its signature (iterated:
 * a type only a dead export names is dead too). `alsoLive` holds exports the
 * caller accepts without that reader (a documented test seam), keyed
 * `file\tname`.
 */
export function unreadExports(
	records: readonly ExportReaders[],
	alsoLive: ReadonlySet<string> = new Set<string>(),
): ExportReaders[] {
	const key = (r: ExportReaders) => `${r.file}\t${r.name}`;
	const live = new Set<string>();
	for (const r of records) {
		const read = isTestHelper(r.file)
			? r.productionReaders.length + r.testReaders.length > 0
			: r.productionReaders.length > 0;
		if (read || alsoLive.has(key(r))) live.add(key(r));
	}
	const byFile = new Map<string, ExportReaders[]>();
	for (const r of records) {
		byFile.set(r.file, [...(byFile.get(r.file) ?? []), r]);
	}
	let grew = true;
	while (grew) {
		grew = false;
		for (const r of records) {
			if (!r.isType || live.has(key(r))) continue;
			const named = (byFile.get(r.file) ?? []).some(
				(other) =>
					other !== r &&
					live.has(key(other)) &&
					other.signatureTypes.includes(r.name),
			);
			if (named) {
				live.add(key(r));
				grew = true;
			}
		}
	}
	return records.filter((r) => !live.has(key(r)));
}
