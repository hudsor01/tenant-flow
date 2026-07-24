/**
 * formatBytes unit tests.
 *
 * Pins the B/KB/MB/null/0 behavior AND the new GB branch (METER-03): storage
 * quotas are measured in GB, but the formatter previously topped out at MB and
 * would render a multi-GB value as a four-digit MB string ("5120.0 MB"). The
 * regression cases below prove a >= 1024 MB byte count now flips to GB.
 */

import { describe, expect, it } from "vitest";
import { formatBytes } from "../format-bytes";

const KB = 1024;
const MB = KB * KB;
const GB = KB * KB * KB;

describe("formatBytes — unchanged B/KB/MB/null/0 behavior", () => {
	it("returns the em-dash for null/undefined", () => {
		expect(formatBytes(null)).toBe("—");
		expect(formatBytes(undefined)).toBe("—");
	});

	it("distinguishes a real zero-byte file from unknown", () => {
		expect(formatBytes(0)).toBe("0 B");
	});

	it("renders raw bytes below 1 KB", () => {
		expect(formatBytes(512)).toBe("512 B");
	});

	it("renders KB below the 1024 KB crossover", () => {
		expect(formatBytes(KB)).toBe("1 KB");
		expect(formatBytes(2 * KB)).toBe("2 KB");
	});

	it("renders MB from 1 MB up to the GB crossover", () => {
		expect(formatBytes(MB)).toBe("1.0 MB");
		expect(formatBytes(5 * MB)).toBe("5.0 MB");
	});
});

describe("formatBytes — GB branch (METER-03)", () => {
	it("renders exactly 1 GB", () => {
		expect(formatBytes(GB)).toBe("1.0 GB");
	});

	it("renders a multi-GB value in GB", () => {
		expect(formatBytes(5 * GB)).toBe("5.0 GB");
	});

	it("regression: a >= 1024 MB value renders as GB, never four-digit MB", () => {
		const twoGb = 2 * GB;
		const rendered = formatBytes(twoGb);
		expect(rendered).toBe("2.0 GB");
		expect(rendered).toMatch(/GB$/);
		expect(rendered).not.toMatch(/MB$/);
	});
});
