'use client'

import type { OccupancyTrendResponse } from '@repo/shared/types/database-rpc'
import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis
} from 'recharts'
import {
	ChartContainer,
	TENANTFLOW_CHART_COLORS,
	TENANTFLOW_CHART_CONFIG
} from './chart-container'

interface OccupancyTrendsAreaChartProps {
	data?: OccupancyTrendResponse[]
	height?: number
	className?: string
}

interface CustomTooltipProps {
	active?: boolean
	payload?: Array<{ payload: OccupancyTrendResponse; value: number }>
	label?: string
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
	if (active && payload && payload.length && payload[0]) {
		const data = payload[0].payload
		const vacantUnits = data.total_units - data.occupied_units
		return (
			<div style={TENANTFLOW_CHART_CONFIG.tooltip} className="text-sm">
				<p className="font-medium mb-2">{label}</p>
				<div className="space-y-1">
					<div className="flex items-center gap-2">
						<div
							className="size-3 rounded-full"
							style={{ backgroundColor: TENANTFLOW_CHART_COLORS.occupancy }}
						/>
						<span className="text-muted-foreground">Occupied:</span>
						<span className="font-medium">{data.occupied_units} units</span>
					</div>
					<div className="flex items-center gap-2">
						<div
							className="size-3 rounded-full"
							style={{
								backgroundColor: TENANTFLOW_CHART_COLORS.muted,
								opacity: 0.5
							}}
						/>
						<span className="text-muted-foreground">Vacant:</span>
						<span className="font-medium">{vacantUnits} units</span>
					</div>
					<div className="text-xs text-muted-foreground mt-2 pt-2 border-t">
						<div>
							Occupancy Rate:{' '}
							{data.occupancy_rate ? `${data.occupancy_rate.toFixed(1)}%` : '0%'}
						</div>
						<div>Total Units: {data.total_units}</div>
					</div>
				</div>
			</div>
		)
	}
	return null
}

export function OccupancyTrendsAreaChart({
	data,
	height = 400,
	className
}: OccupancyTrendsAreaChartProps) {
	// No data - component should not render
	if (!data || data.length === 0) {
		return null
	}

	// Transform data for stacked area chart
	const chartData = data.map(item => ({
		month: item.month,
		occupied: item.occupied_units,
		vacant: item.total_units - item.occupied_units,
		total: item.total_units,
		rate: item.occupancy_rate,
		occupied_units: item.occupied_units, // For tooltip
		total_units: item.total_units, // For tooltip
		occupancy_rate: item.occupancy_rate // For tooltip
	}))

	return (
		<ChartContainer
			title="Occupancy Trends"
			description="Monthly occupancy rate tracking"
			height={height}
			{...(className ? { className } : {})}
		>
			<ResponsiveContainer width="100%" height="100%">
				<AreaChart
					data={chartData}
					margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
				>
					{/* Gradient definitions for YOUR color system */}
					<defs>
						<linearGradient id="occupiedGradient" x1="0" y1="0" x2="0" y2="1">
							<stop
								offset="5%"
								stopColor={TENANTFLOW_CHART_COLORS.occupancy}
								stopOpacity={0.8}
							/>
							<stop
								offset="95%"
								stopColor={TENANTFLOW_CHART_COLORS.occupancy}
								stopOpacity={0.1}
							/>
						</linearGradient>
						<linearGradient id="vacantGradient" x1="0" y1="0" x2="0" y2="1">
							<stop
								offset="5%"
								stopColor={TENANTFLOW_CHART_COLORS.muted}
								stopOpacity={0.6}
							/>
							<stop
								offset="95%"
								stopColor={TENANTFLOW_CHART_COLORS.muted}
								stopOpacity={0.05}
							/>
						</linearGradient>
					</defs>

					<CartesianGrid
						strokeDasharray={TENANTFLOW_CHART_CONFIG.grid.strokeDasharray}
						stroke={TENANTFLOW_CHART_CONFIG.grid.stroke}
						strokeOpacity={TENANTFLOW_CHART_CONFIG.grid.strokeOpacity}
					/>

					<XAxis
						dataKey="month"
						fontSize={TENANTFLOW_CHART_CONFIG.axis.fontSize}
						color={TENANTFLOW_CHART_CONFIG.axis.color}
						tickLine={false}
						axisLine={false}
					/>

					<YAxis
						fontSize={TENANTFLOW_CHART_CONFIG.axis.fontSize}
						color={TENANTFLOW_CHART_CONFIG.axis.color}
						tickLine={false}
						axisLine={false}
						tickFormatter={(value: number) => `${value}`}
						label={{
							value: 'Units',
							angle: -90,
							position: 'insideLeft',
							style: {
								fontSize: TENANTFLOW_CHART_CONFIG.axis.fontSize,
								fill: TENANTFLOW_CHART_CONFIG.axis.color
							}
						}}
					/>

					<Tooltip content={<CustomTooltip />} />

					{/* Stacked areas - vacant first (bottom), occupied on top */}
					<Area
						type="monotone"
						dataKey="vacant"
						stackId="1"
						stroke={TENANTFLOW_CHART_COLORS.muted}
						fill="url(#vacantGradient)"
						strokeWidth={2}
						name="Vacant Units"
					/>
					<Area
						type="monotone"
						dataKey="occupied"
						stackId="1"
						stroke={TENANTFLOW_CHART_COLORS.occupancy}
						fill="url(#occupiedGradient)"
						strokeWidth={2}
						name="Occupied Units"
					/>
				</AreaChart>
			</ResponsiveContainer>
		</ChartContainer>
	)
}
