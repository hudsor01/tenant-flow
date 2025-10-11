'use client'

import { BarChart3, TrendingUp } from 'lucide-react'
import * as React from 'react'
import { Cell, Label, Pie, PieChart } from 'recharts'

import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import type { ChartConfig } from '@/components/ui/chart'
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent
} from '@/components/ui/chart'
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle
} from '@/components/ui/empty'
import type { ModernExplodedPieChartProps } from '@repo/shared/types/frontend'

export const description =
	'A donut chart with an active sector - TenantFlow Style'

export function ModernExplodedPieChart({
	data,
	height = 300,
	className,
	title = 'Property Occupancy',
	description = 'Current property status breakdown',
	showFooter = true
}: ModernExplodedPieChartProps) {
	const [activeIndex, setActiveIndex] = React.useState(0)

	// Move all hooks before early return to comply with Rules of Hooks
	const chartData = React.useMemo(() => data || [], [data])

	const chartConfig = {
		units: {
			label: 'Units'
		},
		occupied: {
			label: 'Occupied',
			color: 'var(--color-system-green)' // Success green
		},
		vacant: {
			label: 'Vacant',
			color: 'var(--color-system-orange)' // Warning orange
		},
		maintenance: {
			label: 'Maintenance',
			color: 'hsl(var(--destructive))' // Destructive red
		},
		pending: {
			label: 'Pending',
			color: 'var(--color-system-blue)' // Info blue
		}
	} satisfies ChartConfig

	// Calculate totals for display
	const totalUnits = React.useMemo(() => {
		return chartData.reduce((acc, curr) => acc + curr.value, 0)
	}, [chartData])

	const occupancyRate = React.useMemo(() => {
		const occupied =
			chartData.find(item => item.name === 'occupied')?.value || 0
		return totalUnits > 0 ? ((occupied / totalUnits) * 100).toFixed(1) : '0.0'
	}, [chartData, totalUnits])

	// No data - show empty state (check after hooks)
	if (!data || data.length === 0) {
		return (
			<Card className={`flex flex-col ${className}`}>
				<CardHeader className="items-center pb-0">
					<CardTitle>{title}</CardTitle>
					{description && <CardDescription>{description}</CardDescription>}
				</CardHeader>
				<CardContent className="flex-1 pb-0">
					<Empty>
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<BarChart3 />
							</EmptyMedia>
							<EmptyTitle>No data available</EmptyTitle>
							<EmptyDescription>
								No occupancy data to display. Data will appear here once units
								are added.
							</EmptyDescription>
						</EmptyHeader>
					</Empty>
				</CardContent>
			</Card>
		)
	}

	return (
		<Card className={`flex flex-col ${className}`}>
			<CardHeader className="items-center pb-0">
				<CardTitle>{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent className="flex-1 pb-0">
				<ChartContainer
					config={chartConfig}
					className="mx-auto aspect-square"
					style={{ maxHeight: `${height}px` }}
				>
					<PieChart>
						<ChartTooltip
							cursor={false}
							content={<ChartTooltipContent hideLabel />}
						/>
						<Pie
							data={chartData}
							dataKey="value"
							nameKey="name"
							innerRadius={60}
							strokeWidth={5}
							onMouseEnter={(_, index) => setActiveIndex(index)}
						>
							{chartData.map((entry, index) => (
								<Cell
									key={`cell-${index}`}
									fill={entry.fill}
									stroke={
										index === activeIndex
											? 'var(--color-gray-tertiary)'
											: 'none'
									}
									strokeWidth={index === activeIndex ? 2 : 0}
									style={{
										filter:
											index === activeIndex
												? 'drop-shadow(0 4px 8px var(--color-fill-primary))'
												: 'none',
										transform:
											index === activeIndex ? 'scale(1.05)' : 'scale(1)',
										transformOrigin: 'center',
										transition: 'all 0.2s ease-in-out'
									}}
								/>
							))}
							<Label
								content={({ viewBox }) => {
									if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
										return (
											<text
												x={viewBox.cx}
												y={viewBox.cy}
												textAnchor="middle"
												dominantBaseline="middle"
											>
												<tspan
													x={viewBox.cx}
													y={viewBox.cy}
													className="fill-foreground text-3xl font-bold"
												>
													{totalUnits.toLocaleString()}
												</tspan>
												<tspan
													x={viewBox.cx}
													y={(viewBox.cy || 0) + 24}
													className="fill-muted-foreground"
												>
													Total Units
												</tspan>
											</text>
										)
									}
									return null
								}}
							/>
						</Pie>
					</PieChart>
				</ChartContainer>
			</CardContent>
			{showFooter && (
				<CardFooter className="flex-col gap-2 text-sm">
					<div className="flex items-center gap-2 leading-none font-medium">
						{occupancyRate}% occupancy rate <TrendingUp className="h-4 w-4" />
					</div>
					<div className="text-muted-foreground leading-none">
						Showing current property status across portfolio
					</div>
				</CardFooter>
			)}
		</Card>
	)
}

export default ModernExplodedPieChart
