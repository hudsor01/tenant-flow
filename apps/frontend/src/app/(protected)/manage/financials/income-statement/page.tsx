'use client'

import { Card, CardContent, CardHeader, CardTitle } from '#components/ui/card'
import { Button } from '#components/ui/button'
import { Input } from '#components/ui/input'
import { Label } from '#components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import { Separator } from '#components/ui/separator'
import {
	Search,
	Download,
	Upload,
	DollarSign,
	TrendingUp,
	TrendingDown,
	Loader2
} from 'lucide-react'
import { useState, useMemo } from 'react'
import { useIncomeStatement } from '#hooks/api/use-financial-statements'

const IncomeStatementPage = () => {
	const [period, setPeriod] = useState('monthly')
	const [year, setYear] = useState('2024')
	const [search, setSearch] = useState('')

	// Calculate date range based on period and year
	const dateRange = useMemo(() => {
		const yearNum = parseInt(year)
		if (period === 'yearly') {
			return {
				start_date: `${yearNum}-01-01`,
				end_date: `${yearNum}-12-31`
			}
		} else if (period === 'quarterly') {
			const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1
			const quarterStart = (currentQuarter - 1) * 3 + 1
			const quarterEnd = quarterStart + 2
			return {
				start_date: `${yearNum}-${quarterStart.toString().padStart(2, '0')}-01`,
				end_date: `${yearNum}-${quarterEnd.toString().padStart(2, '0')}-31`
			}
		} else {
			const currentMonth = new Date().getMonth() + 1
			const lastDay = new Date(yearNum, currentMonth, 0).getDate()
			return {
				start_date: `${yearNum}-${currentMonth.toString().padStart(2, '0')}-01`,
				end_date: `${yearNum}-${currentMonth.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`
			}
		}
	}, [period, year])

	// Fetch data from backend
	const { data: response, isLoading, error } = useIncomeStatement(dateRange)

	// Extract data from API response ({success: true, data: IncomeStatementData})
	const data = response?.data

	// Calculate totals from backend data
	const totalRevenue = data?.revenue.totalRevenue || 0
	const totalExpenses = data?.expenses.totalExpenses || 0
	const netIncome = data?.netIncome || 0

	// Show loading state
	if (isLoading) {
		return (
			<div className="p-6 flex items-center justify-center min-h-[400px]">
				<div className="flex flex-col items-center gap-4">
					<Loader2 className="w-8 h-8 animate-spin text-primary" />
					<p className="text-sm text-muted-foreground">Loading income statement...</p>
				</div>
			</div>
		)
	}

	// Show error state
	if (error) {
		return (
			<div className="p-6">
				<Card>
					<CardContent className="p-6">
						<div className="flex flex-col items-center gap-4 text-center">
							<div className="text-red-600">
								<TrendingDown className="w-12 h-12" />
							</div>
							<div>
								<h3 className="text-lg font-semibold">Failed to Load Income Statement</h3>
								<p className="text-sm text-muted-foreground mt-2">
									{error instanceof Error ? error.message : 'An error occurred'}
								</p>
							</div>
							<Button onClick={() => window.location.reload()}>Try Again</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		)
	}

	return (
		<div className="p-6 space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Income Statement</h1>
					<p className="text-gray-600">
						Revenue, expenses, and net income over a period
					</p>
				</div>
				<div className="flex gap-2">
					<Button variant="outline" size="sm">
						<Download className="w-4 h-4 mr-2" />
						Export
					</Button>
					<Button size="sm">
						<Upload className="w-4 h-4 mr-2" />
						Import
					</Button>
				</div>
			</div>

			{/* Filters */}
			<Card>
				<CardContent className="p-4">
					<div className="flex flex-wrap items-center gap-4">
						<div className="flex items-center gap-2">
								<Label>Period</Label>
								<Select value={period} onValueChange={setPeriod}>
									<SelectTrigger className="w-32">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="monthly">Monthly</SelectItem>
										<SelectItem value="quarterly">Quarterly</SelectItem>
										<SelectItem value="yearly">Yearly</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="flex items-center gap-2">
								<Label>Year</Label>
								<Select value={year} onValueChange={setYear}>
									<SelectTrigger className="w-24">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="2024">2024</SelectItem>
										<SelectItem value="2023">2023</SelectItem>
										<SelectItem value="2022">2022</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="flex items-center gap-2">
								<Input
									placeholder="Search..."
									className="w-64"
									value={search}
									onChange={e => setSearch(e.target.value)}
								/>
								<Button variant="outline" size="sm">
									<Search className="w-4 h-4" />
								</Button>
							</div>
					</div>
				</CardContent>
			</Card>

			{/* Summary Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
						<DollarSign className="h-4 w-4 text-green-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-green-600">
							${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
						</div>
						<p className="text-xs text-muted-foreground">
							{data?.period.label || 'Current period'}
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Total Expenses
						</CardTitle>
						<DollarSign className="h-4 w-4 text-red-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-red-600">
							${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
						</div>
						<p className="text-xs text-muted-foreground">
							{data?.period.label || 'Current period'}
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Net Income</CardTitle>
						<TrendingUp className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div
							className={`text-2xl font-bold ${netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}
						>
							{netIncome >= 0 ? '+' : ''}${netIncome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
						</div>
						<p className="text-xs text-muted-foreground">
							Profit Margin: {(data?.profitMargin || 0).toFixed(1)}%
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Income Statement */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
				{/* Revenue */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<DollarSign className="w-5 h-5 text-green-600" />
							Revenue
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<div className="flex justify-between p-3 bg-gray-50 rounded-lg">
								<span>Rental Income</span>
								<span className="font-semibold">
									${(data?.revenue.rentalIncome || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
								</span>
							</div>
							<div className="flex justify-between p-3 bg-gray-50 rounded-lg">
								<span>Late Fees Income</span>
								<span className="font-semibold">
									${(data?.revenue.lateFeesIncome || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
								</span>
							</div>
							<div className="flex justify-between p-3 bg-gray-50 rounded-lg">
								<span>Other Income</span>
								<span className="font-semibold">
									${(data?.revenue.otherIncome || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
								</span>
							</div>
						</div>
						<Separator />
						<div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
							<div className="font-semibold">Total Revenue</div>
							<div className="font-bold text-lg text-green-600">
								${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Expenses */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<DollarSign className="w-5 h-5 text-red-600" />
							Operating Expenses
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<div className="flex justify-between p-3 bg-gray-50 rounded-lg">
								<span>Property Management</span>
								<span className="font-semibold">
									${(data?.expenses.propertyManagement || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
								</span>
							</div>
							<div className="flex justify-between p-3 bg-gray-50 rounded-lg">
								<span>Maintenance</span>
								<span className="font-semibold">
									${(data?.expenses.maintenance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
								</span>
							</div>
							<div className="flex justify-between p-3 bg-gray-50 rounded-lg">
								<span>Utilities</span>
								<span className="font-semibold">
									${(data?.expenses.utilities || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
								</span>
							</div>
							<div className="flex justify-between p-3 bg-gray-50 rounded-lg">
								<span>Insurance</span>
								<span className="font-semibold">
									${(data?.expenses.insurance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
								</span>
							</div>
							<div className="flex justify-between p-3 bg-gray-50 rounded-lg">
								<span>Property Tax</span>
								<span className="font-semibold">
									${(data?.expenses.propertyTax || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
								</span>
							</div>
							<div className="flex justify-between p-3 bg-gray-50 rounded-lg">
								<span>Mortgage</span>
								<span className="font-semibold">
									${(data?.expenses.mortgage || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
								</span>
							</div>
							<div className="flex justify-between p-3 bg-gray-50 rounded-lg">
								<span>Other</span>
								<span className="font-semibold">
									${(data?.expenses.other || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
								</span>
							</div>
						</div>
						<Separator />
						<div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
							<div className="font-semibold">Total Expenses</div>
							<div className="font-bold text-lg text-red-600">
								${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Net Income Summary */}
			<Card>
				<CardHeader>
					<CardTitle>Net Income Summary</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<div className="space-y-2">
							<div className="flex justify-between py-2 border-b">
								<span>Total Revenue</span>
								<span className="font-semibold text-green-600">
									${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
								</span>
							</div>
							<div className="flex justify-between py-2 border-b">
								<span>Total Operating Expenses</span>
								<span className="font-semibold text-red-600">
									-${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
								</span>
							</div>
							<div className="flex justify-between py-2 border-b">
								<span>Gross Profit</span>
								<span className="font-semibold">
									${(data?.grossProfit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
								</span>
							</div>
							<div className="flex justify-between py-2 border-b">
								<span>Operating Income</span>
								<span className="font-semibold">
									${(data?.operatingIncome || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
								</span>
							</div>
						</div>
						<Separator />
						<div className="flex items-center justify-between p-4 bg-corporate-blue-50 rounded-lg">
							<div className="text-lg font-semibold">Net Income</div>
							<div
								className={`text-xl font-bold ${netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}
							>
								{netIncome >= 0 ? '+' : ''}${netIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
							</div>
						</div>
						{data?.previousPeriod && (
							<div className="mt-4 p-3 bg-gray-50 rounded-lg">
								<div className="text-sm text-gray-600 mb-2">Period Comparison</div>
								<div className="flex items-center gap-2">
									<span className="text-sm">Previous Period:</span>
									<span className="font-semibold">
										${data.previousPeriod.netIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
									</span>
									<span className={`text-sm ${data.previousPeriod.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
										({data.previousPeriod.changePercent >= 0 ? '+' : ''}{data.previousPeriod.changePercent.toFixed(1)}%)
									</span>
								</div>
							</div>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	)
}

export default IncomeStatementPage
