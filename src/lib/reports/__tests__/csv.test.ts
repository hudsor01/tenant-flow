import Papa from "papaparse";
import { describe, expect, it } from "vitest";
import {
	CSV_MIME_TYPE,
	csvNumber,
	neutralizeCsvFormula,
	toCsv,
} from "#lib/reports/csv";

describe("csvNumber", () => {
	it("writes fixed decimals with no symbol or grouping", () => {
		expect(csvNumber(1234567.5, 2).text).toBe("1234567.50");
		expect(csvNumber(0, 2).text).toBe("0.00");
		expect(csvNumber(62.456, 1).text).toBe("62.5");
	});

	it("keeps a negative sign and drops it from a rounded negative zero", () => {
		expect(csvNumber(-120, 2).text).toBe("-120.00");
		expect(csvNumber(-0.004, 2).text).toBe("0.00");
		expect(csvNumber(-0, 2).text).toBe("0.00");
	});

	it("refuses NaN and infinities", () => {
		expect(() => csvNumber(Number.NaN, 2)).toThrow(RangeError);
		expect(() => csvNumber(Number.POSITIVE_INFINITY, 2)).toThrow(RangeError);
	});
});

describe("neutralizeCsvFormula", () => {
	it.each([
		["=SUM(A1:A2)", "'=SUM(A1:A2)"],
		["+1", "'+1"],
		["-2", "'-2"],
		["@cmd", "'@cmd"],
		["\tTab", "'\tTab"],
		["\rReturn", "'\rReturn"],
	])("prefixes %j", (input, expected) => {
		expect(neutralizeCsvFormula(input)).toBe(expected);
	});

	it("leaves ordinary text alone", () => {
		expect(neutralizeCsvFormula("Rental Payments Received")).toBe(
			"Rental Payments Received",
		);
		expect(neutralizeCsvFormula("a=b")).toBe("a=b");
		expect(neutralizeCsvFormula("")).toBe("");
	});
});

describe("toCsv", () => {
	it("writes CRLF rows, quotes delimiters and doubles quotes", () => {
		expect(
			toCsv(
				["Name", "Amount"],
				[
					['Smith, "Jr"', csvNumber(10, 2)],
					["Line\nbreak", csvNumber(-5, 2)],
				],
			),
		).toBe('Name,Amount\r\n"Smith, ""Jr""",10.00\r\n"Line\nbreak",-5.00');
	});

	it("neutralizes text cells but never a number cell", () => {
		const csv = toCsv(
			["Item", "Amount"],
			[
				['=HYPERLINK("http://x")', csvNumber(-1234.5, 2)],
				["-Owner draw", csvNumber(-0.5, 2)],
			],
		);
		const parsed = Papa.parse<string[]>(csv, { newline: "\r\n" }).data;
		expect(parsed).toEqual([
			["Item", "Amount"],
			['\'=HYPERLINK("http://x")', "-1234.50"],
			["'-Owner draw", "-0.50"],
		]);
	});

	it("writes the header alone for no rows, with no BOM", () => {
		const csv = toCsv(["A", "B"], []);
		expect(csv).toBe("A,B");
		expect(csv.charCodeAt(0)).not.toBe(0xfeff);
	});

	it("names a UTF-8 CSV type", () => {
		expect(CSV_MIME_TYPE).toBe("text/csv;charset=utf-8");
	});
});
