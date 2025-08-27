'use client'

import React from 'react'
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'

interface SparklineProps {
	data: { name: string; value: number; date?: string }[]
	width?: number | string
	height?: number
	color?: string
	showTooltip?: boolean
	strokeWidth?: number
	className?: string
}

interface CustomTooltipProps {
	active?: boolean
	payload?: {
		value: number
		payload: { name: string; value: number; date?: string }
	}[]
	label?: string
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({
	active,
	payload,
	label: _label
}) => {
	if (active && payload?.length) {
		const data = payload[0]
		if (!data) {
			return null
		}
		return (
			<div className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs shadow-md">
				<p className="font-medium text-gray-900">
					{typeof data.value === 'number'
						? data.value.toLocaleString()
						: data.value}
				</p>
				{data?.payload?.date && (
					<p className="text-gray-500">{data.payload.date}</p>
				)}
			</div>
		)
	}
	return null
}

export const Sparkline: React.FC<SparklineProps> = ({
	data,
	width = '100%',
	height = 40,
	color,
	showTooltip = true,
	strokeWidth = 2,
	className = ''
}) => {
	// Determine trend direction
	const firstValue = data?.[0]?.value ?? 0
	const lastValue = data?.[data.length - 1]?.value ?? 0
	const isPositiveTrend = lastValue >= firstValue

	// Default color based on trend
	const defaultColor = isPositiveTrend
		? 'hsl(var(--chart-1))' // Steel blue for positive trend
		: 'hsl(var(--chart-2))' // Teal for neutral/negative trend

	const strokeColor = color ?? defaultColor

	return (
		<div className={`sparkline ${className}`} style={{ width, height }}>
			<ResponsiveContainer width="100%" height="100%">
				<LineChart
					data={data}
					margin={{ top: 2, right: 2, left: 2, bottom: 2 }}
				>
					{showTooltip && <Tooltip content={<CustomTooltip />} />}
					<Line
						type="monotone"
						dataKey="value"
						stroke={strokeColor}
						strokeWidth={strokeWidth}
						dot={false}
						activeDot={{
							r: 3,
							fill: strokeColor,
							stroke: strokeColor,
							strokeWidth: 0
						}}
					/>
				</LineChart>
			</ResponsiveContainer>
		</div>
	)
}

// Helper function to generate trend indicator
export const getTrendIndicator = (data: { value: number }[]) => {
	if (data.length < 2) {
		return { direction: 'neutral' as const, percentage: 0 }
	}

	const firstValue = data[0]?.value ?? 0
	const lastValue = data[data.length - 1]?.value ?? 0

	if (firstValue === 0) {
		return { direction: 'up' as const, percentage: 0 }
	}

	const percentage = ((lastValue - firstValue) / firstValue) * 100
	const direction =
		percentage > 0 ? 'up' : percentage < 0 ? 'down' : 'neutral'

	return { direction, percentage }
}

// Helper component for trend badge
export const TrendBadge: React.FC<{
	trend: ReturnType<typeof getTrendIndicator>
}> = ({ trend }) => {
	const { direction, percentage } = trend

	const getColorClass = () => {
		switch (direction) {
			case 'up':
				return 'text-green-600 bg-green-50 border-green-200'
			case 'down':
				return 'text-red-600 bg-red-50 border-red-200'
			default:
				return 'text-gray-600 bg-gray-50 border-gray-200'
		}
	}

	const getIcon = () => {
		switch (direction) {
			case 'up':
				return '↗'
			case 'down':
				return '↘'
			default:
				return '→'
		}
	}

	return (
		<span
			className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium ${getColorClass()}`}
		>
			<span className="mr-0.5">{getIcon()}</span>
			{Math.abs(percentage).toFixed(1)}%
		</span>
	)
}
