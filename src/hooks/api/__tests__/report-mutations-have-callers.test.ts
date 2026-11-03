/**
 * Every report mutation has a caller (66.2-39 fix round 1, part G).
 *
 * WHY. `reportMutations.downloadYearEndCsv` and `download1099Csv` sat in
 * `query-keys/report-keys.ts` for months with no caller. They read as the
 * sanctioned way to export a report, so `/analytics/financial` grew its own
 * fetch beside them instead, and that fetch sent a POST body the function
 * never reads. A declared-but-uncalled mutation is not harmless.
 *
 * THE RULE. A `reportMutations` member is called only as
 * `reportMutations.<name>(` (the factories are spread into `useMutation`), and
 * a `mutationKeys.reports` key only as `mutationKeys.reports.<name>`, so the
 * trace follows those member accesses through every non-test source file under
 * `src/`. A name nothing reaches is dead and must be deleted. The member lists
 * come from the real objects, not from a copy of them.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { identifierSource } from "#test/utils/regexp-source";
import { mutationKeys } from "../mutation-keys";
import { reportMutations } from "../query-keys/report-keys";

const ROOT = process.cwd();
const SRC = resolve(ROOT, "src");
const CODE_FILE = /\.(ts|tsx)$/;
const TEST_FILE = /(\.test|\.spec)\.(ts|tsx)$|\/__tests__\//;

function walk(dir: string, out: string[]): string[] {
	for (const name of readdirSync(dir)) {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) walk(path, out);
		else if (CODE_FILE.test(name) && !TEST_FILE.test(path)) out.push(path);
	}
	return out;
}

/**
 * The names of `objectPath` members that no file other than the declaring one
 * accesses (the declaring file's own references, such as a factory reading
 * its key, are not callers).
 */
function uncalledMembers(
	objectPath: string,
	names: readonly string[],
	sources: ReadonlyMap<string, string>,
	declaringFile: string,
): string[] {
	const used = new Set<string>();
	const access = new RegExp(
		`${identifierSource(objectPath)}\\.([A-Za-z_$][\\w$]*)`,
		"g",
	);
	for (const [path, source] of sources) {
		if (relative(ROOT, path) === declaringFile) continue;
		for (const match of source.matchAll(access)) {
			if (match[1]) used.add(match[1]);
		}
	}
	return names.filter((name) => !used.has(name)).sort();
}

function sourceMap(): Map<string, string> {
	const sources = new Map<string, string>();
	for (const path of walk(SRC, []))
		sources.set(path, readFileSync(path, "utf8"));
	return sources;
}

describe("report mutations and their keys have callers", () => {
	const sources = sourceMap();

	it("calls every reportMutations factory from outside report-keys.ts", () => {
		expect(sources.size).toBeGreaterThan(100);
		expect(
			uncalledMembers(
				"reportMutations",
				Object.keys(reportMutations),
				sources,
				"src/hooks/api/query-keys/report-keys.ts",
			),
		).toEqual([]);
	});

	it("uses every mutationKeys.reports key outside mutation-keys.ts", () => {
		expect(
			uncalledMembers(
				"mutationKeys.reports",
				Object.keys(mutationKeys.reports),
				sources,
				"src/hooks/api/mutation-keys.ts",
			),
		).toEqual([]);
	});

	it("flags a member nothing calls and accepts one a hook calls", () => {
		const declaring = "src/hooks/api/query-keys/fixture-keys.ts";
		const fixture = new Map<string, string>([
			[
				resolve(ROOT, declaring),
				"export const reportMutations = { used: () => 1, unused: () => 2 };\nreportMutations.unused();",
			],
			[
				resolve(ROOT, "src/hooks/api/use-fixture.ts"),
				"useMutation({ ...reportMutations.used() });",
			],
		]);
		expect(
			uncalledMembers(
				"reportMutations",
				["used", "unused"],
				fixture,
				declaring,
			),
		).toEqual(["unused"]);
	});

	it("reads the object path as literal text and as a whole identifier", () => {
		// `$` is an identifier character and a regex anchor: escaping only `.`
		// left `$reports` matching nothing, so every member read as uncalled.
		const fixture = new Map<string, string>([
			[resolve(ROOT, "src/a.ts"), "$reports.called();"],
			[resolve(ROOT, "src/b.ts"), "x$reports.lookalike();"],
		]);
		expect(
			uncalledMembers(
				"$reports",
				["called", "lookalike"],
				fixture,
				"src/decl.ts",
			),
		).toEqual(["lookalike"]);
	});
});
