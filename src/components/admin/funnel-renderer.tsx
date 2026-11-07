"use client";

import {
	Funnel,
	FunnelChart,
	LabelList,
	ResponsiveContainer,
	Tooltip,
	Trapezoid,
} from "recharts";

/**
 * Row shape consumed by the funnel chart. Kept local (not exported from
 * the funnel-chart.tsx wrapper) so the recharts import graph stays
 * isolated and the parent bundle can tree-shake it cleanly under
 * next/dynamic + ssr:false.
 */
export interface FunnelRendererDatum {
	name: string;
	value: number;
	isLowConversion: boolean;
}

/** A step's fill: destructive when its conversion is below the threshold. */
function stepFill(isLowConversion: boolean): string {
	return isLowConversion ? "var(--color-destructive)" : "var(--color-primary)";
}

/**
 * Stepped funnel visualization. A step's trapezoid flips to destructive when
 * its conversion from the prior step is below the threshold the parent set in
 * isLowConversion.
 *
 * The fill is set through the Funnel's `shape` prop, which renders recharts'
 * own default `Trapezoid` with every prop it would have had, the fill
 * replaced: recharts 3 deprecates `Cell` for exactly this (66.2-39).
 *
 * isAnimationActive={false} matches the project chart convention and
 * avoids the recharts re-render jank on incremental data updates.
 */
export function FunnelRenderer({ data }: { data: FunnelRendererDatum[] }) {
	const lowConversionByStep = new Map(
		data.map((entry) => [entry.name, entry.isLowConversion]),
	);
	return (
		<ResponsiveContainer width="100%" height={320}>
			<FunnelChart>
				<Tooltip />
				<Funnel
					dataKey="value"
					data={data}
					isAnimationActive={false}
					shape={(props) => (
						<Trapezoid
							{...props}
							fill={stepFill(lowConversionByStep.get(props.name) ?? false)}
						/>
					)}
				>
					<LabelList
						position="right"
						dataKey="name"
						fill="var(--color-foreground)"
					/>
				</Funnel>
			</FunnelChart>
		</ResponsiveContainer>
	);
}
