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
	buildTileAriaLabel,
	formatTrendPercent,
	sparklineConfigForTrend,
} from "#components/dashboard/components/kpi-helpers";
import type { MetricTrend } from "#types/analytics";

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

	// WR-02 cycle-1 fix: NaN / Infinity guard. MetricTrend.percentChange is
	// typed `number` but the RPC can ship NaN on a stale row; without the
	// guard the chip would render "NaN%" / "+Infinity%".
	it("emits `0%` for NaN / Infinity input", () => {
		expect(formatTrendPercent(Number.NaN)).toBe("0%");
		expect(formatTrendPercent(Number.POSITIVE_INFINITY)).toBe("0%");
		expect(formatTrendPercent(Number.NEGATIVE_INFINITY)).toBe("0%");
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

describe("buildTileAriaLabel", () => {
	const upTrend: MetricTrend = {
		current: 14250,
		previous: 12723,
		change: 1527,
		percentChange: 12,
		trend: "up",
	};
	const downTrend: MetricTrend = {
		current: 87,
		previous: 90,
		change: -3,
		percentChange: -3,
		trend: "down",
	};
	const stableTrend: MetricTrend = {
		current: 100,
		previous: 100,
		change: 0,
		percentChange: 0,
		trend: "stable",
	};

	it("emits Revenue up 12% with trend label", () => {
		expect(
			buildTileAriaLabel({
				label: "Revenue",
				spokenValue: "$14,250 this month",
				trend: upTrend,
				trendLabel: "vs. last month",
			}),
		).toBe("Revenue: $14,250 this month. Up 12 percent vs. last month.");
	});

	it("emits Occupancy down 3% with spoken description", () => {
		expect(
			buildTileAriaLabel({
				label: "Occupancy",
				spokenValue: "87 percent",
				spokenDescription: "87 of 100 units occupied",
				trend: downTrend,
				trendLabel: "vs. last month",
			}),
		).toBe(
			"Occupancy: 87 percent. 87 of 100 units occupied. Down 3 percent vs. last month.",
		);
	});

	it("omits the trend segment entirely when trend is null (with description)", () => {
		expect(
			buildTileAriaLabel({
				label: "Active leases",
				spokenValue: "42",
				spokenDescription: "3 expiring soon",
				trend: null,
			}),
		).toBe("Active leases: 42. 3 expiring soon.");
	});

	it("renders a bare label-value sentence when trend is null and no description", () => {
		expect(
			buildTileAriaLabel({
				label: "Properties",
				spokenValue: "12",
				trend: null,
			}),
		).toBe("Properties: 12.");
	});

	it("renders stable trend as 'Unchanged vs. <window>' (no 'Stable', no '0 percent')", () => {
		const out = buildTileAriaLabel({
			label: "Active leases",
			spokenValue: "42",
			trend: stableTrend,
			trendLabel: "vs. last month",
		});
		expect(out).toContain("Unchanged vs. last month.");
		expect(out).not.toContain("Stable");
		expect(out).not.toContain("0 percent");
	});

	it("trims trailing space before the period when no trendLabel is provided", () => {
		const out = buildTileAriaLabel({
			label: "Revenue",
			spokenValue: "$14,250 this month",
			trend: upTrend,
		});
		// No trailing space before the final period; no double-space inside.
		expect(out).toBe("Revenue: $14,250 this month. Up 12 percent.");
		expect(out).not.toMatch(/ {2}/);
		expect(out).not.toMatch(/ \./);
	});

	// WR-2C-02 cycle-2 fix: stable trend with no trendLabel must emit
	// `"Unchanged."` not `"Unchanged vs. ."` (orphan period from the
	// caller-appended sentence terminator).
	it("emits 'Unchanged.' (no orphan 'vs. .') when stable trend has no trendLabel", () => {
		const out = buildTileAriaLabel({
			label: "Open maintenance",
			spokenValue: "8",
			trend: stableTrend,
		});
		expect(out).toBe("Open maintenance: 8. Unchanged.");
		expect(out).not.toContain("vs. .");
		expect(out).not.toMatch(/ {2}/);
	});

	// WR-3C-01 cycle-3 fix: leading whitespace in `trendLabel` defeated
	// the `^vs.` regex anchor. Without the .trim() the output became
	// "Unchanged vs.   vs. last week" (doubled "vs.").
	it("trims leading whitespace before stripping the 'vs.' prefix from trendLabel", () => {
		const out = buildTileAriaLabel({
			label: "Open maintenance",
			spokenValue: "8",
			trend: stableTrend,
			trendLabel: "  vs. last week",
		});
		expect(out).toBe("Open maintenance: 8. Unchanged vs. last week.");
		expect(out).not.toContain("vs.   vs.");
		expect(out).not.toMatch(/ {2}/);
	});
});
