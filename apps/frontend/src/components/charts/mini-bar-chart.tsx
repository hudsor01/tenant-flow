'use client'

import React from 'react'
import { BarChart, Bar, ResponsiveContainer, Tooltip, Cell } from 'recharts'

interface MiniBarChartProps {
	data: Array<{ name: string; value: number; color?: string }>
	width?: number | string
	height?: number
	showTooltip?: boolean
	className?: string
	barRadius?: number
	spacing?: number
}

interface CustomTooltipProps {
	active?: boolean
	payload?: Array<{
		value: number
		payload: { name: string; value: number; color?: string }
	}>
	label?: string
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({
	active,
	payload,
	label
}) => {
	if (active && payload && payload.length) {
		const data = payload[0]
		if (!data) return null
		return (
			<div className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs shadow-md">
				<p className="mb-1 font-medium text-gray-900">{label}</p>
				<p className="text-gray-600">
					{typeof data.value === 'number'
						? data.value.toLocaleString()
						: data.value}
				</p>
			</div>
		)
	}
	return null
}

export const MiniBarChart: React.FC<MiniBarChartProps> = ({
	data,
	width = '100%',
	height = 60,
	showTooltip = true,
	className = '',
	barRadius = 2,
	spacing = 4
}) => {
	// Default colors using chart colors from theme
	const defaultColors = [
		'hsl(var(--chart-1))', // Steel blue
		'hsl(var(--chart-2))', // Teal
		'hsl(var(--chart-3))', // Slate
		'hsl(var(--chart-4))', // Light steel
		'hsl(var(--chart-5))' // Dark charcoal
	]

	return (
		<div
			className={`mini-bar-chart ${className}`}
			style={{ width, height }}
		>
			<ResponsiveContainer width="100%" height="100%">
				<BarChart
					data={data}
					margin={{ top: 2, right: 2, left: 2, bottom: 2 }}
					barCategoryGap={spacing}
				>
					{showTooltip && <Tooltip content={<CustomTooltip />} />}
					<Bar dataKey="value" radius={[barRadius, barRadius, 0, 0]}>
						{data?.map((entry, index) => (
							<Cell
								key={`cell-${index}`}
								fill={
									entry.color ||
									defaultColors[index % defaultColors.length]
								}
							/>
						))}
					</Bar>
				</BarChart>
			</ResponsiveContainer>
		</div>
	)
}

// Skeleton loading component
export const MiniBarChartSkeleton: React.FC<{
	height?: number
	className?: string
}> = ({ height = 60, className = '' }) => {
	return (
		<div
			className={`animate-pulse rounded bg-gray-200 ${className}`}
			style={{ height, width: '100%' }}
		>
			<div className="flex h-full items-end justify-between px-1 pb-1">
				{[...Array(5)].map((_, i) => (
					<div
						key={i}
						className="rounded-sm bg-gray-300"
						style={{
							width: '16%',
							height: `${Math.random() * 60 + 20}%`
						}}
					/>
				))}
			</div>
		</div>
	)
}

// Helper function to format data for occupancy charts
export const formatOccupancyData = (
	occupancyData: Record<string, number>
): Array<{ name: string; value: number; color?: string }> => {
	const statusColors = {
		Occupied: 'hsl(var(--chart-1))', // Steel blue
		Vacant: 'hsl(var(--chart-2))', // Teal
		Maintenance: 'hsl(var(--chart-4))', // Light steel
		'Under Renovation': 'hsl(var(--chart-5))' // Dark charcoal
	}

	return Object.entries(occupancyData).map(([status, count]) => ({
		name: status,
		value: count,
		color: statusColors[status as keyof typeof statusColors]
	}))
}

// Helper function to format data for financial charts
export const formatFinancialData = (
	data: Array<{ label: string; amount: number }>
): Array<{ name: string; value: number; color?: string }> => {
	return data.map((item, index) => ({
		name: item.label,
		value: item.amount,
		color: `hsl(var(--chart-${(index % 5) + 1}))`
	}))
}
