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
