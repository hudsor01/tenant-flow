import { describe, expect, it } from "vitest";
import { computeColumnWidths, sanitizeSheetName } from "../generate-excel";

describe("sanitizeSheetName", () => {
	it("strips Excel-forbidden chars [ ] : * ? / \\", () => {
		expect(sanitizeSheetName("Rent:Roll/2026*Q1[draft]?\\foo")).toBe(
			"RentRoll2026Q1draftfoo",
		);
	});

	it("truncates at 31 characters (Excel sheet-name limit)", () => {
		const long = "a".repeat(50);
		const result = sanitizeSheetName(long);
		expect(result).toHaveLength(31);
		expect(result).toBe("a".repeat(31));
	});

	it("strips first then truncates (slice happens after replace)", () => {
		const input = `${"a".repeat(40)}[remove me]${"b".repeat(20)}`;
		const result = sanitizeSheetName(input);
		expect(result).toHaveLength(31);
		expect(result).not.toContain("[");
		expect(result).not.toContain("]");
	});

	it('falls back to "Sheet" when input fully strips to empty', () => {
		expect(sanitizeSheetName("[]:*?/\\")).toBe("Sheet");
	});

	it("preserves short clean names verbatim", () => {
		expect(sanitizeSheetName("Summary")).toBe("Summary");
		expect(sanitizeSheetName("Q1 P&L")).toBe("Q1 P&L");
	});
});

describe("computeColumnWidths", () => {
	it("clamps each width to the [10, 50] range", () => {
		// Single-row "ab" (2 chars + 2 pad = 4) should clamp UP to 10
		expect(computeColumnWidths([["ab"]])).toEqual([{ wch: 10 }]);
		// Single-row "x".repeat(80) (80+2 pad = 82) should clamp DOWN to 50
		expect(computeColumnWidths([["x".repeat(80)]])).toEqual([{ wch: 50 }]);
	});

	it("returns the max content width across rows per column", () => {
		const result = computeColumnWidths([
			["Property", "12"],
			["a very long property name here", "999999999"],
			["short", "0"],
		]);
		// Col 0 max = 30 chars + 2 pad = 32; col 1 max = 9 chars + 2 pad = 11
		expect(result).toEqual([{ wch: 32 }, { wch: 11 }]);
	});

	it("handles null / undefined cells via the `?? ''` read seam", () => {
		const result = computeColumnWidths([
			[null as unknown as string, "value"],
			["text", undefined as unknown as string],
		]);
		// Col 0 max from "text" (4 + 2 pad = 6 → clamped to 10)
		// Col 1 max from "value" (5 + 2 pad = 7 → clamped to 10)
		expect(result).toEqual([{ wch: 10 }, { wch: 10 }]);
	});

	it("returns an empty array for an empty input", () => {
		expect(computeColumnWidths([])).toEqual([]);
	});

	it("handles heterogeneous-length rows without crashing", () => {
		const result = computeColumnWidths([
			["a", "bb", "ccc"],
			["dddd"],
			["", "ee"],
		]);
		// Col 0 max="dddd" (4+2=6 → 10), col 1 max="ee" or "bb" (2+2=4 → 10), col 2 max="ccc" (3+2=5 → 10)
		expect(result).toEqual([{ wch: 10 }, { wch: 10 }, { wch: 10 }]);
	});

	it("handles numeric cells via String() coercion", () => {
		const result = computeColumnWidths([
			["Header", "Header"],
			[12345, 6789012345],
		]);
		// Col 0 max=6 (Header) → 10; col 1 max=10 (6789012345) → 12
		expect(result).toEqual([{ wch: 10 }, { wch: 12 }]);
	});
});
