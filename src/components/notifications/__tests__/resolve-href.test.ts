import { describe, expect, it } from "vitest";

import { resolveHref } from "../notification-item";

// Open-redirect guard coverage (C8 / T-52-15). resolveHref must only ever
// return a same-origin app path or the /notifications fallback — never a
// value a browser could resolve to an external origin.
const FALLBACK = "/notifications";

describe("resolveHref open-redirect guard (C8)", () => {
	it("passes a valid app-relative path through unchanged", () => {
		expect(resolveHref("/notifications")).toBe("/notifications");
		expect(resolveHref("/leases/l1")).toBe("/leases/l1");
		expect(resolveHref("/maintenance/123?tab=notes")).toBe(
			"/maintenance/123?tab=notes",
		);
	});

	it("rejects protocol-relative //host URLs", () => {
		expect(resolveHref("//evil.com")).toBe(FALLBACK);
		expect(resolveHref("//evil.com/path")).toBe(FALLBACK);
	});

	it("rejects backslash variants that browsers normalize to //", () => {
		expect(resolveHref("/\\evil.com")).toBe(FALLBACK);
		expect(resolveHref("/\\\\evil.com")).toBe(FALLBACK);
		expect(resolveHref("\\/evil.com")).toBe(FALLBACK);
		expect(resolveHref("/path\\to")).toBe(FALLBACK);
	});

	it("rejects control-character variants that collapse to // when stripped", () => {
		const tab = String.fromCharCode(0x09);
		const newline = String.fromCharCode(0x0a);
		const cr = String.fromCharCode(0x0d);
		const nul = String.fromCharCode(0x00);
		const del = String.fromCharCode(0x7f);
		expect(resolveHref(`/${tab}//evil.com`)).toBe(FALLBACK);
		expect(resolveHref(`/${newline}//evil.com`)).toBe(FALLBACK);
		expect(resolveHref(`/${cr}//evil.com`)).toBe(FALLBACK);
		// Both guard conditions: code < 0x20 (NUL) and code === 0x7f (DEL).
		expect(resolveHref(`/${nul}evil`)).toBe(FALLBACK);
		expect(resolveHref(`/${del}evil`)).toBe(FALLBACK);
	});

	it("rejects javascript: and absolute external URLs", () => {
		expect(resolveHref("javascript:alert(1)")).toBe(FALLBACK);
		expect(resolveHref("https://evil.com")).toBe(FALLBACK);
		expect(resolveHref("http://evil.com/x")).toBe(FALLBACK);
	});

	it("falls back for null and empty values", () => {
		expect(resolveHref(null)).toBe(FALLBACK);
		expect(resolveHref("")).toBe(FALLBACK);
	});

	it("rejects a bare path with no leading slash", () => {
		expect(resolveHref("notifications")).toBe(FALLBACK);
	});
});
