'use client'

import {
	Area,
	AreaChart,
	CartesianGrid,
	Legend,
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

interface TimeSeriesDataPoint {
	date: string
	value: number
}

interface CombinedMetricsAreaChartProps {
	occupancyData?: TimeSeriesDataPoint[] | undefined
	revenueData?: TimeSeriesDataPoint[] | undefined
	height?: number
	className?: string
}

interface CombinedChartData {
	date: string
	occupancy: number | null
	revenue: number | null
}

interface CustomTooltipProps {
	active?: boolean
	payload?: Array<{
		dataKey: string
		value: number
		name: string
		color: string
	}>
	label?: string
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
	if (active && payload && payload.length) {
		const occupancyValue = payload.find(p => p.dataKey === 'occupancy')
		const revenueValue = payload.find(p => p.dataKey === 'revenue')

		return (
			<div style={TENANTFLOW_CHART_CONFIG.tooltip} className="text-sm">
				<p className="font-medium mb-2">{label}</p>
				<div className="space-y-1">
					{occupancyValue && occupancyValue.value !== null && (
						<div className="flex items-center gap-2">
							<div
								className="size-3 rounded-full"
								style={{ backgroundColor: TENANTFLOW_CHART_COLORS.occupancy }}
							/>
							<span className="text-muted-foreground">Occupancy:</span>
							<span className="font-medium">
								{occupancyValue.value.toFixed(1)}%
							</span>
						</div>
					)}
					{revenueValue && revenueValue.value !== null && (
						<div className="flex items-center gap-2">
							<div
								className="size-3 rounded-full"
								style={{ backgroundColor: TENANTFLOW_CHART_COLORS.revenue }}
							/>
							<span className="text-muted-foreground">Revenue:</span>
							<span className="font-medium">
								$
								{(revenueValue.value / 100).toLocaleString('en-US', {
									minimumFractionDigits: 2,
									maximumFractionDigits: 2
								})}
							</span>
						</div>
					)}
				</div>
			</div>
		)
	}
	return null
}

export function CombinedMetricsAreaChart({
	occupancyData,
	revenueData,
	height = 400,
	className
}: CombinedMetricsAreaChartProps) {
	// No data - component should not render
	if (
		(!occupancyData || occupancyData.length === 0) &&
		(!revenueData || revenueData.length === 0)
	) {
		return null
	}

	// Combine data from both sources
	const dateMap = new Map<string, CombinedChartData>()

	// Add occupancy data
	occupancyData?.forEach(item => {
		dateMap.set(item.date, {
			date: item.date,
			occupancy: item.value,
			revenue: null
		})
	})

	// Add revenue data
	revenueData?.forEach(item => {
		const existing = dateMap.get(item.date)
		if (existing) {
			existing.revenue = item.value
		} else {
			dateMap.set(item.date, {
				date: item.date,
				occupancy: null,
				revenue: item.value
			})
		}
	})

	// Convert to array and sort by date
	const chartData = Array.from(dateMap.values()).sort(
		(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
	)

	// Format dates for display
	const formattedData = chartData.map(item => ({
		...item,
		displayDate: new Date(item.date).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric'
		})
	}))

	const hasOccupancyData = occupancyData && occupancyData.length > 0
	const hasRevenueData = revenueData && revenueData.length > 0

	return (
		<ChartContainer
			title="Performance Trends"
			description="30-day occupancy and revenue tracking"
			height={height}
			{...(className ? { className } : {})}
		>
			<ResponsiveContainer width="100%" height="100%">
				<AreaChart
					data={formattedData}
					margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
				>
					<CartesianGrid
						strokeDasharray={TENANTFLOW_CHART_CONFIG.grid.strokeDasharray}
						stroke={TENANTFLOW_CHART_CONFIG.grid.stroke}
						strokeOpacity={TENANTFLOW_CHART_CONFIG.grid.strokeOpacity}
					/>

					<XAxis
						dataKey="displayDate"
						fontSize={TENANTFLOW_CHART_CONFIG.axis.fontSize}
						color={TENANTFLOW_CHART_CONFIG.axis.color}
						tickLine={false}
						axisLine={false}
					/>

					{/* Left Y-axis for Occupancy Rate */}
					{hasOccupancyData && (
						<YAxis
							yAxisId="occupancy"
							fontSize={TENANTFLOW_CHART_CONFIG.axis.fontSize}
							color={TENANTFLOW_CHART_CONFIG.axis.color}
							tickLine={false}
							axisLine={false}
							tickFormatter={(value: number) => `${value}%`}
							label={{
								value: 'Occupancy %',
								angle: -90,
								position: 'insideLeft',
								style: {
									fontSize: TENANTFLOW_CHART_CONFIG.axis.fontSize,
									fill: TENANTFLOW_CHART_COLORS.occupancy
								}
							}}
						/>
					)}

					{/* Right Y-axis for Revenue */}
					{hasRevenueData && (
						<YAxis
							yAxisId="revenue"
							orientation="right"
							fontSize={TENANTFLOW_CHART_CONFIG.axis.fontSize}
							color={TENANTFLOW_CHART_CONFIG.axis.color}
							tickLine={false}
							axisLine={false}
							tickFormatter={(value: number) =>
								`$${(value / 100).toLocaleString('en-US', {
									notation: 'compact',
									compactDisplay: 'short'
								})}`
							}
							label={{
								value: 'Revenue',
								angle: 90,
								position: 'insideRight',
								style: {
									fontSize: TENANTFLOW_CHART_CONFIG.axis.fontSize,
									fill: TENANTFLOW_CHART_COLORS.revenue
								}
							}}
						/>
					)}

					<Tooltip content={<CustomTooltip />} />

					<Legend
						fontSize={TENANTFLOW_CHART_CONFIG.legend.fontSize}
						iconType="line"
						wrapperStyle={{
							paddingTop: '10px',
							fontSize: TENANTFLOW_CHART_CONFIG.legend.fontSize
						}}
					/>

					{/* Occupancy Rate Area */}
					{hasOccupancyData && (
						<Area
							yAxisId="occupancy"
							type="monotone"
							dataKey="occupancy"
							name="Occupancy Rate"
							stroke={TENANTFLOW_CHART_COLORS.occupancy}
							fill={TENANTFLOW_CHART_COLORS.occupancy}
							fillOpacity={0.12}
							strokeWidth={2}
							dot={false}
							activeDot={{ r: 5 }}
							connectNulls
						/>
					)}

					{/* Revenue Area */}
					{hasRevenueData && (
						<Area
							yAxisId="revenue"
							type="monotone"
							dataKey="revenue"
							name="Monthly Revenue"
							stroke={TENANTFLOW_CHART_COLORS.revenue}
							fill={TENANTFLOW_CHART_COLORS.revenue}
							fillOpacity={0.12}
							strokeWidth={2}
							dot={false}
							activeDot={{ r: 5 }}
							connectNulls
						/>
					)}
				</AreaChart>
			</ResponsiveContainer>
		</ChartContainer>
	)
}
