'use client'

import { useMemo, useState } from 'react'
import { useCashFlow } from '#hooks/api/use-financials'
import { CashFlowLoading } from './cash-flow-loading'
import { CashFlowError } from './cash-flow-error'
import { CashFlowHeader } from './cash-flow-header'
import { CashFlowBalanceSummary } from './cash-flow-balance-summary'
import { CashFlowStats } from './cash-flow-stats'
import { CashFlowBreakdown } from './cash-flow-breakdown'
import { CashFlowActivity } from './cash-flow-activity'

export default function CashFlowPage() {
	const [period, setPeriod] = useState('monthly')
	const [year, setYear] = useState('2024')

	const dateRange = useMemo(() => {
		const currentDate = new Date()
		const selectedYear = parseInt(year)

		if (period === 'yearly') {
			return {
				start_date: `${selectedYear}-01-01`,
				end_date: `${selectedYear}-12-31`
			}
		} else if (period === 'quarterly') {
			const currentQuarter = Math.floor(currentDate.getMonth() / 3)
			const startMonth = currentQuarter * 3 + 1
			const endMonth = startMonth + 2
			return {
				start_date: `${selectedYear}-${String(startMonth).padStart(2, '0')}-01`,
				end_date: `${selectedYear}-${String(endMonth).padStart(2, '0')}-${new Date(selectedYear, endMonth, 0).getDate()}`
			}
		} else {
			const month = currentDate.getMonth() + 1
			const lastDay = new Date(selectedYear, month, 0).getDate()
			return {
				start_date: `${selectedYear}-${String(month).padStart(2, '0')}-01`,
				end_date: `${selectedYear}-${String(month).padStart(2, '0')}-${lastDay}`
			}
		}
	}, [period, year])

	const { data, isLoading, error, refetch } = useCashFlow(dateRange)
	const cashFlowData = data?.data

	const inflowItems = useMemo(() => {
		if (!cashFlowData) return []
		const items = [
			{
				category: 'Rental Payments Received',
				amount: cashFlowData.operatingActivities.rentalPaymentsReceived
			},
			{
				category: 'Loan Proceeds',
				amount: cashFlowData.financingActivities.loanProceeds
			},
			{
				category: 'Owner Contributions',
				amount: cashFlowData.financingActivities.ownerContributions
			}
		].filter(i => i.amount > 0)
		const total = items.reduce((sum, i) => sum + i.amount, 0)
		return items.map(i => ({
			...i,
			percentage: total > 0 ? (i.amount / total) * 100 : 0
		}))
	}, [cashFlowData])

	const outflowItems = useMemo(() => {
		if (!cashFlowData) return []
		const items = [
			{
				category: 'Operating Expenses Paid',
				amount: Math.abs(cashFlowData.operatingActivities.operatingExpensesPaid)
			},
			{
				category: 'Maintenance Paid',
				amount: Math.abs(cashFlowData.operatingActivities.maintenancePaid)
			},
			{
				category: 'Property Acquisitions',
				amount: Math.abs(cashFlowData.investingActivities.propertyAcquisitions)
			},
			{
				category: 'Property Improvements',
				amount: Math.abs(cashFlowData.investingActivities.propertyImprovements)
			},
			{
				category: 'Mortgage Payments',
				amount: Math.abs(cashFlowData.financingActivities.mortgagePayments)
			},
			{
				category: 'Owner Distributions',
				amount: Math.abs(cashFlowData.financingActivities.ownerDistributions)
			}
		].filter(i => i.amount > 0)
		const total = items.reduce((sum, i) => sum + i.amount, 0)
		return items.map(i => ({
			...i,
			percentage: total > 0 ? (i.amount / total) * 100 : 0
		}))
	}, [cashFlowData])

	const totalInflows = inflowItems.reduce((sum, i) => sum + i.amount, 0)
	const totalOutflows = outflowItems.reduce((sum, i) => sum + i.amount, 0)
	const netCashFlow = cashFlowData?.netCashFlow || 0
	const openingBalance = cashFlowData?.beginningCash || 0
	const closingBalance = cashFlowData?.endingCash || 0

	if (isLoading) {
		return <CashFlowLoading />
	}

	if (error) {
		return (
			<CashFlowError
				error={error instanceof Error ? error : null}
				onRetry={() => void refetch()}
			/>
		)
	}

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			<CashFlowHeader
				period={period}
				year={year}
				onPeriodChange={setPeriod}
				onYearChange={setYear}
			/>

			<CashFlowBalanceSummary
				openingBalance={openingBalance}
				netCashFlow={netCashFlow}
				closingBalance={closingBalance}
			/>

			<CashFlowStats
				totalInflows={totalInflows}
				totalOutflows={totalOutflows}
				netCashFlow={netCashFlow}
			/>

			<CashFlowBreakdown
				inflowItems={inflowItems}
				outflowItems={outflowItems}
				totalInflows={totalInflows}
				totalOutflows={totalOutflows}
			/>

			<CashFlowActivity
				netOperatingCash={
					cashFlowData?.operatingActivities.netOperatingCash || 0
				}
				netInvestingCash={
					cashFlowData?.investingActivities.netInvestingCash || 0
				}
				netFinancingCash={
					cashFlowData?.financingActivities.netFinancingCash || 0
				}
			/>
		</div>
	)
}
