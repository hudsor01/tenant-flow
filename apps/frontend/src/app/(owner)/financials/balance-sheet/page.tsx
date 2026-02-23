'use client'

import { useMemo, useState } from 'react'
import { Building2, Wallet, CreditCard, Download } from 'lucide-react'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import { BlurFade } from '#components/ui/blur-fade'
import { BorderBeam } from '#components/ui/border-beam'
import {
	Stat,
	StatLabel,
	StatValue,
	StatIndicator,
	StatDescription
} from '#components/ui/stat'
import { useBalanceSheet } from '#hooks/api/use-financials'
import { BalanceSection } from './balance-section'
import { EquitySection } from './equity-section'
import { BalanceEquationCheck } from './balance-equation-check'
import { BalanceSheetSkeleton } from './balance-sheet-skeleton'
import { BalanceSheetError } from './balance-sheet-error'

function formatDate(dateStr: string) {
	return new Date(dateStr).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	})
}

export default function BalanceSheetPage() {
	const [year, setYear] = useState('2024')
	const [month, setMonth] = useState('12')

	const asOfDate = `${year}-${month}-${new Date(parseInt(year), parseInt(month), 0).getDate()}`
	const { data, isLoading, error, refetch } = useBalanceSheet(asOfDate)
	const balanceData = data?.data

	const assetsItems = useMemo(() => {
		if (!balanceData) return []
		return [
			{
				label: 'Current Assets',
				items: [
					{ name: 'Cash', amount: balanceData.assets.currentAssets.cash },
					{
						name: 'Accounts Receivable',
						amount: balanceData.assets.currentAssets.accountsReceivable
					},
					{
						name: 'Security Deposits',
						amount: balanceData.assets.currentAssets.security_deposits
					}
				],
				subtotal:
					balanceData.assets.currentAssets.cash +
					balanceData.assets.currentAssets.accountsReceivable +
					balanceData.assets.currentAssets.security_deposits
			},
			{
				label: 'Fixed Assets',
				items: [
					{
						name: 'Property Values',
						amount: balanceData.assets.fixedAssets.propertyValues
					},
					{
						name: 'Accumulated Depreciation',
						amount: -balanceData.assets.fixedAssets.accumulatedDepreciation
					},
					{
						name: 'Net Property Value',
						amount: balanceData.assets.fixedAssets.netPropertyValue
					}
				],
				subtotal: balanceData.assets.fixedAssets.netPropertyValue
			}
		]
	}, [balanceData])

	const liabilitiesItems = useMemo(() => {
		if (!balanceData) return []
		return [
			{
				label: 'Current Liabilities',
				items: [
					{
						name: 'Accounts Payable',
						amount: balanceData.liabilities.currentLiabilities.accountsPayable
					},
					{
						name: 'Security Deposit Liability',
						amount:
							balanceData.liabilities.currentLiabilities
								.security_depositLiability
					},
					{
						name: 'Accrued Expenses',
						amount: balanceData.liabilities.currentLiabilities.accruedExpenses
					}
				],
				subtotal:
					balanceData.liabilities.currentLiabilities.accountsPayable +
					balanceData.liabilities.currentLiabilities.security_depositLiability +
					balanceData.liabilities.currentLiabilities.accruedExpenses
			},
			{
				label: 'Long-Term Liabilities',
				items: [
					{
						name: 'Mortgages Payable',
						amount: balanceData.liabilities.longTermLiabilities.mortgagesPayable
					}
				],
				subtotal: balanceData.liabilities.longTermLiabilities.mortgagesPayable
			}
		]
	}, [balanceData])

	const equityItems = useMemo(() => {
		if (!balanceData) return []
		return [
			{ name: 'Owner Capital', amount: balanceData.equity.ownerCapital },
			{
				name: 'Retained Earnings',
				amount: balanceData.equity.retainedEarnings
			},
			{
				name: 'Current Period Income',
				amount: balanceData.equity.currentPeriodIncome
			}
		]
	}, [balanceData])

	const totalAssets = balanceData?.assets.totalAssets || 0
	const totalLiabilities = balanceData?.liabilities.totalLiabilities || 0
	const totalEquity = balanceData?.equity.totalEquity || 0
	const isBalanced = balanceData?.balanceCheck !== false

	if (isLoading) {
		return <BalanceSheetSkeleton />
	}

	if (error) {
		return (
			<BalanceSheetError error={error} onRetry={() => void refetch()} />
		)
	}

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			{/* Header */}
			<BlurFade delay={0.1} inView>
				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
					<div>
						<h1 className="typography-h1">Balance Sheet</h1>
						<p className="text-muted-foreground">
							As of {formatDate(asOfDate)}
						</p>
					</div>
					<div className="flex gap-2">
						<Select value={year} onValueChange={setYear}>
							<SelectTrigger className="w-[100px]">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="2024">2024</SelectItem>
								<SelectItem value="2023">2023</SelectItem>
								<SelectItem value="2022">2022</SelectItem>
							</SelectContent>
						</Select>
						<Select value={month} onValueChange={setMonth}>
							<SelectTrigger className="w-[130px]">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="01">January</SelectItem>
								<SelectItem value="02">February</SelectItem>
								<SelectItem value="03">March</SelectItem>
								<SelectItem value="04">April</SelectItem>
								<SelectItem value="05">May</SelectItem>
								<SelectItem value="06">June</SelectItem>
								<SelectItem value="07">July</SelectItem>
								<SelectItem value="08">August</SelectItem>
								<SelectItem value="09">September</SelectItem>
								<SelectItem value="10">October</SelectItem>
								<SelectItem value="11">November</SelectItem>
								<SelectItem value="12">December</SelectItem>
							</SelectContent>
						</Select>
						<button className="inline-flex items-center gap-2 px-4 py-2.5 bg-card border border-border hover:bg-muted text-foreground font-medium rounded-lg transition-colors">
							<Download className="w-4 h-4" />
							Export
						</button>
					</div>
				</div>
			</BlurFade>

			{/* Summary Stats */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
				<BlurFade delay={0.15} inView>
					<Stat className="relative overflow-hidden">
						<BorderBeam
							size={100}
							duration={10}
							colorFrom="var(--color-success)"
							colorTo="oklch(from var(--color-success) l c h / 0.3)"
						/>
						<StatLabel>Total Assets</StatLabel>
						<StatValue className="flex items-baseline text-emerald-600 dark:text-emerald-400">
							${Math.floor(totalAssets).toLocaleString()}
						</StatValue>
						<StatIndicator variant="icon" color="success">
							<Building2 />
						</StatIndicator>
						<StatDescription>what you own</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.2} inView>
					<Stat className="relative overflow-hidden">
						<StatLabel>Total Liabilities</StatLabel>
						<StatValue className="flex items-baseline text-red-600 dark:text-red-400">
							${Math.floor(totalLiabilities).toLocaleString()}
						</StatValue>
						<StatIndicator variant="icon" color="destructive">
							<CreditCard />
						</StatIndicator>
						<StatDescription>what you owe</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.25} inView>
					<Stat className="relative overflow-hidden">
						{totalEquity > 0 && (
							<BorderBeam
								size={100}
								duration={12}
								colorFrom="var(--color-primary)"
								colorTo="oklch(from var(--color-primary) l c h / 0.3)"
							/>
						)}
						<StatLabel>Total Equity</StatLabel>
						<StatValue className="flex items-baseline">
							${Math.floor(totalEquity).toLocaleString()}
						</StatValue>
						<StatIndicator variant="icon" color="primary">
							<Wallet />
						</StatIndicator>
						<StatDescription>net worth</StatDescription>
					</Stat>
				</BlurFade>
			</div>

			{/* Balance Equation Check */}
			<BlurFade delay={0.3} inView>
				<BalanceEquationCheck
					totalAssets={totalAssets}
					totalLiabilities={totalLiabilities}
					totalEquity={totalEquity}
					isBalanced={isBalanced}
				/>
			</BlurFade>

			{/* Balance Sheet Details */}
			<BlurFade delay={0.35} inView>
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<BalanceSection
						title="Assets"
						icon={Building2}
						items={assetsItems}
						total={totalAssets}
						totalLabel="Total Assets"
						colorClass="text-emerald-600"
					/>

					<div className="space-y-6">
						<BalanceSection
							title="Liabilities"
							icon={CreditCard}
							items={liabilitiesItems}
							total={totalLiabilities}
							totalLabel="Total Liabilities"
							colorClass="text-red-600"
						/>
						<EquitySection items={equityItems} totalEquity={totalEquity} />
					</div>
				</div>
			</BlurFade>
		</div>
	)
}
