"use client";

/**
 * Phase 4 RevenueAreaChart (CHART-01) — Recharts area with a 30d/6mo segmented
 * window toggle and a shape-matching loading skeleton (CHART-05 / CHART-06).
 *
 * Two data series cross this boundary side-by-side:
 *   - `monthlyRevenue`     — 30d daily series, `{ date, value }` shape.
 *   - `monthlyRevenue6mo`  — 6mo monthly series, `{ month, value }` shape.
 *
 * The active window switches the `<AreaChart data>` to the raw series for
 * that window (pass-through — no shape normalization) and the `<XAxis
 * dataKey>` between `"date"` and `"month"`. Recharts only reads the
 * configured `dataKey` per element, so the heterogeneous array shapes
 * (joined by a typed boundary helper, {@link pickActiveSeries}) flow
 * through fine at runtime.
 *
 * The local `useState<'30d' | '6mo'>` is intentional (04-CONTEXT.md D-04 —
 * not nuqs; the toggle is volatile UI state, not a shareable URL surface).
 * Per-chart `revenueConfig` is inline per 04-UI-SPEC § 16 — the shared
 * `chartConfig` from `dashboard-types.ts` is NOT imported (legacy bag).
 *
 * Color flows through `var(--color-chart-1)` (token defined in `globals.css`
 * for both light and dark themes — 04-CONTEXT.md D-09). Entrance animation
 * gates on `useReducedMotion()` (Phase 3 canonical hook). The Y-axis tick
 * formatter divides by 1000 — that's the parent-spec § 8.2 declared
 * non-currency-arithmetic exemption; do NOT route it through `formatCurrency`.
 */

import { useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#components/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "#components/ui/chart";
import { Skeleton } from "#components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "#components/ui/tabs";
import { useReducedMotion } from "#hooks/use-reduced-motion";
import { formatCurrency } from "#lib/utils/currency";
import type {
	MonthlyRevenuePoint,
	TimeSeriesDataPoint,
} from "#types/analytics";

type RevenueWindow = "30d" | "6mo";

interface RevenueAreaChartProps {
	monthlyRevenue: TimeSeriesDataPoint[];
	monthlyRevenue6mo: MonthlyRevenuePoint[];
}

// Union of the two raw series elements. Recharts AreaChart's data prop is
// `ReadonlyArray<DataPointType>` (see node_modules/recharts/types/state/
// chartDataSlice.d.ts) — typing the active series at this union widens
// `DataPointType` so the single `<AreaChart>` consumes either series shape
// without a structural cast at the JSX boundary.
type RevenuePoint = TimeSeriesDataPoint | MonthlyRevenuePoint;

// Per-chart inline config (04-UI-SPEC § 16). `ChartContainer` resolves
// `--color-revenue` from the `revenue` key, but the JSX below references
// `var(--color-chart-1)` directly so the design-token-drift scanner reads
// the explicit token.
const revenueConfig = {
	revenue: { label: "Revenue", color: "var(--color-chart-1)" },
} as const satisfies ChartConfig;

// Typed boundary helper — picks the active series at the union type so the
// single `<AreaChart>` below is contextually typed against `RevenuePoint`
// (rather than the narrower `TimeSeriesDataPoint[] | MonthlyRevenuePoint[]`
// which TS can't unify into one `ReadonlyArray<T>`).
function pickActiveSeries(
	window: RevenueWindow,
	monthly: TimeSeriesDataPoint[],
	monthly6mo: MonthlyRevenuePoint[],
): RevenuePoint[] {
	return window === "30d" ? [...monthly] : [...monthly6mo];
}

function format30dTick(iso: string): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return iso;
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
	});
}

function format6moTick(yyyymm: string): string {
	const [yearStr, monthStr] = yyyymm.split("-");
	const year = Number(yearStr);
	const month = Number(monthStr);
	if (Number.isNaN(year) || Number.isNaN(month)) return yyyymm;
	return new Date(year, month - 1).toLocaleDateString("en-US", {
		month: "short",
	});
}

function formatYAxisThousands(value: number): string {
	return `$${(value / 1000).toFixed(0)}k`;
}

// Recharts widens the `tickFormatter` parameter to `unknown` through its
// generic axis types — coerce at the boundary so the per-window pure helpers
// stay strictly typed.
function toAxisTickFormatter(
	formatter: (raw: string) => string,
): (value: unknown) => string {
	return (value) => formatter(String(value));
}

// `ChartTooltipContent.labelFormatter` is typed as
// `(label: ReactNode, payload) => ReactNode` — adapt the per-window pure
// helper to that broader signature.
function toTooltipLabelFormatter(
	formatter: (raw: string) => string,
): (label: unknown) => string {
	return (label) =>
		formatter(typeof label === "string" ? label : String(label));
}

function formatTooltipValue(value: unknown): [string, string] {
	return [
		formatCurrency(Number(value), {
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		}),
		"Revenue",
	];
}

export function RevenueAreaChart({
	monthlyRevenue,
	monthlyRevenue6mo,
}: RevenueAreaChartProps) {
	const [activeWindow, setActiveWindow] = useState<RevenueWindow>("30d");
	const reducedMotion = useReducedMotion();

	const is30d = activeWindow === "30d";
	const description = is30d ? "Last 30 days" : "Last 6 months";
	const dataKey: "date" | "month" = is30d ? "date" : "month";
	const tickFormatter = is30d ? format30dTick : format6moTick;
	const data = pickActiveSeries(
		activeWindow,
		monthlyRevenue,
		monthlyRevenue6mo,
	);
	const isEmpty = data.length === 0;

	return (
		<Card className="lg:col-span-2" data-tour="charts-section">
			<CardHeader className="flex flex-row items-center justify-between space-y-0">
				<div>
					<CardTitle>Revenue</CardTitle>
					<CardDescription>{description}</CardDescription>
				</div>
				<Tabs
					value={activeWindow}
					onValueChange={(v) => setActiveWindow(v as RevenueWindow)}
				>
					<TabsList>
						<TabsTrigger value="30d">30d</TabsTrigger>
						<TabsTrigger value="6mo">6mo</TabsTrigger>
					</TabsList>
				</Tabs>
			</CardHeader>
			<CardContent>
				{isEmpty ? (
					<div className="flex h-[300px] flex-col items-center justify-center gap-2 text-center">
						<p className="text-base font-semibold text-foreground">
							No revenue data yet
						</p>
						<p className="text-sm text-muted-foreground">
							Add a lease to start tracking revenue
						</p>
					</div>
				) : (
					<ChartContainer config={revenueConfig} className="h-[300px] w-full">
						<AreaChart
							data={data}
							margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
						>
							<defs>
								<linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
									<stop
										offset="5%"
										stopColor="var(--color-chart-1)"
										stopOpacity={0.8}
									/>
									<stop
										offset="95%"
										stopColor="var(--color-chart-1)"
										stopOpacity={0.1}
									/>
								</linearGradient>
							</defs>
							<CartesianGrid vertical={false} strokeDasharray="3 3" />
							<XAxis
								dataKey={dataKey}
								tickLine={false}
								axisLine={false}
								tickMargin={8}
								tickFormatter={toAxisTickFormatter(tickFormatter)}
							/>
							<YAxis
								tickLine={false}
								axisLine={false}
								tickMargin={8}
								tickFormatter={formatYAxisThousands}
							/>
							<ChartTooltip
								cursor={false}
								content={
									<ChartTooltipContent
										labelFormatter={toTooltipLabelFormatter(tickFormatter)}
										formatter={formatTooltipValue}
									/>
								}
							/>
							<Area
								dataKey="value"
								type="monotone"
								fill="url(#fillRevenue)"
								stroke="var(--color-chart-1)"
								strokeWidth={2}
								dot={false}
								isAnimationActive={!reducedMotion}
								animationDuration={800}
								animationEasing="ease-out"
							/>
						</AreaChart>
					</ChartContainer>
				)}
			</CardContent>
		</Card>
	);
}

export function RevenueAreaChartSkeleton() {
	return (
		<Card className="lg:col-span-2">
			<CardHeader className="flex flex-row items-center justify-between space-y-0">
				<div className="space-y-2">
					<Skeleton className="h-5 w-20" />
					<Skeleton className="h-4 w-32" />
				</div>
				<div
					className="inline-flex h-9 items-center rounded-md bg-muted p-1 opacity-60"
					aria-hidden="true"
				>
					<div className="h-7 w-12 rounded-sm bg-background shadow-sm" />
					<div className="h-7 w-12" />
				</div>
			</CardHeader>
			<CardContent>
				<Skeleton className="h-[300px] w-full rounded-md" />
			</CardContent>
		</Card>
	);
}
