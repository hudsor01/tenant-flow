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

import { Skeleton } from '#components/ui/skeleton'
import {
	Search,
	Download,
	Upload,
	DollarSign,
	ArrowUp,
	ArrowDown
} from 'lucide-react'
import { useState } from 'react'
import { useCashFlow } from '#hooks/api/use-financial-statements'
import type { FinancialLineItem } from '@repo/shared/types/financial-statements'

const CashFlowPage = () => {
	const [period, setPeriod] = useState('monthly')
	const [year, setYear] = useState('2024')

	// Calculate date range based on period/year selection
	const getDateRange = () => {
		const currentDate = new Date()
		const selectedYear = parseInt(year)

		if (period === 'yearly') {
			return {
				start_date: `${selectedYear}-01-01`,
				end_date: `${selectedYear}-12-31`
			}
		} else if (period === 'quarterly') {
			const currentQuarter = Math.floor(currentDate.getMonth() / 3)
			const startMonth = (currentQuarter * 3) + 1
			const endMonth = startMonth + 2
			return {
				start_date: `${selectedYear}-${String(startMonth).padStart(2, '0')}-01`,
				end_date: `${selectedYear}-${String(endMonth).padStart(2, '0')}-${new Date(selectedYear, endMonth, 0).getDate()}`
			}
		} else {
			// Monthly - use current month
			const month = currentDate.getMonth() + 1
			const lastDay = new Date(selectedYear, month, 0).getDate()
			return {
				start_date: `${selectedYear}-${String(month).padStart(2, '0')}-01`,
				end_date: `${selectedYear}-${String(month).padStart(2, '0')}-${lastDay}`
			}
		}
	}

	const dateRange = getDateRange()
	const { data, isLoading, error } = useCashFlow(dateRange)

	// Transform API data to UI format
	const transformedData = data?.data ? {
		operating: [
			{ name: 'Rental Payments Received', amount: data.data.operatingActivities.rentalPaymentsReceived },
			{ name: 'Operating Expenses Paid', amount: data.data.operatingActivities.operatingExpensesPaid },
			{ name: 'Maintenance Paid', amount: data.data.operatingActivities.maintenancePaid }
		],
		investing: [
			{ name: 'Property Acquisitions', amount: data.data.investingActivities.propertyAcquisitions },
			{ name: 'Property Improvements', amount: data.data.investingActivities.propertyImprovements }
		],
		financing: [
			{ name: 'Mortgage Payments', amount: data.data.financingActivities.mortgagePayments },
			{ name: 'Loan Proceeds', amount: data.data.financingActivities.loanProceeds },
			{ name: 'Owner Contributions', amount: data.data.financingActivities.ownerContributions },
			{ name: 'Owner Distributions', amount: data.data.financingActivities.ownerDistributions }
		]
	} : null

	const renderSection = (title: string, items: FinancialLineItem[]) => (
		<div className="space-y-4">
			<h3 className="text-lg font-semibold text-foreground">{title}</h3>
			<div className="space-y-2">
				{items.map((item) => {
					const isPositive = item.amount >= 0
					return (
						<div
							key={item.name}
							className="flex-between p-3 bg-muted/50 rounded-lg"
						>
							<div className="flex-1">
								<div className="font-medium text-foreground">{item.name}</div>
							</div>
							<div className="text-right">
								<div
									className={`font-semibold ${isPositive ? 'text-success' : 'text-red-600'}`}
								>
									{isPositive ? '+' : ''}${Math.abs(item.amount).toLocaleString()}
								</div>
							</div>
						</div>
					)
				})}
			</div>
		</div>
	)

	if (isLoading) {
		return (
			<div className="p-6 space-y-6">
				<div className="flex-between">
					<div>
						<h1 className="text-3xl font-bold">Cash Flow Statement</h1>
						<p className="text-muted-foreground">
							Cash inflows and outflows over a period
						</p>
					</div>
					<div className="flex gap-2">
						<Skeleton className="h-10 w-24" />
						<Skeleton className="h-10 w-24" />
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-(--spacing-6)">
					{[1, 2, 3].map(i => (
						<Card key={i}>
							<CardHeader>
								<Skeleton className="h-6 w-32" />
							</CardHeader>
							<CardContent>
								<Skeleton className="h-8 w-full" />
								<Skeleton className="h-4 w-24 mt-2" />
							</CardContent>
						</Card>
					))}
				</div>

				<div className="space-y-4">
					{[1, 2, 3].map(i => (
						<div key={i}>
							<Skeleton className="h-6 w-48 mb-4" />
							<div className="space-y-2">
								{[1, 2, 3].map(j => (
									<div
										key={j}
										className="flex-between p-3 bg-muted/50 rounded-lg"
									>
										<Skeleton className="h-4 w-32" />
										<Skeleton className="h-6 w-24" />
									</div>
								))}
							</div>
						</div>
					))}
				</div>
			</div>
		)
	}

	if (error) {
		return (
			<div className="p-6 space-y-6">
				<div className="flex-between">
					<div>
						<h1 className="text-3xl font-bold">Cash Flow Statement</h1>
						<p className="text-muted-foreground">
							Cash inflows and outflows over a period
						</p>
					</div>
				</div>
				<Card>
					<CardContent className="p-6">
						<div className="text-center">
							<p className="text-red-600">Failed to load cash flow data. Please try again.</p>
						</div>
					</CardContent>
				</Card>
			</div>
		)
	}

	if (!transformedData || !data?.data) {
		return null
	}

	const operatingTotal = data.data.operatingActivities.netOperatingCash || 0
	const investingTotal = data.data.investingActivities.netInvestingCash || 0
	const financingTotal = data.data.financingActivities.netFinancingCash || 0
	const netCashFlow = data.data.netCashFlow || 0

	return (
		<div className="p-6 space-y-6">
			{/* Header */}
			<div className="flex-between">
				<div>
					<h1 className="text-3xl font-bold">Cash Flow Statement</h1>
					<p className="text-muted-foreground">
						Cash inflows and outflows over a period
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
					<div className="flex flex-wrap items-center gap-(--spacing-4)">
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
							<Input placeholder="Search..." className="w-64" />
							<Button variant="outline" size="sm">
								<Search className="w-4 h-4" />
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Summary Cards */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-(--spacing-6)">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Operating Cash Flow
						</CardTitle>
						<ArrowUp className="h-4 w-4 text-success" />
				</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-success">
						${operatingTotal.toLocaleString()}
					</div>
						<p className="text-xs text-muted-foreground">Current period</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Investing Cash Flow
						</CardTitle>
						<ArrowDown className="h-4 w-4 text-red-600" />
				</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-red-600">
							${investingTotal.toLocaleString()}
						</div>
						<p className="text-xs text-muted-foreground">Current period</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Financing Cash Flow
						</CardTitle>
						<DollarSign className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							${financingTotal.toLocaleString()}
						</div>
						<p className="text-xs text-muted-foreground">Current period</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Net Cash Flow</CardTitle>
						<DollarSign className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div
							className={`text-2xl font-bold ${netCashFlow >= 0 ? 'text-success' : 'text-red-600'}`}
						>
							{netCashFlow >= 0 ? '+' : ''}${netCashFlow.toLocaleString()}
						</div>
						<p className="text-xs text-muted-foreground">Current period</p>
					</CardContent>
				</Card>
			</div>

			{/* Cash Flow Statement */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
				{/* Operating Activities */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<ArrowUp className="w-5 h-5 text-success" />
							Operating Activities
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-6">
						{renderSection('Operating Activities', transformedData.operating)}
						<Separator />
						<div className="flex-between p-4 bg-muted/50 rounded-lg">
							<div className="font-semibold">Net Operating Cash Flow</div>
							<div className="font-bold text-lg text-success">
								+${operatingTotal.toLocaleString()}
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Investing Activities */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<ArrowDown className="w-5 h-5 text-red-600" />
							Investing Activities
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-6">
						{renderSection('Investing Activities', transformedData.investing)}
						<Separator />
						<div className="flex-between p-3 bg-red-50 rounded-lg">
							<div className="font-semibold">Net Investing Cash Flow</div>
							<div className="font-bold text-lg text-red-600">
								${investingTotal.toLocaleString()}
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Financing Activities */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<DollarSign className="w-5 h-5 text-blue-600" />
							Financing Activities
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-6">
						{renderSection('Financing Activities', transformedData.financing)}
						<Separator />
						<div className="flex-between p-3 bg-blue-50 rounded-lg">
							<div className="font-semibold">Net Financing Cash Flow</div>
							<div className="font-bold text-lg">
								${financingTotal.toLocaleString()}
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Net Cash Flow Summary */}
			<Card>
				<CardHeader>
					<CardTitle>Net Cash Flow Summary</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<div className="flex-between p-4 bg-muted/50 rounded-lg">
							<div className="text-lg font-semibold">Net Cash Flow</div>
							<div
								className={`text-xl font-bold ${netCashFlow >= 0 ? 'text-success' : 'text-red-600'}`}
							>
								{netCashFlow >= 0 ? '+' : ''}${netCashFlow.toLocaleString()}
							</div>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-(--spacing-4) mt-4">
							<div className="text-center p-4 bg-green-50 rounded-lg">
								<div className="text-2xl font-bold text-success">
									+${operatingTotal.toLocaleString()}
								</div>
								<div className="text-muted">Operating</div>
							</div>
							<div className="text-center p-4 bg-red-50 rounded-lg">
								<div className="text-2xl font-bold text-red-600">
									${investingTotal.toLocaleString()}
								</div>
								<div className="text-muted">Investing</div>
							</div>
							<div className="text-center p-4 bg-blue-50 rounded-lg">
								<div className="text-2xl font-bold">
									${financingTotal.toLocaleString()}
								</div>
								<div className="text-muted">Financing</div>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}

export default CashFlowPage
