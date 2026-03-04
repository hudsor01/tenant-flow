'use client'

import { useMemo, useState } from 'react'
import {
	useFinancialOverview,
	useMonthlyMetrics
} from '#hooks/api/use-financials'
import { FinancialsLoading } from './financials-loading'
import { FinancialsError } from './financials-error'
import { FinancialsHeader } from './financials-header'
import { FinancialsSummaryStats } from './financials-summary-stats'
import { FinancialsQuickLinks } from './financials-quick-links'
import { FinancialsHighlights } from './financials-highlights'

export default function FinancialsPage() {
	const [year, setYear] = useState(new Date().getFullYear().toString())

	const { data: overview, isLoading, error, refetch } = useFinancialOverview()
	const { data: monthlyMetrics } = useMonthlyMetrics()

	const recentMonths = useMemo(() => {
		if (!monthlyMetrics || monthlyMetrics.length < 2) return null
		const sorted = [...monthlyMetrics].sort((a, b) =>
			a.month.localeCompare(b.month)
		)
		const current = sorted[sorted.length - 1]
		const previous = sorted[sorted.length - 2]
		if (!current || !previous) return null

		const revenueChange =
			previous.revenue > 0
				? ((current.revenue - previous.revenue) / previous.revenue) * 100
				: 0
		const expenseChange =
			previous.expenses > 0
				? ((current.expenses - previous.expenses) / previous.expenses) * 100
				: 0

		return { revenueChange, expenseChange, current, previous }
	}, [monthlyMetrics])

	const totalRevenue = overview?.overview?.total_revenue ?? 0
	const totalExpenses = overview?.overview?.total_expenses ?? 0
	const netIncome = overview?.overview?.net_income ?? 0
	const accountsReceivable = overview?.overview?.accounts_receivable ?? 0

	const profitMargin =
		totalRevenue > 0 ? ((netIncome / totalRevenue) * 100).toFixed(1) : '0.0'

	if (isLoading) {
		return <FinancialsLoading />
	}

	if (error) {
		return (
			<FinancialsError
				error={error instanceof Error ? error : null}
				onRetry={() => void refetch()}
			/>
		)
	}

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			<FinancialsHeader year={year} onYearChange={setYear} />

			<FinancialsSummaryStats
				totalRevenue={totalRevenue}
				totalExpenses={totalExpenses}
				netIncome={netIncome}
				accountsReceivable={accountsReceivable}
				profitMargin={profitMargin}
				recentMonths={recentMonths}
			/>

			<FinancialsQuickLinks
				netIncome={netIncome}
				totalRevenue={totalRevenue}
				totalExpenses={totalExpenses}
			/>

			<FinancialsHighlights highlights={overview?.highlights ?? []} />
		</div>
	)
}
