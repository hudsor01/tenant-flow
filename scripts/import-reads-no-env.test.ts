// @vitest-environment node
/**
 * Importing a script module reads no env file and no environment variable
 * (66.2-39 fix round 1, part R).
 *
 * generate-blog-draft.ts ran `loadDotenv(process.cwd())` at import, and the
 * unit suite imports it (generate-blog-draft.test.ts, and through
 * run-scheduled-blog.ts and run-continuous-blog.ts their tests), so a unit run
 * read the developer's .env.local into process.env: production credentials
 * in the unit process, the thing #1044 removed from vitest.config.ts. Its
 * top-level constants read process.env at import too, as did
 * rag-index-blog-corpus.ts and backfill-blog-covers.ts (the other two env-file
 * loaders, and rag-index ran its main() at import) and run-continuous-blog.ts.
 * Each now loads the env files in its CLI entry only (the guard that runs
 * main) and reads every variable when a call needs it.
 *
 * Every script module a unit test imports, and every script that loads an env
 * file, is imported here with `node:fs` watched (an env file is reported as
 * absent, never read) and process.env behind a proxy that records each read a
 * script's own code makes. Both lists must stay empty.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const { fileReads } = vi.hoisted(() => ({ fileReads: [] as string[] }));

vi.mock("node:fs", async (importOriginal) => {
	const actual = await importOriginal<typeof import("node:fs")>();
	const isEnvFile = (path: unknown) =>
		/(^|[\\/])\.env(\.|$)/.test(String(path));
	const existsSync = (path: Parameters<typeof actual.existsSync>[0]) => {
		if (isEnvFile(path)) {
			fileReads.push(`existsSync ${String(path)}`);
			return false;
		}
		return actual.existsSync(path);
	};
	const readFileSync = ((
		path: Parameters<typeof actual.readFileSync>[0],
		...rest: unknown[]
	) => {
		if (isEnvFile(path)) {
			fileReads.push(`readFileSync ${String(path)}`);
			throw new Error("an env file is never read in the unit suite");
		}
		return (actual.readFileSync as (...args: unknown[]) => unknown)(
			path,
			...rest,
		);
	}) as typeof actual.readFileSync;
	return {
		...actual,
		default: { ...actual, existsSync, readFileSync },
		existsSync,
		readFileSync,
	};
});

const ROOT = process.cwd();
const SCRIPTS = join(ROOT, "scripts");
const SELF = "import-reads-no-env.test.ts";

/** Each script module's file name in scripts/, by module name. */
const FILES = new Map(
	readdirSync(SCRIPTS)
		.filter((file) => /\.tsx?$/.test(file))
		.map((file) => [file.replace(/\.tsx?$/, ""), file] as const),
);

/** The script modules the unit suite imports, and the scripts that load env files. */
function modulesUnderTest(): string[] {
	const names = new Set<string>();
	for (const file of FILES.values()) {
		const source = readFileSync(join(SCRIPTS, file), "utf8");
		if (/\.test\.ts$/.test(file) && file !== SELF) {
			for (const m of source.matchAll(/from "\.\/([\w-]+)"/g)) {
				if (m[1]) names.add(m[1]);
			}
		}
		if (
			/\.tsx?$/.test(file) &&
			!/\.test\./.test(file) &&
			/\bloadDotenv\(/.test(source)
		) {
			names.add(file.replace(/\.tsx?$/, ""));
		}
	}
	return [...names].sort();
}

/** The script file whose own code made the read, from the frame above the proxy. */
function readingScript(stack: string | undefined): string | null {
	const frames = (stack ?? "").split("\n").slice(1);
	// frames[0] is the proxy trap below; frames[1] is the code that read.
	const caller = frames[1] ?? "";
	const m = /scripts[\\/]([\w./-]+?\.tsx?)/.exec(caller);
	return m?.[1] && m[1] !== SELF ? m[1] : null;
}

async function importWatched(name: string) {
	vi.resetModules();
	fileReads.length = 0;
	const envReads: string[] = [];
	const real = process.env;
	process.env = new Proxy(real, {
		get(target, key, receiver) {
			const by = readingScript(new Error().stack);
			if (by !== null && typeof key === "string")
				envReads.push(`${by}: ${key}`);
			return Reflect.get(target, key, receiver);
		},
		ownKeys(target) {
			const by = readingScript(new Error().stack);
			if (by !== null) envReads.push(`${by}: (every key)`);
			return Reflect.ownKeys(target);
		},
	});
	const before = { ...real };
	let failure: unknown = null;
	try {
		await import(join(SCRIPTS, FILES.get(name) ?? `${name}.ts`));
	} catch (error) {
		failure = error;
	} finally {
		process.env = real;
	}
	return {
		envReads,
		fileReads: [...fileReads],
		before,
		after: { ...real },
		failure,
	};
}

afterEach(() => {
	vi.resetModules();
});

describe("importing a script", () => {
	const modules = modulesUnderTest();

	it("covers every script a unit test imports and every env-file loader", () => {
		expect(modules).toEqual(
			expect.arrayContaining([
				"backfill-blog-covers",
				"generate-blog-draft",
				"rag-index-blog-corpus",
				"run-continuous-blog",
				"run-scheduled-blog",
			]),
		);
		expect(modules.length).toBeGreaterThan(8);
	});

	it.each(modules)(
		"%s reads no env file and no environment variable",
		async (name) => {
			const watched = await importWatched(name);
			expect(watched.failure).toBeNull();
			expect(watched.fileReads).toEqual([]);
			expect(watched.envReads).toEqual([]);
			expect(watched.after).toEqual(watched.before);
		},
	);

	it("records a read the way a script makes one (positive control)", async () => {
		const real = process.env;
		const reads: string[] = [];
		process.env = new Proxy(real, {
			get(target, key, receiver) {
				// As a script's frame would read: the caller's frame names it.
				const by = readingScript(
					`Error\n    at get (proxy)\n    at x (${SCRIPTS}/generate-blog-draft.ts:29:17)`,
				);
				if (by !== null && typeof key === "string") reads.push(`${by}: ${key}`);
				return Reflect.get(target, key, receiver);
			},
		});
		try {
			void process.env.LM_BASE_URL;
		} finally {
			process.env = real;
		}
		expect(reads).toEqual(["generate-blog-draft.ts: LM_BASE_URL"]);
		expect(
			readingScript(
				`Error\n    at get (proxy)\n    at y (${SCRIPTS}/${SELF}:1:1)`,
			),
		).toBeNull();
		expect(
			readingScript(
				"Error\n    at get (proxy)\n    at z (node_modules/vitest/x.js:1:1)",
			),
		).toBeNull();
	});
});
