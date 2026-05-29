"use client";

/**
 * Phase 4 OccupancyDonutChart (CHART-02) — Recharts donut with center label
 * over `Occupied` and a real `<ul><li>` legend below (colorblind-friendly per
 * 04-CONTEXT.md D-03). The shape-matching loading skeleton lives in
 * `./occupancy-donut-chart-skeleton.tsx` (extracted per 04-UI-SPEC § 7.5 so
 * the dashboard chunk doesn't pull Recharts when only rendering placeholders).
 *
 * The donut surfaces a single primary signal (occupancy percent) so it
 * intentionally omits `<ChartTooltip>` (04-UI-SPEC § 3.6) — the center label
 * + legend already enumerate every wedge value.
 *
 * `units.total === 0` triggers the empty branch (04-CONTEXT.md D-03 + D-08 —
 * no fabricated `0%` donut for zero-unit owners; same honesty rule as
 * Phase 1 D-09 / POLISH-11). Wedge colors source from `var(--color-chart-2)`
 * (occupied) and `var(--color-chart-5)` (vacant) — 04-CONTEXT.md D-09.
 * Entrance animation gates on `useReducedMotion()` (Phase 3 canonical hook).
 *
 * Per-chart inline `donutConfig` per 04-UI-SPEC § 16 — the shared
 * `chartConfig` from `dashboard-types.ts` is NOT imported (legacy bag, dropped
 * in this PR).
 */

import { Label, Pie, PieChart } from "recharts";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#components/ui/card";
import { type ChartConfig, ChartContainer } from "#components/ui/chart";
import { useReducedMotion } from "#hooks/use-reduced-motion";

interface OccupancyDonutChartProps {
	units: { occupied: number; vacant: number; total: number };
}

// Per-chart inline config (04-UI-SPEC § 16). `ChartContainer` resolves the
// CSS variables via the `theme` map, but the JSX below references
// `var(--color-chart-2)` / `var(--color-chart-5)` directly so the
// design-token-drift scanner reads explicit token references.
const donutConfig = {
	occupied: { label: "Occupied", color: "var(--color-chart-2)" },
	vacant: { label: "Vacant", color: "var(--color-chart-5)" },
} as const satisfies ChartConfig;

export function OccupancyDonutChart({ units }: OccupancyDonutChartProps) {
	const reducedMotion = useReducedMotion();
	const isEmpty = units.total === 0;

	if (isEmpty) {
		return (
			<Card className="lg:col-span-1">
				<CardHeader>
					<CardTitle>Occupancy</CardTitle>
					<CardDescription>Across all units</CardDescription>
				</CardHeader>
				<CardContent className="flex h-[240px] flex-col items-center justify-center gap-2 text-center">
					<p className="text-base font-semibold text-foreground">
						No units yet
					</p>
					<p className="text-sm text-muted-foreground">
						Add a property to see occupancy
					</p>
				</CardContent>
			</Card>
		);
	}

	const occupancyPercent = Math.round((units.occupied / units.total) * 100);
	const ariaLabel = `Occupancy donut: ${occupancyPercent} percent occupied (${units.occupied} of ${units.total} units)`;
	const pieData = [
		{
			name: "Occupied",
			value: units.occupied,
			fill: "var(--color-chart-2)",
		},
		{
			name: "Vacant",
			value: units.vacant,
			fill: "var(--color-chart-5)",
		},
	];

	return (
		<Card className="lg:col-span-1">
			<CardHeader>
				<CardTitle>Occupancy</CardTitle>
				<CardDescription>Across all units</CardDescription>
			</CardHeader>
			<CardContent>
				<div role="img" aria-label={ariaLabel} className="h-[180px] w-full">
					<ChartContainer
						config={donutConfig}
						className="!aspect-auto h-full w-full"
					>
						<PieChart>
							<Pie
								data={pieData}
								dataKey="value"
								nameKey="name"
								innerRadius={50}
								outerRadius={80}
								strokeWidth={0}
								isAnimationActive={!reducedMotion}
								animationDuration={800}
								animationEasing="ease-out"
							>
								<Label
									content={({ viewBox }) => {
										if (viewBox && "cx" in viewBox && "cy" in viewBox) {
											return (
												<text
													x={viewBox.cx}
													y={viewBox.cy}
													textAnchor="middle"
													dominantBaseline="middle"
												>
													<tspan
														x={viewBox.cx}
														dy="-0.4em"
														className="fill-foreground text-stat font-bold tabular-nums"
													>
														{occupancyPercent}%
													</tspan>
													<tspan
														x={viewBox.cx}
														dy="1.6em"
														className="fill-muted-foreground text-sm"
													>
														Occupied
													</tspan>
												</text>
											);
										}
										return null;
									}}
								/>
							</Pie>
						</PieChart>
					</ChartContainer>
				</div>
				<ul className="mt-4 flex items-center justify-center gap-6 text-sm">
					<li className="flex items-center gap-2">
						<span
							aria-hidden="true"
							className="inline-block size-2.5 rounded-full bg-[var(--color-chart-2)]"
						/>
						<span className="text-muted-foreground">Occupied</span>
						<span className="font-semibold tabular-nums text-foreground">
							{units.occupied}
						</span>
					</li>
					<li className="flex items-center gap-2">
						<span
							aria-hidden="true"
							className="inline-block size-2.5 rounded-full bg-[var(--color-chart-5)]"
						/>
						<span className="text-muted-foreground">Vacant</span>
						<span className="font-semibold tabular-nums text-foreground">
							{units.vacant}
						</span>
					</li>
				</ul>
			</CardContent>
		</Card>
	);
}
