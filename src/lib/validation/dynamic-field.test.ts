import { describe, expect, it, vi } from "vitest";
import { parseDynamicFields } from "./dynamic-field";

vi.mock("#lib/frontend-logger", () => ({
	logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const valid = { name: "email", label: "Email", type: "email" as const };

describe("parseDynamicFields (TYPE-07)", () => {
	it("passes a fully valid array through unchanged", () => {
		const fields = [
			valid,
			{ name: "count", label: "Count", type: "number" as const },
		];
		expect(parseDynamicFields(fields)).toEqual(fields);
	});

	it("returns [] for non-array input instead of crashing", () => {
		for (const bad of [null, undefined, {}, "nope", 42, true]) {
			expect(parseDynamicFields(bad)).toEqual([]);
		}
	});

	it("drops malformed entries while keeping the valid ones", () => {
		const parsed = parseDynamicFields([
			valid,
			{ label: "no name", type: "text" }, // missing required `name`
			{ name: "bad", label: "Bad type", type: "nope" }, // invalid enum
			{ name: "phone", label: "Phone", type: "tel" },
		]);
		expect(parsed).toHaveLength(2);
		expect(parsed.map((f) => f.name)).toEqual(["email", "phone"]);
	});
});
