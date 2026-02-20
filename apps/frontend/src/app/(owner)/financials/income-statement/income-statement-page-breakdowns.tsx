import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import { formatCents } from '#lib/formatters/currency'

interface BreakdownItem {
	label: string
	amount: number
}

interface IncomeStatementPageBreakdownsProps {
	revenueItems: BreakdownItem[]
	expenseItems: BreakdownItem[]
	totalRevenue: number
	totalExpenses: number
}

export function IncomeStatementPageBreakdowns({
	revenueItems,
	expenseItems,
	totalRevenue,
	totalExpenses
}: IncomeStatementPageBreakdownsProps) {
	return (
		<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
			{/* Revenue Breakdown */}
			<BlurFade delay={0.3} inView>
				<div className="bg-card border border-border rounded-lg p-6">
					<h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
						<ArrowUpRight className="w-4 h-4 text-emerald-600" />
						Revenue Breakdown
					</h3>
					<div className="space-y-3">
						{revenueItems.map(item => {
							const percentage =
								totalRevenue > 0
									? ((item.amount / totalRevenue) * 100).toFixed(1)
									: '0.0'
							return (
								<div
									key={item.label}
									className="flex items-center justify-between py-2 border-b border-border last:border-0"
								>
									<div className="flex items-center gap-3">
										<div className="w-2 h-2 rounded-full bg-emerald-500" />
										<span className="text-sm text-foreground">{item.label}</span>
									</div>
									<div className="flex items-center gap-4">
										<span className="text-sm text-muted-foreground">
											{percentage}%
										</span>
										<span className="text-sm font-medium text-foreground tabular-nums">
											{formatCents(item.amount * 100)}
										</span>
									</div>
								</div>
							)
						})}
						<div className="flex items-center justify-between pt-3 border-t border-border">
							<span className="text-sm font-medium text-foreground">
								Total Revenue
							</span>
							<span className="text-sm font-semibold text-emerald-600 tabular-nums">
								{formatCents(totalRevenue * 100)}
							</span>
						</div>
					</div>
				</div>
			</BlurFade>

			{/* Expense Breakdown */}
			<BlurFade delay={0.35} inView>
				<div className="bg-card border border-border rounded-lg p-6">
					<h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
						<ArrowDownRight className="w-4 h-4 text-red-600" />
						Expense Breakdown
					</h3>
					<div className="space-y-3">
						{expenseItems
							.filter(item => item.amount > 0)
							.map(item => {
								const percentage =
									totalExpenses > 0
										? ((item.amount / totalExpenses) * 100).toFixed(1)
										: '0.0'
								return (
									<div
										key={item.label}
										className="flex items-center justify-between py-2 border-b border-border last:border-0"
									>
										<div className="flex items-center gap-3">
											<div className="w-2 h-2 rounded-full bg-red-500" />
											<span className="text-sm text-foreground">
												{item.label}
											</span>
										</div>
										<div className="flex items-center gap-4">
											<span className="text-sm text-muted-foreground">
												{percentage}%
											</span>
											<span className="text-sm font-medium text-foreground tabular-nums">
												{formatCents(item.amount * 100)}
											</span>
										</div>
									</div>
								)
							})}
						<div className="flex items-center justify-between pt-3 border-t border-border">
							<span className="text-sm font-medium text-foreground">
								Total Expenses
							</span>
							<span className="text-sm font-semibold text-red-600 tabular-nums">
								{formatCents(totalExpenses * 100)}
							</span>
						</div>
					</div>
				</div>
			</BlurFade>
		</div>
	)
}
