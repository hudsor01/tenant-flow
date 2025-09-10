'use client'

import { Ellipsis, ShoppingBasket, TramFront, PieChart, TrendingDown, Calendar } from 'lucide-react'
import { Label, PolarRadiusAxis, RadialBar, RadialBarChart } from 'recharts'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ChartConfig } from '@/components/ui/chart'
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent
} from '@/components/ui/chart'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { 
	cn, 
	formatCurrency, 
	cardClasses,
	ANIMATION_DURATIONS,
	TYPOGRAPHY_SCALE
} from '@/lib/utils'

const chartData = [
	{ period: 'last-week', groceries: 380, transport: 120, other: 80 }
]

const chartConfig = {
	groceries: {
		label: 'Groceries',
		color: 'var(--chart-1)'
	},
	transport: {
		label: 'Transport',
		color: 'var(--chart-2)'
	},
	other: {
		label: 'Other',
		color: 'var(--chart-3)'
	}
} satisfies ChartConfig

export function ExpenseSummary() {
	const totalExpenses =
		chartData.length && chartData[0]
			? (chartData[0].groceries || 0) +
				(chartData[0].transport || 0) +
				(chartData[0].other || 0)
			: 0
			
	const spendingCap = 2000
	const remainingBudget = spendingCap - totalExpenses
	const budgetPercentage = (totalExpenses / spendingCap) * 100

	return (
		<Card 
			className={cn(
				cardClasses(),
				"shadow-lg hover:shadow-xl border-2"
			)}
			style={{
				animation: `fadeIn ${ANIMATION_DURATIONS.slow} ease-out`,
				transition: `all ${ANIMATION_DURATIONS.default} ease-out`
			}}
		>
			<CardHeader 
				style={{
					animation: `slideInFromTop ${ANIMATION_DURATIONS.default} ease-out`
				}}
			>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="bg-primary/10 p-2 rounded-lg">
							<PieChart className="w-5 h-5 text-primary" />
						</div>
						<div>
							<CardTitle 
								className="tracking-tight font-bold"
								style={{
									fontSize: TYPOGRAPHY_SCALE['heading-lg'].fontSize,
									lineHeight: TYPOGRAPHY_SCALE['heading-lg'].lineHeight
								}}
							>
								Expense Summary
							</CardTitle>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<Badge 
							variant="outline" 
							className="text-xs font-medium border-2"
						>
							<Calendar className="w-3 h-3 mr-1" />
							This Week
						</Badge>
						<Badge 
							variant={budgetPercentage > 80 ? "destructive" : budgetPercentage > 60 ? "secondary" : "default"}
							className="text-xs font-semibold"
						>
							<TrendingDown className="w-3 h-3 mr-1" />
							{budgetPercentage.toFixed(0)}% Used
						</Badge>
					</div>
				</div>
			</CardHeader>
			<CardContent 
				className="space-y-6"
				style={{
					animation: `slideInFromBottom ${ANIMATION_DURATIONS.default} ease-out`
				}}
			>
				<div className="bg-muted/20 rounded-xl p-4">
					<div className="h-40">
						<ChartContainer 
							config={chartConfig}
							style={{
								animation: `slideInFromLeft ${ANIMATION_DURATIONS.slow} ease-out`
							}}
						>
							<RadialBarChart
								margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
								data={chartData}
								endAngle={180}
								innerRadius={80}
								outerRadius={130}
							>
								<ChartTooltip
									content={<ChartTooltipContent hideLabel className="bg-background/95 backdrop-blur-sm border-2" />}
								/>
								<PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
									<Label
										content={({ viewBox }) => {
											if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
												return (
													<text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
														<tspan
															x={viewBox.cx}
															y={(viewBox.cy ?? 0) - 16}
															className="fill-primary text-3xl font-bold tabular-nums"
														>
															{formatCurrency(totalExpenses)}
														</tspan>
														<tspan
															x={viewBox.cx}
															y={(viewBox.cy ?? 0) + 4}
															className="fill-muted-foreground text-sm font-medium"
														>
															Total Spent
														</tspan>
													</text>
												)
											}
											return null
										}}
									/>
								</PolarRadiusAxis>
								<RadialBar
									dataKey="other"
									stackId="a"
									cornerRadius={6}
									fill="var(--color-other)"
									className="stroke-background stroke-2"
								/>
								<RadialBar
									dataKey="transport"
									stackId="a"
									cornerRadius={6}
									fill="var(--color-transport)"
									className="stroke-background stroke-2"
								/>
								<RadialBar
									dataKey="groceries"
									stackId="a"
									cornerRadius={6}
									fill="var(--color-groceries)"
									className="stroke-background stroke-2"
								/>
							</RadialBarChart>
						</ChartContainer>
					</div>
				</div>

				<div 
					className="grid grid-cols-3 gap-4"
					style={{
						animation: `fadeIn ${ANIMATION_DURATIONS.slow} ease-out`
					}}
				>
					<div className="flex flex-col items-center space-y-3 p-4 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10 rounded-xl border hover:shadow-md transition-all">
						<div className="bg-green-100 dark:bg-green-900/20 flex size-12 items-center justify-center rounded-full transition-all hover:scale-110">
							<ShoppingBasket className="size-6 text-green-600 dark:text-green-400" />
						</div>
						<div className="space-y-1 text-center">
							<p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
								Groceries
							</p>
							<p className="font-bold text-lg tabular-nums text-green-700 dark:text-green-400">
								{formatCurrency(chartData[0]?.groceries || 0)}
							</p>
						</div>
					</div>

					<div className="flex flex-col items-center space-y-3 p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 rounded-xl border hover:shadow-md transition-all">
						<div className="bg-blue-100 dark:bg-blue-900/20 flex size-12 items-center justify-center rounded-full transition-all hover:scale-110">
							<TramFront className="size-6 text-blue-600 dark:text-blue-400" />
						</div>
						<div className="space-y-1 text-center">
							<p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
								Transport
							</p>
							<p className="font-bold text-lg tabular-nums text-blue-700 dark:text-blue-400">
								{formatCurrency(chartData[0]?.transport || 0)}
							</p>
						</div>
					</div>

					<div className="flex flex-col items-center space-y-3 p-4 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/10 rounded-xl border hover:shadow-md transition-all">
						<div className="bg-purple-100 dark:bg-purple-900/20 flex size-12 items-center justify-center rounded-full transition-all hover:scale-110">
							<Ellipsis className="size-6 text-purple-600 dark:text-purple-400" />
						</div>
						<div className="space-y-1 text-center">
							<p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Other</p>
							<p className="font-bold text-lg tabular-nums text-purple-700 dark:text-purple-400">
								{formatCurrency(chartData[0]?.other || 0)}
							</p>
						</div>
					</div>
				</div>

				<div 
					className="bg-muted/30 rounded-xl p-4 border-2 border-dashed"
					style={{
						animation: `slideInFromRight ${ANIMATION_DURATIONS.default} ease-out`
					}}
				>
					<div className="flex items-center justify-between mb-2">
						<span className="text-sm font-semibold text-muted-foreground">Budget Status</span>
						<Badge variant={remainingBudget > 0 ? "default" : "destructive"} className="text-xs">
							{remainingBudget > 0 ? `${formatCurrency(remainingBudget)} left` : 'Over budget'}
						</Badge>
					</div>
					<div className="space-y-2">
						<div className="flex justify-between items-center text-sm">
							<span>Weekly Cap:</span>
							<span className="font-bold">{formatCurrency(spendingCap)}</span>
						</div>
						<div className="h-2 bg-muted rounded-full overflow-hidden">
							<div 
								className={cn(
									"h-full transition-all rounded-full",
									budgetPercentage > 100 ? "bg-red-500" : 
									budgetPercentage > 80 ? "bg-orange-500" :
									budgetPercentage > 60 ? "bg-yellow-500" : "bg-green-500"
								)}
								style={{ 
									width: `${Math.min(budgetPercentage, 100)}%`,
									transition: `width ${ANIMATION_DURATIONS.slow} ease-out`
								}}
							/>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
