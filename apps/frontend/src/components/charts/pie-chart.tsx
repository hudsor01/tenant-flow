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
} from '#components/ui/card'
import type { ChartConfig } from '#components/ui/chart'
import {
	ChartContainer,
	ChartStyle,
	ChartTooltip,
	ChartTooltipContent
} from '#components/ui/chart'
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle
} from '#components/ui/empty'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import type { ModernExplodedPieChartProps } from '@repo/shared/types/frontend'

export const description =
	'An interactive donut chart with active sector - TenantFlow Style'

export function ModernExplodedPieChart({
	data,
	height = 300,
	className,
	title = 'Property Occupancy',
	description = 'Current property status breakdown',
	showFooter = true
}: ModernExplodedPieChartProps) {
	const id = React.useId()
	const chartId = `pie-${id.replace(/:/g, '')}`

	// Move all hooks before early return to comply with Rules of Hooks
	const chartData = React.useMemo(() => data || [], [data])

	const chartConfig = {
		units: {
			label: 'Units'
		},
		occupied: {
			label: 'Occupied',
			color: 'var(--chart-1)' // Success green
		},
		vacant: {
			label: 'Vacant',
			color: 'var(--chart-2)' // Warning orange
		},
		maintenance: {
			label: 'Maintenance',
			color: 'var(--color-destructive)' // Destructive red
		},
		pending: {
			label: 'Pending',
			color: 'var(--chart-3)' // Info blue
		}
	} satisfies ChartConfig

	// Get list of segment names for selector
	const segmentNames = React.useMemo(
		() => chartData.map(item => item.name),
		[chartData]
	)

	const [activeSegment, setActiveSegment] = React.useState<string>(
		segmentNames[0] || ''
	)

	// Update activeSegment when data changes
	React.useEffect(() => {
		if (segmentNames.length > 0 && !segmentNames.includes(activeSegment)) {
			const firstSegment = segmentNames[0]
			if (firstSegment) {
				setActiveSegment(firstSegment)
			}
		}
	}, [segmentNames, activeSegment])

	const activeIndex = React.useMemo(
		() => chartData.findIndex(item => item.name === activeSegment),
		[chartData, activeSegment]
	)

	// Calculate totals for display
	const totalUnits = React.useMemo(() => {
		return chartData.reduce((acc, curr) => acc + curr.value, 0)
	}, [chartData])

	const activeValue = React.useMemo(() => {
		return chartData[activeIndex]?.value ?? 0
	}, [chartData, activeIndex])

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
		<Card data-chart={chartId} className={`flex flex-col ${className}`}>
			<ChartStyle id={chartId} config={chartConfig} />
			<CardHeader className="flex-row items-start space-y-0 pb-0">
				<div className="grid gap-1">
					<CardTitle>{title}</CardTitle>
					<CardDescription>{description}</CardDescription>
				</div>
				{segmentNames.length > 1 && (
					<Select value={activeSegment} onValueChange={setActiveSegment}>
						<SelectTrigger
							className="ml-auto h-7 w-[130px] rounded-lg pl-2.5"
							aria-label="Select segment"
						>
							<SelectValue placeholder="Select segment" />
						</SelectTrigger>
						<SelectContent align="end" className="rounded-xl">
							{segmentNames.map(name => {
								const config = chartConfig[name as keyof typeof chartConfig]
								if (!config) return null

								return (
									<SelectItem key={name} value={name} className="rounded-lg [&_span]:flex">
										<div className="flex items-center gap-2 text-xs">
											<span
												className="flex h-3 w-3 shrink-0 rounded-xs"
												style={{
													backgroundColor: `var(--color-${name})`
												}}
											/>
											{config?.label || name}
										</div>
									</SelectItem>
								)
							})}
						</SelectContent>
					</Select>
				)}
			</CardHeader>
			<CardContent className="flex flex-1 justify-center pb-0">
				<ChartContainer
					id={chartId}
					config={chartConfig}
					className="mx-auto aspect-square w-full"
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
						>
							{chartData.map((entry, index) => (
								<Cell
									key={`cell-${index}`}
									fill={entry.fill}
									stroke={index === activeIndex ? 'var(--color-border)' : 'none'}
									strokeWidth={index === activeIndex ? 2 : 0}
									style={{
										filter: index === activeIndex ? 'brightness(1.1)' : 'none',
										transform: index === activeIndex ? 'scale(1.05)' : 'scale(1)',
										transformOrigin: 'center',
										transition: 'all 200ms ease-in-out'
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
													{activeValue.toLocaleString()}
												</tspan>
												<tspan
													x={viewBox.cx}
													y={(viewBox.cy || 0) + 24}
													className="fill-muted-foreground"
												>
													{chartConfig[activeSegment as keyof typeof chartConfig]?.label || activeSegment}
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
						{occupancyRate}% occupancy rate <TrendingUp className="size-4" />
					</div>
					<div className="text-muted-foreground leading-none">
						{totalUnits.toLocaleString()} total units across portfolio
					</div>
				</CardFooter>
			)}
		</Card>
	)
}

export default ModernExplodedPieChart
