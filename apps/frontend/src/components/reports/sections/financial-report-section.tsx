'use client'

import { Button } from '#components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import { Skeleton } from '#components/ui/skeleton'
import { Download, Home } from 'lucide-react'
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
import { formatMoney, formatPercent, safeFormatMoney } from '../reports-utils'

interface FinancialReportData {
	summary: {
		totalIncome: number
		totalExpenses: number
		netIncome: number
		rentRollOccupancyRate: number
	}
	monthly: Array<{
		month: string
		income: number
		expenses: number
	}>
}

interface FinancialReportSectionProps {
	data: FinancialReportData | undefined
	isLoading: boolean
	isExporting: boolean
	onExport: () => void
}

export function FinancialReportSection({
	data,
	isLoading,
	isExporting,
	onExport
}: FinancialReportSectionProps) {
	return (
		<section className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="typography-h4 flex items-center gap-2">
						<Home className="size-5 text-primary" />
						Financial Reports
					</h2>
					<p className="text-muted-foreground">
						Income statements, expenses, cash flow, and rent roll
					</p>
				</div>
				<Button
					variant="outline"
					size="sm"
					disabled={!data || isExporting}
					onClick={onExport}
				>
					<Download className="size-4 mr-2" />
					Export PDF
				</Button>
			</div>

			{isLoading ? (
				<Skeleton className="h-72" />
			) : data ? (
				<>
					<div className="grid gap-4 md:grid-cols-4">
						<Card>
							<CardHeader>
								<CardDescription>Total Income</CardDescription>
								<CardTitle className="typography-stat">
									{formatMoney(data.summary.totalIncome)}
								</CardTitle>
							</CardHeader>
						</Card>
						<Card>
							<CardHeader>
								<CardDescription>Total Expenses</CardDescription>
								<CardTitle className="typography-stat">
									{formatMoney(data.summary.totalExpenses)}
								</CardTitle>
							</CardHeader>
						</Card>
						<Card>
							<CardHeader>
								<CardDescription>Net Income</CardDescription>
								<CardTitle className="typography-stat">
									{formatMoney(data.summary.netIncome)}
								</CardTitle>
							</CardHeader>
						</Card>
						<Card>
							<CardHeader>
								<CardDescription>Occupancy</CardDescription>
								<CardTitle className="typography-stat">
									{formatPercent(data.summary.rentRollOccupancyRate)}
								</CardTitle>
							</CardHeader>
						</Card>
					</div>

					<Card>
						<CardHeader>
							<CardTitle>Income vs Expenses</CardTitle>
							<CardDescription>Monthly cash flow overview</CardDescription>
						</CardHeader>
						<CardContent className="h-64">
							<ResponsiveContainer width="100%" height="100%">
								<AreaChart data={data.monthly}>
									<defs>
										<linearGradient
											id="incomeGradient"
											x1="0"
											y1="0"
											x2="0"
											y2="1"
										>
											<stop
												offset="5%"
												stopColor="var(--chart-1)"
												stopOpacity={0.6}
											/>
											<stop
												offset="95%"
												stopColor="var(--chart-1)"
												stopOpacity={0}
											/>
										</linearGradient>
										<linearGradient
											id="expenseGradient"
											x1="0"
											y1="0"
											x2="0"
											y2="1"
										>
											<stop
												offset="5%"
												stopColor="var(--chart-3)"
												stopOpacity={0.6}
											/>
											<stop
												offset="95%"
												stopColor="var(--chart-3)"
												stopOpacity={0}
											/>
										</linearGradient>
									</defs>
									<CartesianGrid strokeDasharray="3 3" />
									<XAxis dataKey="month" />
									<YAxis
										tickFormatter={value => formatMoney(Number(value))}
									/>
									<Tooltip formatter={safeFormatMoney} />
									<Legend />
									<Area
										type="monotone"
										dataKey="income"
										name="Income"
										stroke="var(--chart-1)"
										fill="url(#incomeGradient)"
									/>
									<Area
										type="monotone"
										dataKey="expenses"
										name="Expenses"
										stroke="var(--chart-3)"
										fill="url(#expenseGradient)"
									/>
								</AreaChart>
							</ResponsiveContainer>
						</CardContent>
					</Card>
				</>
			) : null}
		</section>
	)
}
