import { describe, expect, it } from "vitest";
import { escapeOrValue, normalizeSearchInput } from "#lib/sanitize-search";

describe("normalizeSearchInput", () => {
	it("returns simple text unchanged", () => {
		expect(normalizeSearchInput("hello world")).toBe("hello world");
	});

	it("preserves dotted / email input (the UIX-03 bug)", () => {
		expect(normalizeSearchInput("jane.doe@acme.com")).toBe("jane.doe@acme.com");
	});

	it("trims surrounding whitespace but keeps inner value chars", () => {
		expect(normalizeSearchInput("  jane.doe@acme.com  ")).toBe(
			"jane.doe@acme.com",
		);
	});

	it("preserves commas, parentheses, quotes and backslashes as literal text", () => {
		expect(normalizeSearchInput('O\'Brien, (Apt 4B) \\ "x"')).toBe(
			'O\'Brien, (Apt 4B) \\ "x"',
		);
	});

	it("preserves percent signs (ILIKE wildcard)", () => {
		expect(normalizeSearchInput("100%")).toBe("100%");
	});

	it("preserves hyphens, spaces, and alphanumerics", () => {
		expect(normalizeSearchInput("123 Main St - Apt 4B")).toBe(
			"123 Main St - Apt 4B",
		);
	});

	it("enforces 100-character max length", () => {
		expect(normalizeSearchInput("a".repeat(150))).toHaveLength(100);
	});

	it("returns empty string for empty input", () => {
		expect(normalizeSearchInput("")).toBe("");
	});

	it("returns empty string for whitespace-only input", () => {
		expect(normalizeSearchInput("   ")).toBe("");
	});
});

describe("escapeOrValue", () => {
	it("leaves ordinary text untouched", () => {
		expect(escapeOrValue("hello world")).toBe("hello world");
	});

	it("preserves dotted / email input (no value stripping)", () => {
		expect(escapeOrValue("jane.doe@acme.com")).toBe("jane.doe@acme.com");
	});

	it("escapes a double quote", () => {
		expect(escapeOrValue('a"b')).toBe('a\\"b');
	});

	it("escapes a backslash", () => {
		expect(escapeOrValue("a\\b")).toBe("a\\\\b");
	});

	it("escapes the backslash BEFORE the quote (order matters)", () => {
		// input:  a \ " b  ->  backslash doubled, quote escaped
		expect(escapeOrValue('a\\"b')).toBe('a\\\\\\"b');
	});

	it("keeps .or() metachars literal so a wrapped value cannot break out", () => {
		// A .or() injection payload: commas/dots that would otherwise open a
		// new filter clause. They are preserved verbatim (no stripping); once
		// double-quote-wrapped at the call site they are inert literal text.
		const injection = ",owner_user_id.neq.0";
		const escaped = escapeOrValue(injection);
		expect(escaped).toBe(",owner_user_id.neq.0");
		// No quote/backslash in the payload -> nothing to escape, but the
		// value carries no unescaped `"` that could terminate the wrap.
		expect(escaped).not.toContain('\\"');
	});

	it("escapes a quote-based break-out attempt", () => {
		// Attacker tries to close the double-quote wrap and inject a clause.
		const injection = '","x").or.(owner_user_id.neq.0';
		const escaped = escapeOrValue(injection);
		// The leading quote is escaped, so it can't terminate the wrap.
		expect(escaped.startsWith('\\"')).toBe(true);
		expect(escaped).toBe('\\",\\"x\\").or.(owner_user_id.neq.0');
	});

	it("applies the length cap via normalizeSearchInput", () => {
		expect(escapeOrValue("a".repeat(150))).toHaveLength(100);
	});

	it("returns empty string for empty / whitespace-only input", () => {
		expect(escapeOrValue("")).toBe("");
		expect(escapeOrValue("   ")).toBe("");
	});
});
