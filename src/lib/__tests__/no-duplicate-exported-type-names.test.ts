/**
 * No two first-party modules export a type or interface under one name
 * (CLAUDE.md zero-tolerance rule 3, "No duplicate types"; Type Lookup Order).
 * A second declaration of a name sends a search in the lookup order to
 * whichever file it finds first, and auto-import offers both.
 *
 * 66.2-39 fix round 4 (G65): the PR added `MaintenanceCostSummary` to
 * `#types/analytics` beside an unimported one of another shape in
 * `#types/core`; the unimported one is gone. The scan covers every tracked
 * non-test `.ts`/`.tsx` file under `src/` but the generated
 * `src/types/supabase.ts`: each line that starts `export type Name` or
 * `export interface Name` (`declare` allowed). `RATCHET` holds the 13 older
 * names with the files that declare each, as they stood when the scan
 * landed; a name may leave it, or lose a file, and nothing may join it.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const EXPORTED_TYPE =
	/^export\s+(?:declare\s+)?(?:type|interface)\s+([A-Za-z_$][\w$]*)/gm;

/** The type names `source` exports by declaration, in order. */
function exportedTypeNames(source: string): string[] {
	return [...source.matchAll(EXPORTED_TYPE)].map((match) => match[1] ?? "");
}

/** Name -> the sorted files that export it, for names in two files or more. */
function duplicates(
	files: ReadonlyArray<readonly [path: string, source: string]>,
): Map<string, string[]> {
	const byName = new Map<string, Set<string>>();
	for (const [path, source] of files) {
		for (const name of exportedTypeNames(source)) {
			byName.set(name, (byName.get(name) ?? new Set<string>()).add(path));
		}
	}
	return new Map(
		[...byName]
			.filter(([, paths]) => paths.size > 1)
			.map(([name, paths]) => [name, [...paths].sort()]),
	);
}

/** The older duplicates: `Name path path …`, one line per name. */
const RATCHET = `
ActionType src/lib/constants/status-types.ts src/types/core.ts
ActivityEntityType src/lib/constants/status-types.ts src/types/core.ts
EntityType src/lib/constants/status-types.ts src/types/core.ts
MaintenanceCategory src/lib/constants/status-types.ts src/types/core.ts
Permission src/lib/constants/status-types.ts src/types/core.ts
PlanType src/lib/constants/status-types.ts src/types/stripe.ts
PropertyType src/lib/constants/status-types.ts src/types/core.ts
SortDirection src/components/leases/table/lease-utils.ts src/components/properties/property-table-types.ts src/components/tenants/tenant-table-helpers.tsx src/lib/constants/status-types.ts
SortField src/components/leases/table/lease-utils.ts src/components/properties/property-table-types.ts src/components/tenants/tenant-table-helpers.tsx
Store src/components/ui/file-upload/types.ts src/components/ui/stepper-types.ts
StoreState src/components/ui/file-upload/types.ts src/components/ui/stepper-types.ts
SubscriptionStatus src/lib/constants/status-types.ts src/types/core.ts
UnitFormData src/components/properties/types.ts src/lib/validation/units.ts
`;

function ratchet(): Map<string, string[]> {
	return new Map(
		RATCHET.split("\n")
			.map((line) => line.trim())
			.filter(Boolean)
			.map((line) => {
				const [name = "", ...paths] = line.split(/\s+/);
				return [name, paths];
			}),
	);
}

function trackedSourceFiles(): string[] {
	const out = execFileSync("git", ["ls-files", "-z", "--", "src"], {
		cwd: process.cwd(),
		encoding: "utf8",
		maxBuffer: 64 * 1024 * 1024,
	});
	return out
		.split("\0")
		.filter((path) => /\.(ts|tsx)$/.test(path))
		.filter((path) => path !== "src/types/supabase.ts")
		.filter((path) => !/(^|\/)__tests__\/|\.test\.tsx?$/.test(path));
}

function readOrNull(path: string): string | null {
	try {
		return readFileSync(path, "utf8");
	} catch {
		// Tracked but deleted in the working tree: nothing to scan.
		return null;
	}
}

describe("exported type names are unique in src", () => {
	it("counts a name once per file, across files only", () => {
		const found = duplicates([
			["a.ts", "export interface Row { a: string }\nexport type Id = string;"],
			["b.ts", "export declare type Row = { b: number };"],
			[
				"c.ts",
				"type Row = number;\n// export type Id = number;\nexport type Other = 1;",
			],
		]);
		expect([...found]).toEqual([["Row", ["a.ts", "b.ts"]]]);
	});

	it("adds no duplicate beyond the ratchet, and keeps the ratchet current", () => {
		const files = trackedSourceFiles()
			.map((path) => [path, readOrNull(path)] as const)
			.filter((entry): entry is readonly [string, string] => entry[1] !== null);
		expect(files.length).toBeGreaterThan(500);
		const found = duplicates(files);
		const older = ratchet();
		const added = [...found]
			.filter(([name, paths]) => {
				const allowed = older.get(name) ?? [];
				return paths.some((path) => !allowed.includes(path));
			})
			.map(([name, paths]) => `${name}: ${paths.join(", ")}`);
		expect(
			added,
			`exported type names declared in two files (rule 3): import the one in the Type Lookup Order instead:\n${added.join("\n")}`,
		).toEqual([]);
		const stale = [...older]
			.filter(([name, paths]) => {
				const now = found.get(name) ?? [];
				return paths.join(" ") !== now.join(" ");
			})
			.map(([name, paths]) => `${name}: ${paths.join(", ")}`);
		expect(
			stale,
			`no longer duplicated as RATCHET says; update or remove its line:\n${stale.join("\n")}`,
		).toEqual([]);
	});
});
