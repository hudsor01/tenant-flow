/**
 * Pins the in-tree fix for GHSA-fc5q-39xc-vjpf (picomatch <= 4.0.7 ReDoS
 * through single-branch repeated extglobs such as `+(*)` and `+(*a)`).
 *
 * No fixed picomatch is published and every parent (tinyglobby, fdir,
 * @rollup/plugin-commonjs, @rollup/pluginutils, knip) requires `^4`, so the
 * fix is `patches/picomatch@4.0.7.patch`, applied by bun via
 * `patchedDependencies`. `.github/scripts/audit-gate.sh` accepts the
 * advisory only while that patch is declared for 4.0.7; this test fails if
 * the installed picomatch stops carrying it.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);

function loadIsMatch(): (input: string, glob: string) => boolean {
	const picomatch: unknown = require("picomatch");
	if (
		typeof picomatch !== "function" ||
		!("isMatch" in picomatch) ||
		typeof picomatch.isMatch !== "function"
	) {
		throw new Error("picomatch did not load as expected");
	}
	const isMatch = picomatch.isMatch;
	return (input, glob) => isMatch(input, glob) === true;
}

/** Runs one match in a child process so a hang is cut off, not inherited. */
function timedMatch(glob: string, input: string): { timedOut: boolean } {
	const script = `require("picomatch").isMatch(${JSON.stringify(input)}, ${JSON.stringify(glob)});`;
	const result = spawnSync(process.execPath, ["-e", script], {
		cwd: process.cwd(),
		timeout: 3000,
	});
	return { timedOut: result.error !== undefined || result.signal !== null };
}

describe("picomatch GHSA-fc5q-39xc-vjpf patch", () => {
	it("is installed: the patched check is in picomatch's parser", () => {
		const parser = require.resolve("picomatch/lib/parse.js");
		expect(readFileSync(parser, "utf8")).toContain("GHSA-fc5q-39xc-vjpf");
	});

	it.each([
		["+(*a)", `${"a".repeat(28)}!`],
		["+(*)", `${"a".repeat(28)}/`],
		["*(*a)", `${"a".repeat(28)}!`],
	])("%s returns promptly on a crafted input", (glob, input) => {
		expect(timedMatch(glob, input)).toEqual({ timedOut: false });
	});

	it.each([
		["src/a/b.test.tsx", "**/*.{test,spec}.?(c|m)[jt]s?(x)", true],
		["src/a/b.ts", "**/*.{test,spec}.?(c|m)[jt]s?(x)", false],
		["a/b/c.md", "a/**", true],
		["abc", "+(a|b|c)", true],
		["aaa", "+(*(a))", true],
		["x.ts", "!(*.d).ts", true],
		["x.d.ts", "!(*.d).ts", false],
	])("still matches %s against %s as before", (input, glob, expected) => {
		expect(loadIsMatch()(input, glob)).toBe(expected);
	});
});
