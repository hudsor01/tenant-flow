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
 * claim above was false for it. The exclude now mirrors the include, which is
 * what makes this guard's stated reason true for both extensions.
 *
 * There are zero such files today, and this is what keeps that true. If a
 * component project is wanted, wire it into ci-cd.yml in the same commit that
 * adds the first file to it.
 *
 * Pure filesystem read -- never touches the DOM.
 */
import { readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");

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

	it("has no *.component.test.tsx file, because nothing executes that project", () => {
		const orphaned = files.filter((file) =>
			/\.component\.test\.tsx?$/.test(file),
		);
		expect(
			orphaned,
			`These files are collected ONLY by vitest's \`component\` project, and no hook and no CI job runs it -- they pass by never running:\n${orphaned.join("\n")}\nRename them to *.test.tsx to join the unit project, or add the component project to ci-cd.yml.`,
		).toEqual([]);
	});
});
