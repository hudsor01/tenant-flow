'use client'

import {
	Building2,
	Wallet,
	CreditCard,
	TrendingUp,
	Download,
	ChevronDown,
	ChevronRight
} from 'lucide-react'
import { useState } from 'react'
import { BlurFade } from '@/components/ui/blur-fade'
import { NumberTicker } from '@/components/ui/number-ticker'
import { BorderBeam } from '@/components/ui/border-beam'
import {
	Stat,
	StatLabel,
	StatValue,
	StatIndicator,
	StatDescription
} from '@/components/ui/stat'

interface BalanceItem {
	name: string
	amount: number
}

interface Assets {
	current: BalanceItem[]
	totalCurrent: number
	fixed: BalanceItem[]
	totalFixed: number
	totalAssets: number
}

interface Liabilities {
	current: BalanceItem[]
	totalCurrent: number
	longTerm: BalanceItem[]
	totalLongTerm: number
	totalLiabilities: number
}

interface Equity {
	items: BalanceItem[]
	totalEquity: number
}

interface BalanceSheetProps {
	asOfDate: string
	assets: Assets
	liabilities: Liabilities
	equity: Equity
	onExport?: () => void
}

function formatCurrency(amount: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 0
	}).format(amount / 100)
}

function formatDate(dateString: string): string {
	return new Date(dateString).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	})
}

function BalanceSection({
	title,
	icon: Icon,
	items,
	subtotals,
	total,
	totalLabel,
	colorClass,
	delay
}: {
	title: string
	icon: React.ElementType
	items: { label: string; items: BalanceItem[]; subtotal: number }[]
	subtotals?: { label: string; amount: number }[]
	total: number
	totalLabel: string
	colorClass: string
	delay: number
}) {
	const [expanded, setExpanded] = useState<Record<string, boolean>>({})

	return (
		<BlurFade delay={delay} inView>
			<div className="bg-card border border-border rounded-lg overflow-hidden">
				<div
					className={`p-4 border-b border-border flex items-center gap-3 ${colorClass}`}
				>
					<Icon className="w-5 h-5" />
					<h3 className="font-medium text-foreground">{title}</h3>
				</div>
				<div className="divide-y divide-border">
					{items.map((section, sIdx) => (
						<div key={section.label}>
							<button
								onClick={() =>
									setExpanded(prev => ({
										...prev,
										[section.label]: !prev[section.label]
									}))
								}
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
								<span className="text-sm font-medium">
									{formatCurrency(section.subtotal)}
								</span>
							</button>
							{expanded[section.label] && (
								<div className="bg-muted/20 px-4 pb-4">
									{section.items.map((item, iIdx) => (
										<BlurFade key={iIdx} delay={delay + 0.02 * iIdx} inView>
											<div className="flex items-center justify-between py-2 pl-6">
												<span className="text-sm text-muted-foreground">
													{item.name}
												</span>
												<span
													className={`text-sm ${item.amount < 0 ? 'text-red-600' : ''}`}
												>
													{formatCurrency(item.amount)}
												</span>
											</div>
										</BlurFade>
									))}
								</div>
							)}
						</div>
					))}
				</div>
				<div className="p-4 bg-muted/30 border-t border-border">
					<div className="flex items-center justify-between">
						<span className="text-sm font-semibold">{totalLabel}</span>
						<span className={`text-lg font-bold ${colorClass}`}>
							{formatCurrency(total)}
						</span>
					</div>
				</div>
			</div>
		</BlurFade>
	)
}

export function BalanceSheet({
	asOfDate,
	assets,
	liabilities,
	equity,
	onExport
}: BalanceSheetProps) {
	// Verify balance sheet equation: Assets = Liabilities + Equity
	const isBalanced =
		assets.totalAssets === liabilities.totalLiabilities + equity.totalEquity

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			{/* Header */}
			<BlurFade delay={0.1} inView>
				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
					<div>
						<h1 className="text-2xl font-semibold text-foreground">
							Balance Sheet
						</h1>
						<p className="text-muted-foreground">
							As of {formatDate(asOfDate)}
						</p>
					</div>
					<button
						onClick={onExport}
						className="inline-flex items-center gap-2 px-4 py-2.5 bg-card border border-border hover:bg-muted rounded-lg transition-colors"
					>
						<Download className="w-4 h-4" />
						Export
					</button>
				</div>
			</BlurFade>

			{/* Summary Stats */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
				<BlurFade delay={0.2} inView>
					<Stat className="relative overflow-hidden">
						<BorderBeam
							size={100}
							duration={10}
							colorFrom="hsl(142 76% 36%)"
							colorTo="hsl(142 76% 36% / 0.3)"
						/>
						<StatLabel>Total Assets</StatLabel>
						<StatValue className="flex items-baseline gap-0.5 text-emerald-600 dark:text-emerald-400">
							<span className="text-lg">$</span>
							<NumberTicker value={assets.totalAssets / 100} duration={1500} />
						</StatValue>
						<StatIndicator variant="icon" color="success">
							<Building2 />
						</StatIndicator>
						<StatDescription>what you own</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.3} inView>
					<Stat className="relative overflow-hidden">
						<StatLabel>Total Liabilities</StatLabel>
						<StatValue className="flex items-baseline gap-0.5 text-red-600 dark:text-red-400">
							<span className="text-lg">$</span>
							<NumberTicker
								value={liabilities.totalLiabilities / 100}
								duration={1500}
							/>
						</StatValue>
						<StatIndicator variant="icon" color="destructive">
							<CreditCard />
						</StatIndicator>
						<StatDescription>what you owe</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.4} inView>
					<Stat className="relative overflow-hidden">
						<BorderBeam
							size={100}
							duration={12}
							colorFrom="hsl(var(--primary))"
							colorTo="hsl(var(--primary)/0.3)"
						/>
						<StatLabel>Total Equity</StatLabel>
						<StatValue className="flex items-baseline gap-0.5">
							<span className="text-lg">$</span>
							<NumberTicker value={equity.totalEquity / 100} duration={1500} />
						</StatValue>
						<StatIndicator variant="icon" color="primary">
							<Wallet />
						</StatIndicator>
						<StatDescription>net worth</StatDescription>
					</Stat>
				</BlurFade>
			</div>

			{/* Balance Equation Check */}
			<BlurFade delay={0.45} inView>
				<div
					className={`p-4 rounded-lg border mb-6 ${isBalanced ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'}`}
				>
					<div className="flex items-center justify-center gap-4 text-sm">
						<span className="font-medium">
							Assets ({formatCurrency(assets.totalAssets)})
						</span>
						<span className="text-muted-foreground">=</span>
						<span className="font-medium">
							Liabilities ({formatCurrency(liabilities.totalLiabilities)})
						</span>
						<span className="text-muted-foreground">+</span>
						<span className="font-medium">
							Equity ({formatCurrency(equity.totalEquity)})
						</span>
						{isBalanced ? (
							<span className="text-emerald-600 font-medium">✓ Balanced</span>
						) : (
							<span className="text-red-600 font-medium">✗ Unbalanced</span>
						)}
					</div>
				</div>
			</BlurFade>

			{/* Balance Sheet Details */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Assets */}
				<BalanceSection
					title="Assets"
					icon={Building2}
					items={[
						{
							label: 'Current Assets',
							items: assets.current,
							subtotal: assets.totalCurrent
						},
						{
							label: 'Fixed Assets',
							items: assets.fixed,
							subtotal: assets.totalFixed
						}
					]}
					total={assets.totalAssets}
					totalLabel="Total Assets"
					colorClass="text-emerald-600"
					delay={0.5}
				/>

				{/* Liabilities & Equity */}
				<div className="space-y-6">
					<BalanceSection
						title="Liabilities"
						icon={CreditCard}
						items={[
							{
								label: 'Current Liabilities',
								items: liabilities.current,
								subtotal: liabilities.totalCurrent
							},
							{
								label: 'Long-Term Liabilities',
								items: liabilities.longTerm,
								subtotal: liabilities.totalLongTerm
							}
						]}
						total={liabilities.totalLiabilities}
						totalLabel="Total Liabilities"
						colorClass="text-red-600"
						delay={0.6}
					/>

					<BlurFade delay={0.7} inView>
						<div className="bg-card border border-border rounded-lg overflow-hidden">
							<div className="p-4 border-b border-border flex items-center gap-3 text-primary">
								<Wallet className="w-5 h-5" />
								<h3 className="font-medium text-foreground">Equity</h3>
							</div>
							<div className="divide-y divide-border">
								{equity.items.map((item, idx) => (
									<BlurFade key={idx} delay={0.75 + idx * 0.03} inView>
										<div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
											<span className="text-sm">{item.name}</span>
											<span className="text-sm font-medium">
												{formatCurrency(item.amount)}
											</span>
										</div>
									</BlurFade>
								))}
							</div>
							<div className="p-4 bg-muted/30 border-t border-border">
								<div className="flex items-center justify-between">
									<span className="text-sm font-semibold">Total Equity</span>
									<span className="text-lg font-bold text-primary">
										{formatCurrency(equity.totalEquity)}
									</span>
								</div>
							</div>
						</div>
					</BlurFade>
				</div>
			</div>
		</div>
	)
}
