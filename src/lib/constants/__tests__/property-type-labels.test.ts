/**
 * propertyTypeLabel names a stored property_type the way the property form
 * does. properties.property_type is free text: the form writes SINGLE_FAMILY,
 * other paths have written single_family and multi_family, and the property
 * page measured on a production build printed "single_family" until the match
 * ignored case (66.2-39, part K).
 */
import { describe, expect, it } from "vitest";
import {
	PROPERTY_TYPE_LABELS,
	propertyTypeLabel,
} from "#lib/constants/status-types";

describe("propertyTypeLabel", () => {
	it.each([
		["SINGLE_FAMILY", "Single Family"],
		["single_family", "Single Family"],
		["MULTI_UNIT", "Multi Family"],
		["multi_unit", "Multi Family"],
		["multi_family", "Multi Family"],
		["Condo", "Condo"],
		["OTHER", "Other"],
	])("names %s as %s", (stored, label) => {
		expect(propertyTypeLabel(stored)).toBe(label);
	});

	it("leaves a value outside the set as written", () => {
		expect(propertyTypeLabel("duplex")).toBe("duplex");
		expect(propertyTypeLabel("constructor")).toBe("constructor");
	});

	it("labels every value the form offers", () => {
		expect(Object.values(PROPERTY_TYPE_LABELS)).toEqual([
			"Single Family",
			"Multi Family",
			"Apartment",
			"Commercial",
			"Condo",
			"Townhouse",
			"Other",
		]);
	});
});
