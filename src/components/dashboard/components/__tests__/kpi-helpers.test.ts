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
	describeTrend,
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
	it("maps `up` → `--color-success-text` in both light + dark theme entries", () => {
		const config = sparklineConfigForTrend("up");
		const spark = config.spark;
		// Narrow `spark` past `noUncheckedIndexedAccess` (always present — the
		// helper always populates this key) and into the `theme` variant of the
		// ChartConfig union (the helper always emits the theme branch).
		if (!spark || !("theme" in spark) || !spark.theme) {
			throw new Error("sparklineConfigForTrend must populate `spark.theme`");
		}
		expect(spark.theme.light).toBe("var(--color-success-text)");
		expect(spark.theme.dark).toBe("var(--color-success-text)");
	});

	it("maps `down` → `--color-warning-text` in both light + dark theme entries", () => {
		const config = sparklineConfigForTrend("down");
		const spark = config.spark;
		if (!spark || !("theme" in spark) || !spark.theme) {
			throw new Error("sparklineConfigForTrend must populate `spark.theme`");
		}
		expect(spark.theme.light).toBe("var(--color-warning-text)");
		expect(spark.theme.dark).toBe("var(--color-warning-text)");
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
	const WINDOW = { start_date: "2026-10-03", end_date: "2026-11-02" };
	const upTrend: MetricTrend = {
		current: 14250,
		previous: 12723,
		change: 1527,
		percentChange: 12,
		trend: "up",
		window: WINDOW,
	};
	const downTrend: MetricTrend = {
		current: 87,
		previous: 90,
		change: -3,
		percentChange: -3.33,
		trend: "down",
		window: WINDOW,
	};
	const stableTrend: MetricTrend = {
		current: 100,
		previous: 100,
		change: 0,
		percentChange: 0,
		trend: "stable",
		window: WINDOW,
	};

	it("states the window the trend computes, never 'last month'", () => {
		const out = buildTileAriaLabel({
			label: "Revenue",
			spokenValue: "$14,250 this month",
			trend: upTrend,
		});
		expect(out).toBe(
			"Revenue: $14,250 this month. Up 12 percent vs. 30 days ago.",
		);
		expect(out).not.toContain("last month");
	});

	it("narrates occupancy in percentage points, as the chip shows it", () => {
		expect(
			buildTileAriaLabel({
				label: "Occupancy",
				spokenValue: "87 percent",
				spokenDescription: "87 of 100 units occupied",
				trend: downTrend,
				trendUnit: "points",
			}),
		).toBe(
			"Occupancy: 87 percent. 87 of 100 units occupied. Down 3 points vs. 30 days ago.",
		);
	});

	it("says there was no prior figure, never 0 percent", () => {
		const out = buildTileAriaLabel({
			label: "Revenue",
			spokenValue: "$700",
			trend: { ...upTrend, previous: 0, percentChange: null },
			noPriorText: "No rent scheduled",
		});
		expect(out).toBe("Revenue: $700. No rent scheduled 30 days ago.");
		expect(out).not.toContain("percent");
	});

	it("says the change is unavailable when the server states no window", () => {
		expect(
			buildTileAriaLabel({
				label: "Open maintenance",
				spokenValue: "8",
				trend: { ...upTrend, window: null },
			}),
		).toBe("Open maintenance: 8. Change unavailable.");
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

	it("renders a stable trend as 'Unchanged vs. 30 days ago' (no 'Stable', no '0 percent')", () => {
		const out = buildTileAriaLabel({
			label: "Open maintenance",
			spokenValue: "8",
			trend: stableTrend,
		});
		expect(out).toBe("Open maintenance: 8. Unchanged vs. 30 days ago.");
		expect(out).not.toContain("Stable");
		expect(out).not.toContain("0 percent");
	});

	it("reads a NaN percent as no figure, never 0 percent", () => {
		expect(
			buildTileAriaLabel({
				label: "Revenue",
				spokenValue: "$1",
				trend: { ...upTrend, percentChange: Number.NaN },
			}),
		).toBe("Revenue: $1. No prior figure 30 days ago.");
	});
});

describe("describeTrend", () => {
	const WINDOW = { start_date: "2026-10-03", end_date: "2026-11-02" };
	const trend: MetricTrend = {
		current: 75,
		previous: 100,
		change: -25,
		percentChange: -25,
		trend: "down",
		window: WINDOW,
	};

	it("prints occupancy in points with the overview tile's formatter", () => {
		expect(describeTrend(trend, "points", "")).toEqual({
			kind: "change",
			figure: "\u221225.0 pts",
			spokenFigure: "25 points",
			windowLabel: "vs. 30 days ago",
		});
	});

	it("prints a percent change with its window", () => {
		expect(
			describeTrend({ ...trend, percentChange: -10.18 }, "percent", ""),
		).toEqual({
			kind: "change",
			figure: "\u221210%",
			spokenFigure: "10 percent",
			windowLabel: "vs. 30 days ago",
		});
	});

	it("counts the window's days from the trend's own window", () => {
		const week = { start_date: "2026-10-26", end_date: "2026-11-02" };
		const chip = describeTrend({ ...trend, window: week }, "percent", "");
		expect(chip).toMatchObject({ windowLabel: "vs. 7 days ago" });
	});
});
