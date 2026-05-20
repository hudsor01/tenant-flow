/**
 * calculateAnnualSavings unit tests — Phase 7 CONS-10 math pin.
 *
 * Pins the Phase 5 tier savings: Starter $38, Growth $98, Max $298.
 * The pricing cards inline `monthly * 2` (math-equivalent); this test
 * locks the canonical helper for any future caller.
 */

import { describe, expect, it } from "vitest";
import { calculateAnnualSavings } from "#config/pricing";

describe("calculateAnnualSavings (Phase 7 CONS-10 math)", () => {
	it("Starter $19/mo -> $38/year", () => {
		expect(calculateAnnualSavings(19)).toBe(38);
	});
	it("Growth $49/mo -> $98/year", () => {
		expect(calculateAnnualSavings(49)).toBe(98);
	});
	it("Max $149/mo -> $298/year", () => {
		expect(calculateAnnualSavings(149)).toBe(298);
	});
});
