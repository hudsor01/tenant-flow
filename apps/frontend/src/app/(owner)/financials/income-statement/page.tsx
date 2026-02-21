'use client'

import { useMemo, useState } from 'react'
import { useIncomeStatement } from '#hooks/api/use-financials'
import { IncomeStatementPageLoading } from './income-statement-page-loading'
import { IncomeStatementPageError } from './income-statement-page-error'
import { IncomeStatementPageHeader } from './income-statement-page-header'
import { IncomeStatementPageStats } from './income-statement-page-stats'
import { IncomeStatementPageBreakdowns } from './income-statement-page-breakdowns'
import { IncomeStatementPageNetSummary } from './income-statement-page-net-summary'

export default function IncomeStatementPage() {
	const [period, setPeriod] = useState('monthly')
	const [year, setYear] = useState('2024')

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

	const {
		data: response,
		isLoading,
		error,
		refetch
	} = useIncomeStatement(dateRange)
	const data = response?.data

	const totalRevenue = data?.revenue.totalRevenue || 0
	const totalExpenses = data?.expenses.totalExpenses || 0
	const netIncome = data?.netIncome || 0
	const profitMargin =
		totalRevenue > 0 ? ((netIncome / totalRevenue) * 100).toFixed(1) : '0.0'

	const revenueItems = [
		{ label: 'Rental Income', amount: data?.revenue.rentalIncome || 0 },
		{ label: 'Late Fees', amount: data?.revenue.lateFeesIncome || 0 },
		{ label: 'Other Income', amount: data?.revenue.otherIncome || 0 }
	]

	const expenseItems = [
		{
			label: 'Property Management',
			amount: data?.expenses.propertyManagement || 0
		},
		{ label: 'Maintenance', amount: data?.expenses.maintenance || 0 },
		{ label: 'Utilities', amount: data?.expenses.utilities || 0 },
		{ label: 'Insurance', amount: data?.expenses.insurance || 0 },
		{ label: 'Property Tax', amount: data?.expenses.propertyTax || 0 },
		{ label: 'Mortgage', amount: data?.expenses.mortgage || 0 },
		{ label: 'Other', amount: data?.expenses.other || 0 }
	]

	if (isLoading) {
		return <IncomeStatementPageLoading />
	}

	if (error) {
		return (
			<IncomeStatementPageError
				error={error instanceof Error ? error : null}
				onRetry={() => void refetch()}
			/>
		)
	}

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			<IncomeStatementPageHeader
				period={period}
				year={year}
				onPeriodChange={setPeriod}
				onYearChange={setYear}
			/>

			<IncomeStatementPageStats
				totalRevenue={totalRevenue}
				totalExpenses={totalExpenses}
				netIncome={netIncome}
				profitMargin={profitMargin}
			/>

			<IncomeStatementPageBreakdowns
				revenueItems={revenueItems}
				expenseItems={expenseItems}
				totalRevenue={totalRevenue}
				totalExpenses={totalExpenses}
			/>

			<IncomeStatementPageNetSummary
				totalRevenue={totalRevenue}
				totalExpenses={totalExpenses}
				netIncome={netIncome}
				grossProfit={data?.grossProfit}
				operatingIncome={data?.operatingIncome}
				previousPeriod={data?.previousPeriod}
			/>
		</div>
	)
}
