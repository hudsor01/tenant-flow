import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
	CONDITION_RATINGS,
	INSPECTION_STATUSES,
	INSPECTION_TYPES,
	isConditionRating,
	isInspectionStatus,
	isInspectionType,
	isRoomType,
	narrowInspectionEnums,
	narrowInspectionRoomEnums,
	ROOM_TYPES,
} from "#types/sections/inspections";

function thrownMessage(fn: () => unknown): string {
	try {
		fn();
	} catch (err) {
		return (err as Error).message;
	}
	throw new Error("expected fn to throw");
}

/**
 * Pulls the value list out of a `check (<column> in ('a', 'b', ...))` clause in
 * a migration so the union arrays can be pinned to the DB CHECK constraints.
 */
function checkConstraintMembers(sql: string, column: string): string[] {
	const clause = sql.match(
		new RegExp(`check\\s*\\(\\s*${column}\\s+in\\s*\\(([^)]*)\\)`, "i"),
	);
	const inner = clause?.[1];
	if (inner === undefined) {
		throw new Error(`CHECK constraint for "${column}" not found in migration`);
	}
	return Array.from(inner.matchAll(/'([a-z_]+)'/g))
		.map((m) => m[1])
		.filter((v): v is string => v !== undefined);
}

describe("inspection enum type guards", () => {
	it("accepts every valid union member", () => {
		for (const v of INSPECTION_STATUSES)
			expect(isInspectionStatus(v)).toBe(true);
		for (const v of INSPECTION_TYPES) expect(isInspectionType(v)).toBe(true);
		for (const v of ROOM_TYPES) expect(isRoomType(v)).toBe(true);
		for (const v of CONDITION_RATINGS) expect(isConditionRating(v)).toBe(true);
	});

	it("rejects out-of-union values", () => {
		expect(isInspectionStatus("archived")).toBe(false);
		expect(isInspectionType("walkthrough")).toBe(false);
		expect(isRoomType("attic")).toBe(false);
		expect(isConditionRating("destroyed")).toBe(false);
	});
});

describe("narrowInspectionEnums", () => {
	it("narrows a valid row to the literal unions", () => {
		const narrowed = narrowInspectionEnums({
			id: "i1",
			inspection_type: "move_in",
			status: "pending",
		});
		expect(narrowed.inspection_type).toBe("move_in");
		expect(narrowed.status).toBe("pending");
	});

	it("throws loudly on unexpected status / type", () => {
		expect(
			thrownMessage(() =>
				narrowInspectionEnums({
					id: "i1",
					inspection_type: "move_in",
					status: "bogus",
				}),
			),
		).toContain('Unexpected status "bogus"');
		expect(
			thrownMessage(() =>
				narrowInspectionEnums({
					id: "i1",
					inspection_type: "teleport",
					status: "pending",
				}),
			),
		).toContain('Unexpected inspection_type "teleport"');
	});
});

describe("narrowInspectionRoomEnums", () => {
	it("narrows a valid room to the literal unions", () => {
		const narrowed = narrowInspectionRoomEnums({
			id: "r1",
			room_type: "kitchen",
			condition_rating: "good",
		});
		expect(narrowed.room_type).toBe("kitchen");
		expect(narrowed.condition_rating).toBe("good");
	});

	it("throws loudly on unexpected room_type / condition_rating", () => {
		expect(
			thrownMessage(() =>
				narrowInspectionRoomEnums({
					id: "r1",
					room_type: "attic",
					condition_rating: "good",
				}),
			),
		).toContain('Unexpected room_type "attic"');
		expect(
			thrownMessage(() =>
				narrowInspectionRoomEnums({
					id: "r1",
					room_type: "kitchen",
					condition_rating: "ruined",
				}),
			),
		).toContain('Unexpected condition_rating "ruined"');
	});
});

describe("union arrays are in lockstep with the DB CHECK constraints", () => {
	// The fail-loud narrowers (narrowInspectionEnums / narrowInspectionRoomEnums)
	// throw on any value outside these arrays, so a migration that widens a CHECK
	// without updating the union would crash the whole inspection list/detail
	// query on real rows. This pins the arrays to the create-table migration —
	// drift becomes a build failure instead of a runtime crash.
	const migrationSql = readFileSync(
		"supabase/migrations/20260220110000_create_inspections_tables.sql",
		"utf8",
	);

	it("INSPECTION_TYPES matches the inspection_type CHECK", () => {
		expect(
			checkConstraintMembers(migrationSql, "inspection_type").sort(),
		).toEqual([...INSPECTION_TYPES].sort());
	});

	it("INSPECTION_STATUSES matches the status CHECK", () => {
		expect(checkConstraintMembers(migrationSql, "status").sort()).toEqual(
			[...INSPECTION_STATUSES].sort(),
		);
	});

	it("ROOM_TYPES matches the room_type CHECK", () => {
		expect(checkConstraintMembers(migrationSql, "room_type").sort()).toEqual(
			[...ROOM_TYPES].sort(),
		);
	});

	it("CONDITION_RATINGS matches the condition_rating CHECK", () => {
		expect(
			checkConstraintMembers(migrationSql, "condition_rating").sort(),
		).toEqual([...CONDITION_RATINGS].sort());
	});
});
