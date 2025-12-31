'use client'

import { useState } from 'react'
import {
	ArrowUpCircle,
	ArrowDownCircle,
	Download,
	Wallet,
	ArrowRight
} from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import { NumberTicker } from '#components/ui/number-ticker'
import { BorderBeam } from '#components/ui/border-beam'
import {
	Stat,
	StatLabel,
	StatValue,
	StatIndicator,
	StatDescription
} from '#components/ui/stat'

interface CashFlowCategory {
	category: string
	amount: number
	percentage: number
}

interface MonthlyCashFlow {
	month: string
	inflows: number
	outflows: number
	netCashFlow: number
}

interface CashFlowProps {
	inflows: CashFlowCategory[]
	outflows: CashFlowCategory[]
	netCashFlow: number
	openingBalance: number
	closingBalance: number
	byMonth: MonthlyCashFlow[]
	onExport?: () => void
}

function formatCurrency(amount: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 0
	}).format(amount / 100)
}

export function CashFlow({
	inflows,
	outflows,
	netCashFlow,
	openingBalance,
	closingBalance,
	byMonth,
	onExport
}: CashFlowProps) {
	const [dateRange, setDateRange] = useState('this_year')

	const totalInflows = inflows.reduce((sum, i) => sum + i.amount, 0)
	const totalOutflows = outflows.reduce((sum, o) => sum + o.amount, 0)

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			{/* Header */}
			<BlurFade delay={0.1} inView>
				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
					<div>
						<h1 className="text-2xl font-semibold text-foreground">
							Cash Flow
						</h1>
						<p className="text-muted-foreground">
							Track money coming in and going out.
						</p>
					</div>
					<div className="flex gap-2">
						<select
							value={dateRange}
							onChange={e => setDateRange(e.target.value)}
							className="px-4 py-2.5 text-sm bg-card border border-border rounded-lg"
						>
							<option value="this_month">This Month</option>
							<option value="this_quarter">This Quarter</option>
							<option value="this_year">This Year</option>
						</select>
						<button
							onClick={onExport}
							className="inline-flex items-center gap-2 px-4 py-2.5 bg-card border border-border hover:bg-muted rounded-lg transition-colors"
						>
							<Download className="w-4 h-4" />
							Export
						</button>
					</div>
				</div>
			</BlurFade>

			{/* Cash Flow Summary */}
			<BlurFade delay={0.2} inView>
				<div className="bg-card border border-border rounded-lg p-6 mb-8">
					<div className="flex flex-col md:flex-row items-center justify-between gap-6">
						<div className="flex-1 text-center">
							<p className="text-sm text-muted-foreground mb-1">
								Opening Balance
							</p>
							<p className="text-2xl font-semibold">
								{formatCurrency(openingBalance)}
							</p>
						</div>
						<ArrowRight className="w-6 h-6 text-muted-foreground hidden md:block" />
						<div className="flex-1 text-center">
							<p className="text-sm text-muted-foreground mb-1">
								Net Cash Flow
							</p>
							<p
								className={`text-2xl font-semibold ${netCashFlow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
							>
								{netCashFlow >= 0 ? '+' : ''}
								{formatCurrency(netCashFlow)}
							</p>
						</div>
						<ArrowRight className="w-6 h-6 text-muted-foreground hidden md:block" />
						<div className="flex-1 text-center">
							<p className="text-sm text-muted-foreground mb-1">
								Closing Balance
							</p>
							<p className="text-2xl font-semibold">
								{formatCurrency(closingBalance)}
							</p>
						</div>
					</div>
				</div>
			</BlurFade>

			{/* Summary Stats */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
				<BlurFade delay={0.3} inView>
					<Stat className="relative overflow-hidden">
						<BorderBeam
							size={100}
							duration={10}
							colorFrom="hsl(142 76% 36%)"
							colorTo="hsl(142 76% 36% / 0.3)"
						/>
						<StatLabel>Total Inflows</StatLabel>
						<StatValue className="flex items-baseline gap-0.5 text-emerald-600 dark:text-emerald-400">
							<span className="text-lg">$</span>
							<NumberTicker value={totalInflows / 100} duration={1500} />
						</StatValue>
						<StatIndicator variant="icon" color="success">
							<ArrowUpCircle />
						</StatIndicator>
						<StatDescription>money received</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.4} inView>
					<Stat className="relative overflow-hidden">
						<StatLabel>Total Outflows</StatLabel>
						<StatValue className="flex items-baseline gap-0.5 text-red-600 dark:text-red-400">
							<span className="text-lg">$</span>
							<NumberTicker value={totalOutflows / 100} duration={1500} />
						</StatValue>
						<StatIndicator variant="icon" color="destructive">
							<ArrowDownCircle />
						</StatIndicator>
						<StatDescription>money spent</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.5} inView>
					<Stat className="relative overflow-hidden">
						<BorderBeam
							size={100}
							duration={12}
							colorFrom="hsl(var(--primary))"
							colorTo="hsl(var(--primary)/0.3)"
						/>
						<StatLabel>Net Cash Flow</StatLabel>
						<StatValue className="flex items-baseline gap-0.5">
							<span className="text-lg">$</span>
							<NumberTicker value={netCashFlow / 100} duration={1500} />
						</StatValue>
						<StatIndicator variant="icon" color="primary">
							<Wallet />
						</StatIndicator>
						<StatDescription>net change</StatDescription>
					</Stat>
				</BlurFade>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
				{/* Cash Inflows */}
				<BlurFade delay={0.6} inView>
					<div className="bg-card border border-border rounded-lg p-6">
						<h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
							<ArrowUpCircle className="w-4 h-4 text-emerald-600" />
							Cash Inflows
						</h3>
						<div className="space-y-4">
							{inflows.map((item, idx) => (
								<BlurFade key={item.category} delay={0.65 + idx * 0.05} inView>
									<div>
										<div className="flex items-center justify-between mb-1">
											<span className="text-sm text-foreground">
												{item.category}
											</span>
											<div className="flex items-center gap-3">
												<span className="text-sm text-muted-foreground">
													{item.percentage.toFixed(1)}%
												</span>
												<span className="text-sm font-medium text-emerald-600">
													{formatCurrency(item.amount)}
												</span>
											</div>
										</div>
										<div className="h-2 bg-muted rounded-full overflow-hidden">
											<div
												className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
												style={{ width: `${item.percentage}%` }}
											/>
										</div>
									</div>
								</BlurFade>
							))}
							<div className="flex items-center justify-between pt-4 border-t border-border">
								<span className="text-sm font-medium text-foreground">
									Total Inflows
								</span>
								<span className="text-sm font-semibold text-emerald-600">
									{formatCurrency(totalInflows)}
								</span>
							</div>
						</div>
					</div>
				</BlurFade>

				{/* Cash Outflows */}
				<BlurFade delay={0.7} inView>
					<div className="bg-card border border-border rounded-lg p-6">
						<h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
							<ArrowDownCircle className="w-4 h-4 text-red-600" />
							Cash Outflows
						</h3>
						<div className="space-y-4">
							{outflows.map((item, idx) => (
								<BlurFade key={item.category} delay={0.75 + idx * 0.05} inView>
									<div>
										<div className="flex items-center justify-between mb-1">
											<span className="text-sm text-foreground">
												{item.category}
											</span>
											<div className="flex items-center gap-3">
												<span className="text-sm text-muted-foreground">
													{item.percentage.toFixed(1)}%
												</span>
												<span className="text-sm font-medium text-red-600">
													{formatCurrency(item.amount)}
												</span>
											</div>
										</div>
										<div className="h-2 bg-muted rounded-full overflow-hidden">
											<div
												className="h-full bg-red-500 rounded-full transition-all duration-1000"
												style={{ width: `${item.percentage}%` }}
											/>
										</div>
									</div>
								</BlurFade>
							))}
							<div className="flex items-center justify-between pt-4 border-t border-border">
								<span className="text-sm font-medium text-foreground">
									Total Outflows
								</span>
								<span className="text-sm font-semibold text-red-600">
									{formatCurrency(totalOutflows)}
								</span>
							</div>
						</div>
					</div>
				</BlurFade>
			</div>

			{/* Monthly Cash Flow Chart */}
			<BlurFade delay={0.8} inView>
				<div className="bg-card border border-border rounded-lg p-6">
					<h3 className="font-medium text-foreground mb-4">
						Monthly Cash Flow
					</h3>
					<div className="h-64 flex items-end gap-4">
						{byMonth.map((data, index) => {
							const maxValue = Math.max(
								...byMonth.map(d => Math.max(d.inflows, d.outflows))
							)
							return (
								<BlurFade key={index} delay={0.85 + index * 0.03} inView>
									<div className="flex-1 flex flex-col items-center gap-2">
										<div className="w-full flex gap-1 items-end justify-center h-48">
											<div
												className="flex-1 bg-emerald-500 rounded-t transition-all"
												style={{
													height: `${(data.inflows / maxValue) * 100}%`
												}}
												title={`Inflows: ${formatCurrency(data.inflows)}`}
											/>
											<div
												className="flex-1 bg-red-500 rounded-t transition-all"
												style={{
													height: `${(data.outflows / maxValue) * 100}%`
												}}
												title={`Outflows: ${formatCurrency(data.outflows)}`}
											/>
										</div>
										<span className="text-xs text-muted-foreground">
											{data.month}
										</span>
										<span
											className={`text-xs font-medium ${data.netCashFlow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
										>
											{data.netCashFlow >= 0 ? '+' : ''}
											{formatCurrency(data.netCashFlow)}
										</span>
									</div>
								</BlurFade>
							)
						})}
					</div>
					<div className="flex justify-center gap-6 mt-4">
						<div className="flex items-center gap-2">
							<div className="w-3 h-3 rounded bg-emerald-500" />
							<span className="text-xs text-muted-foreground">Inflows</span>
						</div>
						<div className="flex items-center gap-2">
							<div className="w-3 h-3 rounded bg-red-500" />
							<span className="text-xs text-muted-foreground">Outflows</span>
						</div>
					</div>
				</div>
			</BlurFade>
		</div>
	)
}
