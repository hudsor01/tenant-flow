"use client";

/**
 * Axis-less Recharts area sparkline for the Phase 3 KPI bento row tiles
 * (Revenue, Occupancy). 03-UI-SPEC § 6.1 — § 6.5 + CONTEXT.md D-11.
 *
 * Color resolves through `ChartContainer`'s scoped `--color-spark` CSS
 * variable (set via the {@link sparklineConfigForTrend} theme map), so the
 * stroke + fill always reference the token, never a hex / `oklch()` literal
 * in JSX. The sparkline does NOT animate (animation disabled on the Area),
 * does NOT render data points, and does NOT mount a tooltip — it's a
 * decorative-trend visual; the primary value lives in `<StatValue>` above.
 */

import { Area, AreaChart } from "recharts";

import { ChartContainer } from "#components/ui/chart";
import type { TimeSeriesDataPoint } from "#types/analytics";

import { sparklineConfigForTrend } from "./kpi-helpers";

export interface KpiSparklineProps {
	data: TimeSeriesDataPoint[];
	trend: "up" | "down" | "stable";
	ariaLabel: string;
}

export function KpiSparkline({ data, trend, ariaLabel }: KpiSparklineProps) {
	const config = sparklineConfigForTrend(trend);
	const gradientId = `spark-fill-${trend}`;
	return (
		<div
			role="img"
			aria-label={ariaLabel}
			className="[grid-column:1/-1] h-16 w-full"
		>
			<ChartContainer config={config} className="!aspect-auto h-full w-full">
				<AreaChart
					data={data}
					margin={{ top: 2, right: 0, bottom: 2, left: 0 }}
				>
					<defs>
						<linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
							<stop
								offset="0%"
								stopColor="var(--color-spark)"
								stopOpacity={0.4}
							/>
							<stop
								offset="100%"
								stopColor="var(--color-spark)"
								stopOpacity={0}
							/>
						</linearGradient>
					</defs>
					<Area
						type="monotone"
						dataKey="value"
						stroke="var(--color-spark)"
						strokeWidth={1.5}
						fill={`url(#${gradientId})`}
						isAnimationActive={false}
						dot={false}
						activeDot={false}
					/>
				</AreaChart>
			</ChartContainer>
		</div>
	);
}
