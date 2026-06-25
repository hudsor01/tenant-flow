import { describe, expect, it } from "vitest";
import {
	CONDITION_RATING_LABELS,
	INSPECTION_STATUS_LABELS,
	ROOM_TYPE_LABELS,
} from "#components/inspections/inspection-labels";
import {
	CONDITION_RATINGS,
	INSPECTION_STATUSES,
	ROOM_TYPES,
} from "#types/sections/inspections";

describe("inspection label records", () => {
	it("labels exactly the inspection statuses, each non-empty", () => {
		expect(Object.keys(INSPECTION_STATUS_LABELS).sort()).toEqual(
			[...INSPECTION_STATUSES].sort(),
		);
		for (const status of INSPECTION_STATUSES) {
			expect(INSPECTION_STATUS_LABELS[status].length).toBeGreaterThan(0);
		}
	});

	it("labels exactly the room types, each non-empty", () => {
		expect(Object.keys(ROOM_TYPE_LABELS).sort()).toEqual(
			[...ROOM_TYPES].sort(),
		);
		for (const roomType of ROOM_TYPES) {
			expect(ROOM_TYPE_LABELS[roomType].length).toBeGreaterThan(0);
		}
	});

	it("labels exactly the condition ratings, each non-empty", () => {
		expect(Object.keys(CONDITION_RATING_LABELS).sort()).toEqual(
			[...CONDITION_RATINGS].sort(),
		);
		for (const rating of CONDITION_RATINGS) {
			expect(CONDITION_RATING_LABELS[rating].length).toBeGreaterThan(0);
		}
	});
});
