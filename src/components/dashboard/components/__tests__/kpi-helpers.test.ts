/**
 * Pin the Phase 3 KPI helper contracts:
 * - `formatTrendPercent` rounding + typographic-minus rule (03-UI-SPEC § 4.3).
 * - `sparklineConfigForTrend` trend → status-token map (03-UI-SPEC § 6.2).
 *
 * Plan 03-02 (orchestrator) imports both functions; this file is the cycle-1
 * proof that their contracts are locked before tile wiring starts.
 */

import { describe, expect, it } from "vitest";

import {
	formatTrendPercent,
	sparklineConfigForTrend,
} from "#components/dashboard/components/kpi-helpers";

describe("formatTrendPercent", () => {
	it("formats a positive trend with a `+` sign", () => {
		expect(formatTrendPercent(12.4)).toBe("+12%");
	});

	it("formats a negative trend with U+2212 typographic minus", () => {
		const formatted = formatTrendPercent(-3.2);
		expect(formatted).toBe("−3%");
		// The leading character MUST be U+2212 (typographic minus), NOT U+002D
		// (hyphen-minus). 03-UI-SPEC § 4.3 pins this.
		expect(formatted.charCodeAt(0)).toBe(0x2212);
	});

	it("emits `0%` with no sign for exact zero", () => {
		const formatted = formatTrendPercent(0);
		expect(formatted).toBe("0%");
		// First character is the digit `0`, not a sign.
		expect(formatted.charCodeAt(0)).toBe("0".charCodeAt(0));
	});

	it("emits `0%` with no sign for a positive value that rounds to zero", () => {
		const formatted = formatTrendPercent(0.4);
		expect(formatted).toBe("0%");
		expect(formatted.charCodeAt(0)).toBe("0".charCodeAt(0));
	});

	it("emits `0%` with no sign for a negative value that rounds to zero", () => {
		const formatted = formatTrendPercent(-0.4);
		expect(formatted).toBe("0%");
		expect(formatted.charCodeAt(0)).toBe("0".charCodeAt(0));
	});
});

describe("sparklineConfigForTrend", () => {
	it("maps `up` → `--color-success` in both light + dark theme entries", () => {
		const config = sparklineConfigForTrend("up");
		const spark = config.spark;
		// Narrow `spark` past `noUncheckedIndexedAccess` (always present — the
		// helper always populates this key) and into the `theme` variant of the
		// ChartConfig union (the helper always emits the theme branch).
		if (!spark || !("theme" in spark) || !spark.theme) {
			throw new Error("sparklineConfigForTrend must populate `spark.theme`");
		}
		expect(spark.theme.light).toBe("var(--color-success)");
		expect(spark.theme.dark).toBe("var(--color-success)");
	});

	it("maps `down` → `--color-warning` in both light + dark theme entries", () => {
		const config = sparklineConfigForTrend("down");
		const spark = config.spark;
		if (!spark || !("theme" in spark) || !spark.theme) {
			throw new Error("sparklineConfigForTrend must populate `spark.theme`");
		}
		expect(spark.theme.light).toBe("var(--color-warning)");
		expect(spark.theme.dark).toBe("var(--color-warning)");
	});

	it("maps `stable` → `--color-muted-foreground` in both light + dark theme entries", () => {
		const config = sparklineConfigForTrend("stable");
		const spark = config.spark;
		if (!spark || !("theme" in spark) || !spark.theme) {
			throw new Error("sparklineConfigForTrend must populate `spark.theme`");
		}
		expect(spark.theme.light).toBe("var(--color-muted-foreground)");
		expect(spark.theme.dark).toBe("var(--color-muted-foreground)");
	});
});
