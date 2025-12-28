'use client'

import * as React from 'react'
import Link from 'next/link'
import {
	TrendingUp,
	TrendingDown,
	DollarSign,
	Wallet,
	ArrowRight,
	Building2,
	FileText,
	Receipt,
	CreditCard,
	Clock,
	AlertTriangle,
	Download,
	Calendar
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
import { NumberTicker } from '#components/ui/number-ticker'
import {
	Stat,
	StatLabel,
	StatValue,
	StatIndicator,
	StatDescription
} from '#components/ui/stat'
import { Button } from '#components/ui/button'
import {
	useFinancialOverview,
	useMonthlyMetrics
} from '#hooks/api/use-financial-overview'
import { formatCents } from '#lib/formatters/currency'

interface QuickLinkCardProps {
	href: string
	icon: React.ElementType
	title: string
	description: string
	value?: string
	trend?: 'up' | 'down' | 'neutral'
}

function QuickLinkCard({
	href,
	icon: Icon,
	title,
	description,
	value,
	trend
}: QuickLinkCardProps) {
	return (
		<Link
			href={href}
			className="group bg-card border border-border rounded-lg p-5 hover:bg-muted/50 transition-colors"
		>
			<div className="flex items-start justify-between mb-4">
				<div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
					<Icon className="w-5 h-5 text-primary" />
				</div>
				<ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
			</div>
			<h3 className="font-medium text-foreground mb-1">{title}</h3>
			<p className="text-sm text-muted-foreground mb-3">{description}</p>
			{value && (
				<div className="flex items-center gap-2">
					<span className="text-lg font-semibold tabular-nums">{value}</span>
					{trend === 'up' && (
						<TrendingUp className="w-4 h-4 text-emerald-600" />
					)}
					{trend === 'down' && (
						<TrendingDown className="w-4 h-4 text-red-600" />
					)}
				</div>
			)}
		</Link>
	)
}

export default function FinancialsPage() {
	const [year, setYear] = React.useState(new Date().getFullYear().toString())

	const { data: overview, isLoading, error, refetch } = useFinancialOverview()
	const { data: monthlyMetrics } = useMonthlyMetrics()

	// Calculate trends from monthly metrics
	const recentMonths = React.useMemo(() => {
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
		return (
			<div className="p-6 lg:p-8 bg-background min-h-full">
				{/* Header skeleton */}
				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
					<div>
						<Skeleton className="h-8 w-48 mb-2" />
						<Skeleton className="h-4 w-72" />
					</div>
					<div className="flex gap-2">
						<Skeleton className="h-10 w-24" />
						<Skeleton className="h-10 w-24" />
					</div>
				</div>
				{/* Stats skeleton */}
				<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
					{[1, 2, 3, 4].map(i => (
						<Skeleton key={i} className="h-28 rounded-lg" />
					))}
				</div>
				{/* Cards skeleton */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{[1, 2, 3, 4, 5, 6].map(i => (
						<Skeleton key={i} className="h-40 rounded-lg" />
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
						<AlertTriangle className="w-8 h-8 text-destructive" />
					</div>
					<h2 className="text-xl font-semibold text-foreground mb-3">
						Failed to Load Financial Overview
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
						<h1 className="typography-h1">Financial Overview</h1>
						<p className="text-muted-foreground">
							Revenue, expenses, and financial health at a glance.
						</p>
					</div>
					<div className="flex gap-2">
						<Select value={year} onValueChange={setYear}>
							<SelectTrigger className="w-[100px]">
								<Calendar className="w-4 h-4 mr-2" />
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="2024">2024</SelectItem>
								<SelectItem value="2023">2023</SelectItem>
								<SelectItem value="2022">2022</SelectItem>
							</SelectContent>
						</Select>
						<Button variant="outline">
							<Download className="w-4 h-4 mr-2" />
							Export
						</Button>
					</div>
				</div>
			</BlurFade>

			{/* Summary Stats */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
				<BlurFade delay={0.15} inView>
					<Stat className="relative overflow-hidden">
						{totalRevenue > 0 && (
							<BorderBeam
								size={100}
								duration={10}
								colorFrom="hsl(142 76% 36%)"
								colorTo="hsl(142 76% 36% / 0.3)"
							/>
						)}
						<StatLabel>Total Revenue</StatLabel>
						<StatValue className="flex items-baseline gap-0.5 text-emerald-600 dark:text-emerald-400">
							<span className="text-lg">$</span>
							<NumberTicker
								value={Math.floor(totalRevenue / 100)}
								duration={1500}
							/>
						</StatValue>
						<StatIndicator variant="icon" color="success">
							<TrendingUp />
						</StatIndicator>
						<StatDescription>
							{recentMonths
								? `${recentMonths.revenueChange >= 0 ? '+' : ''}${recentMonths.revenueChange.toFixed(1)}% vs last month`
								: 'year to date'}
						</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.2} inView>
					<Stat className="relative overflow-hidden">
						<StatLabel>Total Expenses</StatLabel>
						<StatValue className="flex items-baseline gap-0.5 text-red-600 dark:text-red-400">
							<span className="text-lg">$</span>
							<NumberTicker
								value={Math.floor(totalExpenses / 100)}
								duration={1500}
							/>
						</StatValue>
						<StatIndicator variant="icon" color="destructive">
							<TrendingDown />
						</StatIndicator>
						<StatDescription>
							{recentMonths
								? `${recentMonths.expenseChange >= 0 ? '+' : ''}${recentMonths.expenseChange.toFixed(1)}% vs last month`
								: 'operating costs'}
						</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.25} inView>
					<Stat className="relative overflow-hidden">
						{netIncome > 0 && (
							<BorderBeam
								size={100}
								duration={12}
								colorFrom="hsl(var(--primary))"
								colorTo="hsl(var(--primary)/0.3)"
							/>
						)}
						<StatLabel>Net Income</StatLabel>
						<StatValue
							className={`flex items-baseline gap-0.5 ${netIncome >= 0 ? '' : 'text-destructive'}`}
						>
							<span className="text-lg">{netIncome >= 0 ? '$' : '-$'}</span>
							<NumberTicker
								value={Math.abs(Math.floor(netIncome / 100))}
								duration={1500}
							/>
						</StatValue>
						<StatIndicator variant="icon" color="primary">
							<DollarSign />
						</StatIndicator>
						<StatDescription>{profitMargin}% profit margin</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.3} inView>
					<Stat className="relative overflow-hidden">
						{accountsReceivable > 0 && (
							<BorderBeam
								size={100}
								duration={8}
								colorFrom="hsl(45 93% 47%)"
								colorTo="hsl(45 93% 47% / 0.3)"
							/>
						)}
						<StatLabel>Outstanding</StatLabel>
						<StatValue className="flex items-baseline gap-0.5 text-amber-600 dark:text-amber-400">
							<span className="text-lg">$</span>
							<NumberTicker
								value={Math.floor(accountsReceivable / 100)}
								duration={1500}
							/>
						</StatValue>
						<StatIndicator variant="icon" color="warning">
							<Clock />
						</StatIndicator>
						<StatDescription>accounts receivable</StatDescription>
					</Stat>
				</BlurFade>
			</div>

			{/* Quick Links Grid */}
			<BlurFade delay={0.35} inView>
				<h2 className="text-lg font-medium text-foreground mb-4">
					Financial Reports
				</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
					<QuickLinkCard
						href="/financials/income-statement"
						icon={FileText}
						title="Income Statement"
						description="Revenue, expenses, and net income breakdown"
						value={formatCents(netIncome)}
						trend={netIncome > 0 ? 'up' : netIncome < 0 ? 'down' : 'neutral'}
					/>
					<QuickLinkCard
						href="/financials/cash-flow"
						icon={TrendingUp}
						title="Cash Flow"
						description="Track money coming in and going out"
						value={formatCents(totalRevenue - totalExpenses)}
						trend="up"
					/>
					<QuickLinkCard
						href="/financials/balance-sheet"
						icon={Building2}
						title="Balance Sheet"
						description="Assets, liabilities, and equity snapshot"
					/>
					<QuickLinkCard
						href="/financials/payouts"
						icon={Wallet}
						title="Payouts"
						description="Stripe Connect payout history and balance"
					/>
					<QuickLinkCard
						href="/financials/expenses"
						icon={Receipt}
						title="Expenses"
						description="Track maintenance and operating costs"
						value={formatCents(totalExpenses)}
						trend="down"
					/>
					<QuickLinkCard
						href="/financials/tax-documents"
						icon={CreditCard}
						title="Tax Documents"
						description="Download tax forms and schedules"
					/>
				</div>
			</BlurFade>

			{/* Highlights Section */}
			{overview?.highlights && overview.highlights.length > 0 && (
				<BlurFade delay={0.4} inView>
					<div className="bg-card border border-border rounded-lg p-6">
						<h3 className="font-medium text-foreground mb-4">
							Financial Highlights
						</h3>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
							{overview.highlights.map(
								(
									highlight: {
										label: string
										value: number
										trend: number | null
									},
									index: number
								) => (
									<div
										key={index}
										className="text-center p-4 bg-muted/30 rounded-lg"
									>
										<p className="text-2xl font-semibold tabular-nums">
											{typeof highlight.value === 'number' &&
											highlight.value > 1000
												? formatCents(highlight.value)
												: highlight.value}
										</p>
										<p className="text-sm text-muted-foreground mt-1">
											{highlight.label}
										</p>
										{highlight.trend !== null &&
											highlight.trend !== undefined && (
												<p
													className={`text-xs mt-1 ${highlight.trend >= 0 ? 'text-emerald-600' : 'text-destructive'}`}
												>
													{highlight.trend >= 0 ? '+' : ''}
													{highlight.trend.toFixed(1)}%
												</p>
											)}
									</div>
								)
							)}
						</div>
					</div>
				</BlurFade>
			)}
		</div>
	)
}
