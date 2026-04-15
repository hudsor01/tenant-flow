'use client'

import {
	Cell,
	Funnel,
	FunnelChart,
	LabelList,
	ResponsiveContainer,
	Tooltip
} from 'recharts'

/**
 * Row shape consumed by the funnel chart. Kept local (not exported from
 * the funnel-chart.tsx wrapper) so the recharts import graph stays
 * isolated and the parent bundle can tree-shake it cleanly under
 * next/dynamic + ssr:false.
 */
export interface FunnelRendererDatum {
	name: string
	value: number
	isLowConversion: boolean
}

/**
 * Stepped funnel visualization. Cells flip to destructive when the
 * corresponding step's conversion from the prior step is below the
 * threshold the parent set in isLowConversion.
 *
 * isAnimationActive={false} matches the project chart convention and
 * avoids the recharts re-render jank on incremental data updates.
 */
export function FunnelRenderer({ data }: { data: FunnelRendererDatum[] }) {
	return (
		<ResponsiveContainer width="100%" height={320}>
			<FunnelChart>
				<Tooltip />
				<Funnel
					dataKey="value"
					data={data}
					isAnimationActive={false}
				>
					<LabelList
						position="right"
						dataKey="name"
						fill="var(--color-foreground)"
					/>
					{data.map(entry => (
						<Cell
							key={entry.name}
							fill={
								entry.isLowConversion
									? 'var(--color-destructive)'
									: 'var(--color-primary)'
							}
						/>
					))}
				</Funnel>
			</FunnelChart>
		</ResponsiveContainer>
	)
}
