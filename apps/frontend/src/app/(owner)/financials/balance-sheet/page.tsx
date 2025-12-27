'use client'

import * as React from 'react'
import {
	Building2,
	Wallet,
	CreditCard,
	Download,
	ChevronDown,
	ChevronRight
} from 'lucide-react'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import { Skeleton } from '#components/ui/skeleton'
import { BlurFade } from '#components/ui/blur-fade'
import { BorderBeam } from '#components/ui/border-beam'
import { Stat, StatLabel, StatValue, StatIndicator, StatDescription } from '#components/ui/stat'
import { useBalanceSheet } from '#hooks/api/use-financial-statements'
import { formatCents } from '#lib/formatters/currency'

interface BalanceItem {
	name: string
	amount: number
}

interface BalanceSectionProps {
	title: string
	icon: React.ElementType
	items: { label: string; items: BalanceItem[]; subtotal: number }[]
	total: number
	totalLabel: string
	colorClass: string
}

function BalanceSection({
	title,
	icon: Icon,
	items,
	total,
	totalLabel,
	colorClass
}: BalanceSectionProps) {
	const [expanded, setExpanded] = React.useState<Record<string, boolean>>({})

	const toggleExpanded = (label: string) => {
		setExpanded(prev => ({ ...prev, [label]: !prev[label] }))
	}

	return (
		<div className="bg-card border border-border rounded-lg overflow-hidden">
			<div className={`p-4 border-b border-border flex items-center gap-3 ${colorClass}`}>
				<Icon className="w-5 h-5" />
				<h3 className="font-medium text-foreground">{title}</h3>
			</div>
			<div className="divide-y divide-border">
				{items.map((section) => (
					<div key={section.label}>
						<button
							onClick={() => toggleExpanded(section.label)}
							className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
						>
							<div className="flex items-center gap-2">
								{expanded[section.label] ? (
									<ChevronDown className="w-4 h-4 text-muted-foreground" />
								) : (
									<ChevronRight className="w-4 h-4 text-muted-foreground" />
								)}
								<span className="text-sm font-medium">{section.label}</span>
							</div>
							<span className="text-sm font-medium tabular-nums">{formatCents(section.subtotal * 100)}</span>
						</button>
						{expanded[section.label] && (
							<div className="bg-muted/20 px-4 pb-4">
								{section.items.map((item, idx) => (
									<div key={idx} className="flex items-center justify-between py-2 pl-6">
										<span className="text-sm text-muted-foreground">{item.name}</span>
										<span className={`text-sm tabular-nums ${item.amount < 0 ? 'text-red-600' : ''}`}>
											{formatCents(item.amount * 100)}
										</span>
									</div>
								))}
							</div>
						)}
					</div>
				))}
			</div>
			<div className="p-4 bg-muted/30 border-t border-border">
				<div className="flex items-center justify-between">
					<span className="text-sm font-semibold">{totalLabel}</span>
					<span className={`text-lg font-bold tabular-nums ${colorClass}`}>{formatCents(total * 100)}</span>
				</div>
			</div>
		</div>
	)
}

export default function BalanceSheetPage() {
	const [year, setYear] = React.useState('2024')
	const [month, setMonth] = React.useState('12')

	// Calculate as-of date
	const asOfDate = `${year}-${month}-${new Date(parseInt(year), parseInt(month), 0).getDate()}`
	const { data, isLoading, error, refetch } = useBalanceSheet(asOfDate)
	const balanceData = data?.data

	// Transform API data to section format
	const assetsItems = React.useMemo(() => {
		if (!balanceData) return []
		return [
			{
				label: 'Current Assets',
				items: [
					{ name: 'Cash', amount: balanceData.assets.currentAssets.cash },
					{ name: 'Accounts Receivable', amount: balanceData.assets.currentAssets.accountsReceivable },
					{ name: 'Security Deposits', amount: balanceData.assets.currentAssets.security_deposits }
				],
				subtotal: balanceData.assets.currentAssets.cash + balanceData.assets.currentAssets.accountsReceivable + balanceData.assets.currentAssets.security_deposits
			},
			{
				label: 'Fixed Assets',
				items: [
					{ name: 'Property Values', amount: balanceData.assets.fixedAssets.propertyValues },
					{ name: 'Accumulated Depreciation', amount: -balanceData.assets.fixedAssets.accumulatedDepreciation },
					{ name: 'Net Property Value', amount: balanceData.assets.fixedAssets.netPropertyValue }
				],
				subtotal: balanceData.assets.fixedAssets.netPropertyValue
			}
		]
	}, [balanceData])

	const liabilitiesItems = React.useMemo(() => {
		if (!balanceData) return []
		return [
			{
				label: 'Current Liabilities',
				items: [
					{ name: 'Accounts Payable', amount: balanceData.liabilities.currentLiabilities.accountsPayable },
					{ name: 'Security Deposit Liability', amount: balanceData.liabilities.currentLiabilities.security_depositLiability },
					{ name: 'Accrued Expenses', amount: balanceData.liabilities.currentLiabilities.accruedExpenses }
				],
				subtotal: balanceData.liabilities.currentLiabilities.accountsPayable + balanceData.liabilities.currentLiabilities.security_depositLiability + balanceData.liabilities.currentLiabilities.accruedExpenses
			},
			{
				label: 'Long-Term Liabilities',
				items: [
					{ name: 'Mortgages Payable', amount: balanceData.liabilities.longTermLiabilities.mortgagesPayable }
				],
				subtotal: balanceData.liabilities.longTermLiabilities.mortgagesPayable
			}
		]
	}, [balanceData])

	const equityItems = React.useMemo(() => {
		if (!balanceData) return []
		return [
			{ name: 'Owner Capital', amount: balanceData.equity.ownerCapital },
			{ name: 'Retained Earnings', amount: balanceData.equity.retainedEarnings },
			{ name: 'Current Period Income', amount: balanceData.equity.currentPeriodIncome }
		]
	}, [balanceData])

	const totalAssets = balanceData?.assets.totalAssets || 0
	const totalLiabilities = balanceData?.liabilities.totalLiabilities || 0
	const totalEquity = balanceData?.equity.totalEquity || 0
	const isBalanced = balanceData?.balanceCheck !== false

	const formatDate = (dateStr: string) => {
		return new Date(dateStr).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		})
	}

	if (isLoading) {
		return (
			<div className="p-6 lg:p-8 bg-background min-h-full">
				{/* Header skeleton */}
				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
					<div>
						<Skeleton className="h-8 w-40 mb-2" />
						<Skeleton className="h-4 w-64" />
					</div>
					<div className="flex gap-2">
						<Skeleton className="h-10 w-24" />
						<Skeleton className="h-10 w-32" />
						<Skeleton className="h-10 w-24" />
					</div>
				</div>
				{/* Stats skeleton */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
					{[1, 2, 3].map(i => (
						<Skeleton key={i} className="h-28 rounded-lg" />
					))}
				</div>
				{/* Content skeleton */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{[1, 2].map(i => (
						<Skeleton key={i} className="h-80 rounded-lg" />
					))}
				</div>
			</div>
		)
	}

	if (error) {
		return (
			<div className="p-6 lg:p-8 bg-background min-h-full">
				<div className="max-w-md mx-auto text-center py-16">
					<div className="w-16 h-16 rounded-lg bg-destructive/10 flex items-center justify-center mx-auto mb-6">
						<CreditCard className="w-8 h-8 text-destructive" />
					</div>
					<h2 className="text-xl font-semibold text-foreground mb-3">
						Failed to Load Balance Sheet
					</h2>
					<p className="text-muted-foreground mb-6">
						{error instanceof Error ? error.message : 'An error occurred'}
					</p>
					<button
						onClick={() => void refetch()}
						className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md transition-colors"
					>
						Try Again
					</button>
				</div>
			</div>
		)
	}

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			{/* Header */}
			<BlurFade delay={0.1} inView>
				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
					<div>
						<h1 className="text-2xl font-semibold text-foreground">Balance Sheet</h1>
						<p className="text-muted-foreground">As of {formatDate(asOfDate)}</p>
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

			{/* Summary Stats - Premium Stat Components */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
				<BlurFade delay={0.15} inView>
					<Stat className="relative overflow-hidden">
						<BorderBeam size={100} duration={10} colorFrom="hsl(142 76% 36%)" colorTo="hsl(142 76% 36% / 0.3)" />
						<StatLabel>Total Assets</StatLabel>
						<StatValue className="flex items-baseline text-emerald-600 dark:text-emerald-400">
							${Math.floor(totalAssets).toLocaleString()}
						</StatValue>
						<StatIndicator variant="icon" color="success">
							<Building2 />
						</StatIndicator>
						<StatDescription>
							what you own
						</StatDescription>
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
						<StatDescription>
							what you owe
						</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.25} inView>
					<Stat className="relative overflow-hidden">
						{totalEquity > 0 && (
							<BorderBeam size={100} duration={12} colorFrom="hsl(var(--primary))" colorTo="hsl(var(--primary)/0.3)" />
						)}
						<StatLabel>Total Equity</StatLabel>
						<StatValue className="flex items-baseline">
							${Math.floor(totalEquity).toLocaleString()}
						</StatValue>
						<StatIndicator variant="icon" color="primary">
							<Wallet />
						</StatIndicator>
						<StatDescription>
							net worth
						</StatDescription>
					</Stat>
				</BlurFade>
			</div>

			{/* Balance Equation Check */}
			<BlurFade delay={0.3} inView>
				<div className={`p-4 rounded-lg border mb-6 ${isBalanced ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'}`}>
					<div className="flex flex-wrap items-center justify-center gap-4 text-sm">
						<span className="font-medium">Assets ({formatCents(totalAssets * 100)})</span>
						<span className="text-muted-foreground">=</span>
						<span className="font-medium">Liabilities ({formatCents(totalLiabilities * 100)})</span>
						<span className="text-muted-foreground">+</span>
						<span className="font-medium">Equity ({formatCents(totalEquity * 100)})</span>
						{isBalanced ? (
							<span className="text-emerald-600 font-medium">✓ Balanced</span>
						) : (
							<span className="text-red-600 font-medium">✗ Unbalanced</span>
						)}
					</div>
				</div>
			</BlurFade>

			{/* Balance Sheet Details */}
			<BlurFade delay={0.35} inView>
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Assets */}
				<BalanceSection
					title="Assets"
					icon={Building2}
					items={assetsItems}
					total={totalAssets}
					totalLabel="Total Assets"
					colorClass="text-emerald-600"
				/>

				{/* Liabilities & Equity */}
				<div className="space-y-6">
					<BalanceSection
						title="Liabilities"
						icon={CreditCard}
						items={liabilitiesItems}
						total={totalLiabilities}
						totalLabel="Total Liabilities"
						colorClass="text-red-600"
					/>

					{/* Equity (simpler section) */}
					<div className="bg-card border border-border rounded-lg overflow-hidden">
						<div className="p-4 border-b border-border flex items-center gap-3 text-primary">
							<Wallet className="w-5 h-5" />
							<h3 className="font-medium text-foreground">Equity</h3>
						</div>
						<div className="divide-y divide-border">
							{equityItems.map((item, idx) => (
								<div key={idx} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
									<span className="text-sm">{item.name}</span>
									<span className="text-sm font-medium tabular-nums">{formatCents(item.amount * 100)}</span>
								</div>
							))}
						</div>
						<div className="p-4 bg-muted/30 border-t border-border">
							<div className="flex items-center justify-between">
								<span className="text-sm font-semibold">Total Equity</span>
								<span className="text-lg font-bold text-primary tabular-nums">{formatCents(totalEquity * 100)}</span>
							</div>
						</div>
					</div>
				</div>
			</div>
			</BlurFade>
		</div>
	)
}
