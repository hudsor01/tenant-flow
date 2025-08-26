/**
 * Chart component type definitions
 * Centralizes all chart-related component interfaces
 */

import type { TooltipProps } from 'recharts'

// Mini bar chart
export interface MiniBarChartProps {
	data: {
		name: string
		value: number
		color?: string
	}[]
	height?: number
	width?: string | number
	className?: string
	showTooltip?: boolean
	barRadius?: number
	spacing?: number
}

// Sparkline chart
export interface SparklineProps {
	data: {
		value: number
		date?: string
	}[]
	color?: string
	height?: number
	className?: string
	showTooltip?: boolean
}

// Custom tooltip for charts
export interface CustomTooltipProps extends TooltipProps<number, string> {
	active?: boolean
	payload?: {
		value: number
		dataKey: string
		name?: string
		color?: string
	}[]
	label?: string
}

// Chart data point
export interface ChartDataPoint {
	x: number | string
	y: number
	label?: string
	color?: string
}

// Line chart props
export interface LineChartProps {
	data: ChartDataPoint[]
	xLabel?: string
	yLabel?: string
	title?: string
	height?: number
	width?: number
	className?: string
	showGrid?: boolean
	showLegend?: boolean
}

// Bar chart props
export interface BarChartProps {
	data: ChartDataPoint[]
	xLabel?: string
	yLabel?: string
	title?: string
	height?: number
	width?: number
	className?: string
	orientation?: 'horizontal' | 'vertical'
	showGrid?: boolean
	showLegend?: boolean
}

// Pie chart props
export interface PieChartProps {
	data: {
		name: string
		value: number
		color?: string
	}[]
	title?: string
	height?: number
	width?: number
	className?: string
	showLabel?: boolean
	showLegend?: boolean
}

// Area chart props
export interface AreaChartProps {
	data: ChartDataPoint[]
	xLabel?: string
	yLabel?: string
	title?: string
	height?: number
	width?: number
	className?: string
	fillColor?: string
	strokeColor?: string
	showGrid?: boolean
	showLegend?: boolean
<<<<<<< HEAD
}
=======
}
>>>>>>> origin/main
