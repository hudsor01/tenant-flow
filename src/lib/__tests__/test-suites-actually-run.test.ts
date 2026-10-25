/**
 * Drift guard: no test file may land in a project that nothing executes.
 *
 * vitest.config.ts declares a `component` project collecting files named
 * `*.component.test.{ts,tsx}` under `src/`, and the `unit` project excludes the
 * same pattern. Nothing runs `component`: not lefthook (pre-commit runs
 * `test:unit`), not any job in .github/workflows. So such a file is collected
 * by exactly one project, and that project is executed by nothing -- the tests
 * in it pass by never running, which is the same defect as the unit suite
 * having run nowhere for Dependabot's commits.
 *
 * The unit exclude used to read `.tsx` only while the component include read
 * `{ts,tsx}`, so a `*.component.test.ts` file ran in BOTH projects and the
 * claim above was false for it. The two patterns are now asserted to match,
 * because this guard's failure message asserts WHY a file never runs and that
 * reason has to stay true -- in the state where the exclude is narrower, the
 * message is a confident lie.
 *
 * Pure filesystem read -- never touches the DOM.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");
const VITEST_CONFIG = join(process.cwd(), "vitest.config.ts");

/** Files matching this are collected by the `component` project, which nothing runs. */
const ORPHANED = /\.component\.test\.tsx?$/;

function walk(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) return walk(full);
		return entry.isFile() ? [full] : [];
	});
}

const files = walk(SRC).map((file) => relative(process.cwd(), file));

describe("every test file belongs to a suite something runs", () => {
	it("walked a tree that actually contains tests", () => {
		// Without this, a broken walk would make the assertion below pass
		// vacuously -- which is exactly the shape of the bug it guards against.
		expect(files.length).toBeGreaterThan(0);
		expect(
			files.filter((file) => /\.test\.tsx?$/.test(file)).length,
		).toBeGreaterThan(0);
	});

	it("has no *.component.test.ts or .tsx file, because nothing executes that project", () => {
		const orphaned = files.filter((file) => ORPHANED.test(file));
		expect(
			orphaned,
			`These files are collected ONLY by vitest's \`component\` project, and no hook and no CI job runs it -- they pass by never running:\n${orphaned.join("\n")}\nRename them to *.test.tsx to join the unit project, or add the component project to ci-cd.yml.`,
		).toEqual([]);
	});

	it("the unit project excludes exactly what the component project collects", () => {
		// The message above states a REASON. If the unit exclude is narrower
		// than the component include, a matching file does run -- in both
		// projects -- and the reason becomes false while the test stays green.
		// Asserted against the config text, because the patterns are string
		// literals and a reader checking this claim reads the same two lines.
		const config = readFileSync(VITEST_CONFIG, "utf8");
		const pattern = "src/**/*.component.test.{ts,tsx}";
		const occurrences = config.split(pattern).length - 1;
		expect(
			occurrences,
			`vitest.config.ts must contain "${pattern}" twice -- once as the component project's include, once as the unit project's exclude -- and it appears ${occurrences} time(s). While they differ, a file matching the wider pattern runs in both projects and this file's failure message is wrong about why it would not.`,
		).toBe(2);
	});
});
