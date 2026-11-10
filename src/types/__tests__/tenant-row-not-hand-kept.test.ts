/**
 * No hand-kept copy of a generated `tenants` column (Zero Tolerance Rule 3;
 * 66.2-39 fix round 4, Part 8k).
 *
 * The regenerated `Database` type (bf076f8e7) added `move_out_date` and
 * `move_out_reason` to the `tenants` Row. `core.ts` then declared them twice
 * more: `TenantWithExtras` (an export nothing read) intersected `Tenant` and
 * re-declared `move_out_date`, and `TenantWithLeaseInfo` copied all eighteen
 * Row columns by hand, so a column the database adds had to be copied there
 * again. `TenantWithLeaseInfo` now extends `Tenant`, and `TenantWithExtras` is
 * gone. This reads the Row from the generated file, so a column the generator
 * adds later is covered too.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const TYPES = join(process.cwd(), "src/types");

/** The `tenants` Row's column names, read from the generated file. */
function tenantColumns(): string[] {
	const generated = readFileSync(join(TYPES, "supabase.ts"), "utf8");
	const table = generated.indexOf("\t\t\ttenants: {");
	const row = generated.indexOf("Row: {", table);
	const end = generated.indexOf("};", row);
	return [...generated.slice(row, end).matchAll(/^\s+([a-z_]+): /gm)].map(
		(m) => m[1] as string,
	);
}

/** Columns other tables share (and other hand-written shapes name for themselves). */
const SHARED = new Set([
	"id",
	"name",
	"email",
	"phone",
	"first_name",
	"last_name",
	"status",
	"created_at",
	"updated_at",
	"owner_user_id",
]);

describe("the tenants Row is read from the generated type, never copied", () => {
	it("reads the Row's columns, the two the generator added included", () => {
		const columns = tenantColumns();
		expect(columns).toContain("move_out_date");
		expect(columns).toContain("move_out_reason");
		expect(columns.length).toBeGreaterThanOrEqual(18);
	});

	it("no hand-written type in src/types declares a tenants-only column", () => {
		const own = tenantColumns().filter((c) => !SHARED.has(c));
		const hits: string[] = [];
		for (const file of readdirSync(TYPES)) {
			if (!file.endsWith(".ts") || file === "supabase.ts") continue;
			const lines = readFileSync(join(TYPES, file), "utf8").split("\n");
			lines.forEach((line, i) => {
				const prop = line.match(/^\s+([a-z_]+)\??: /)?.[1];
				if (prop && own.includes(prop)) hits.push(`${file}:${i + 1} ${prop}`);
			});
		}
		expect(hits).toEqual([]);
	});
});
