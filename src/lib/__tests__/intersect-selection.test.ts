import { describe, expect, it } from "vitest";
import { intersectSelection } from "../intersect-selection";

describe("intersectSelection (STATE-05 / STATE-12 bulk-action guard)", () => {
	it("excludes a stale/soft-deleted id absent from the current list", () => {
		// "b" was just deleted and is no longer in the listed ids — it must not
		// be passed to a bulk mutation (which would resurrect/re-target it).
		expect(intersectSelection(new Set(["a", "b", "c"]), ["a", "c"])).toEqual([
			"a",
			"c",
		]);
	});

	it("keeps all ids when every selected id is still listed", () => {
		expect(intersectSelection(new Set(["a", "b"]), ["a", "b", "c"])).toEqual([
			"a",
			"b",
		]);
	});

	it("returns an empty array when no selected id is listed", () => {
		expect(intersectSelection(new Set(["x", "y"]), ["a", "b"])).toEqual([]);
	});

	it("accepts an array selection as well as a Set", () => {
		expect(intersectSelection(["a", "z"], ["a", "b"])).toEqual(["a"]);
	});
});
