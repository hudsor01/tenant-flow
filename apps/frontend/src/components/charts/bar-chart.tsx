'use client'

import type { PropertyPerformanceData } from '@repo/shared/types/analytics'
import {
	Bar,
	BarChart,
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

interface PropertyPerformanceBarChartProps {
	data?: PropertyPerformanceData[]
	height?: number
	className?: string
	metric?: 'occupancy' | 'revenue' | 'maintenance'
}

export function PropertyPerformanceBarChart({
	data,
	height = 300,
	className,
	metric = 'occupancy'
}: PropertyPerformanceBarChartProps) {
	// No data - component should not render
	if (!data || data.length === 0) {
		return null
	}

	const chartData = data

	const getMetricConfig = () => {
		switch (metric) {
			case 'revenue':
				return {
					title: 'Property Revenue Performance',
					description: 'Monthly revenue by property location',
					dataKey: 'revenue',
					color: TENANTFLOW_CHART_COLORS.revenue,
					formatter: (value: number) => `$${(value / 1000).toFixed(0)}k`,
					name: 'Revenue'
				}
			case 'maintenance':
				return {
					title: 'Property Maintenance Requests',
					description: 'Active maintenance requests per property',
					dataKey: 'maintenance',
					color: TENANTFLOW_CHART_COLORS.maintenance,
					formatter: (value: number) => `${value} requests`,
					name: 'Maintenance'
				}
			default:
				return {
					title: 'Property Occupancy Rates',
					description: 'Current occupancy percentage by property',
					dataKey: 'occupancy',
					color: TENANTFLOW_CHART_COLORS.occupancy,
					formatter: (value: number) => `${value}%`,
					name: 'Occupancy'
				}
		}
	}

	const config = getMetricConfig()

	const CustomTooltip = ({
		active,
		payload,
		label
	}: {
		active?: boolean
		payload?: Array<{ payload: PropertyPerformanceData; value: number }>
		label?: string
	}) => {
		if (active && payload && payload.length && payload[0]) {
			const data = payload[0].payload
			return (
				<div style={TENANTFLOW_CHART_CONFIG.tooltip} className="text-sm">
					<p className="font-medium mb-2">{label}</p>
					<div className="space-y-1">
						<div className="flex items-center gap-2">
							<div
								className="w-3 h-3 rounded-full"
								style={{ backgroundColor: config.color }}
							/>
							<span className="text-muted-foreground">{config.name}:</span>
							<span className="font-medium">
								{config.formatter(payload[0].value)}
							</span>
						</div>
						<div className="text-xs text-muted-foreground mt-2 pt-2 border-t">
							<div>Units: {data.units}</div>
							<div>Revenue: ${(data.revenue / 1000).toFixed(0)}k</div>
							<div>Maintenance: {data.maintenance} requests</div>
						</div>
					</div>
				</div>
			)
		}
		return null
	}

	return (
		<ChartContainer
			title={config.title}
			description={config.description}
			height={height}
			{...(className ? { className } : {})}
		>
			<ResponsiveContainer width="100%" height="100%">
				<BarChart
					data={chartData}
					margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
				>
					<CartesianGrid
						strokeDasharray={TENANTFLOW_CHART_CONFIG.grid.strokeDasharray}
						stroke={TENANTFLOW_CHART_CONFIG.grid.stroke}
						strokeOpacity={TENANTFLOW_CHART_CONFIG.grid.strokeOpacity}
					/>

					<XAxis
						dataKey="name"
						fontSize={TENANTFLOW_CHART_CONFIG.axis.fontSize}
						color={TENANTFLOW_CHART_CONFIG.axis.color}
						tickLine={false}
						axisLine={false}
						angle={-45}
						textAnchor="end"
						height={80}
					/>

					<YAxis
						fontSize={TENANTFLOW_CHART_CONFIG.axis.fontSize}
						color={TENANTFLOW_CHART_CONFIG.axis.color}
						tickLine={false}
						axisLine={false}
						tickFormatter={config.formatter}
					/>

					<Tooltip content={<CustomTooltip />} />

					<Bar
						dataKey={config.dataKey}
						fill={config.color}
						radius={[4, 4, 0, 0]}
						name={config.name}
					/>
				</BarChart>
			</ResponsiveContainer>
		</ChartContainer>
	)
}
