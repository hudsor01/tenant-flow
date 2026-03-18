'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '#components/ui/button'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import { BlurFade } from '#components/ui/blur-fade'
import { IncomeStatementSummaryStats } from '#components/financials/income-statement-summary-stats'
import { IncomeStatementBreakdownCards } from '#components/financials/income-statement-breakdown-cards'
import { IncomeStatementMonthlyTrend } from '#components/financials/income-statement-monthly-trend'
import { IncomeStatementPropertyTable } from '#components/financials/income-statement-property-table'
import { formatCurrency } from '#lib/formatters/currency'
import type {
	IncomeStatementRevenueBreakdown,
	IncomeStatementExpenseBreakdown,
	PropertyPL,
	MonthlyData
} from '#types/financial-statements'

interface IncomeStatementProps {
	revenue: IncomeStatementRevenueBreakdown
	expenses: IncomeStatementExpenseBreakdown
	netIncome: number
	byProperty: PropertyPL[]
	byMonth: MonthlyData[]
	onExport?: () => void
}

export function IncomeStatement({
	revenue,
	expenses,
	netIncome,
	byProperty,
	byMonth,
	onExport
}: IncomeStatementProps) {
	const [dateRange, setDateRange] = useState('this_year')

	const profitMargin = ((netIncome / revenue.total) * 100).toFixed(1)

	const revenueItems = [
		{
			label: 'Rent Collected',
			amount: revenue.rentCollected,
			percentage: ((revenue.rentCollected / revenue.total) * 100).toFixed(1)
		},
		{
			label: 'Late Fees',
			amount: revenue.lateFees,
			percentage: ((revenue.lateFees / revenue.total) * 100).toFixed(1)
		},
		{
			label: 'Other Income',
			amount: revenue.otherIncome,
			percentage: ((revenue.otherIncome / revenue.total) * 100).toFixed(1)
		}
	]

	const expenseItems = [
		{
			label: 'Maintenance',
			amount: expenses.maintenance,
			percentage: ((expenses.maintenance / expenses.total) * 100).toFixed(1)
		},
		{
			label: 'Platform Fees',
			amount: expenses.platformFees,
			percentage: ((expenses.platformFees / expenses.total) * 100).toFixed(1)
		},
		{
			label: 'Processing Fees',
			amount: expenses.processingFees,
			percentage: ((expenses.processingFees / expenses.total) * 100).toFixed(1)
		},
		{
			label: 'Other Expenses',
			amount: expenses.otherExpenses,
			percentage: ((expenses.otherExpenses / expenses.total) * 100).toFixed(1)
		}
	]

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			{/* Header */}
			<BlurFade delay={0.1} inView>
				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
					<div>
						<h1 className="text-2xl font-semibold text-foreground">
							Income Statement
						</h1>
						<p className="text-muted-foreground">
							Revenue, expenses, and profitability analysis.
						</p>
					</div>
					<div className="flex gap-2">
						<Select value={dateRange} onValueChange={setDateRange}>
							<SelectTrigger className="w-[140px]">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="this_month">This Month</SelectItem>
								<SelectItem value="this_quarter">This Quarter</SelectItem>
								<SelectItem value="this_year">This Year</SelectItem>
								<SelectItem value="last_year">Last Year</SelectItem>
							</SelectContent>
						</Select>
						<Button variant="outline" onClick={onExport}>
							<Download className="w-4 h-4" />
							Export
						</Button>
					</div>
				</div>
			</BlurFade>

			<IncomeStatementSummaryStats
				revenueTotal={revenue.total}
				expensesTotal={expenses.total}
				netIncome={netIncome}
				profitMargin={profitMargin}
			/>

			<IncomeStatementBreakdownCards
				revenueItems={revenueItems}
				expenseItems={expenseItems}
				revenueTotal={revenue.total}
				expensesTotal={expenses.total}
				formatCurrency={formatCurrency}
			/>

			<IncomeStatementMonthlyTrend byMonth={byMonth} />

			<IncomeStatementPropertyTable
				byProperty={byProperty}
				formatCurrency={formatCurrency}
			/>
		</div>
	)
}
