'use client'

import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'

interface BreakdownItem {
	label: string
	amount: number
	percentage: string
}

interface IncomeStatementBreakdownCardsProps {
	revenueItems: BreakdownItem[]
	expenseItems: BreakdownItem[]
	revenueTotal: number
	expensesTotal: number
	formatCurrency: (amount: number) => string
}

export function IncomeStatementBreakdownCards({
	revenueItems,
	expenseItems,
	revenueTotal,
	expensesTotal,
	formatCurrency
}: IncomeStatementBreakdownCardsProps) {
	return (
		<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
			{/* Revenue Breakdown */}
			<BlurFade delay={0.5} inView>
				<div className="bg-card border border-border rounded-lg p-6">
					<h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
						<ArrowUpRight className="w-4 h-4 text-emerald-600" />
						Revenue Breakdown
					</h3>
					<div className="space-y-4">
						{revenueItems.map((item, idx) => (
							<BlurFade key={item.label} delay={0.55 + idx * 0.05} inView>
								<div className="flex items-center justify-between py-2 border-b border-border last:border-0">
									<div className="flex items-center gap-3">
										<div className="w-2 h-2 rounded-full bg-emerald-500" />
										<span className="text-sm text-foreground">{item.label}</span>
									</div>
									<div className="flex items-center gap-4">
										<span className="text-sm text-muted-foreground">
											{item.percentage}%
										</span>
										<span className="text-sm font-medium text-foreground">
											{formatCurrency(item.amount)}
										</span>
									</div>
								</div>
							</BlurFade>
						))}
						<div className="flex items-center justify-between pt-2 border-t border-border">
							<span className="text-sm font-medium text-foreground">
								Total Revenue
							</span>
							<span className="text-sm font-semibold text-emerald-600">
								{formatCurrency(revenueTotal)}
							</span>
						</div>
					</div>
				</div>
			</BlurFade>

			{/* Expense Breakdown */}
			<BlurFade delay={0.6} inView>
				<div className="bg-card border border-border rounded-lg p-6">
					<h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
						<ArrowDownRight className="w-4 h-4 text-red-600" />
						Expense Breakdown
					</h3>
					<div className="space-y-4">
						{expenseItems.map((item, idx) => (
							<BlurFade key={item.label} delay={0.65 + idx * 0.05} inView>
								<div className="flex items-center justify-between py-2 border-b border-border last:border-0">
									<div className="flex items-center gap-3">
										<div className="w-2 h-2 rounded-full bg-red-500" />
										<span className="text-sm text-foreground">{item.label}</span>
									</div>
									<div className="flex items-center gap-4">
										<span className="text-sm text-muted-foreground">
											{item.percentage}%
										</span>
										<span className="text-sm font-medium text-foreground">
											{formatCurrency(item.amount)}
										</span>
									</div>
								</div>
							</BlurFade>
						))}
						<div className="flex items-center justify-between pt-2 border-t border-border">
							<span className="text-sm font-medium text-foreground">
								Total Expenses
							</span>
							<span className="text-sm font-semibold text-red-600">
								{formatCurrency(expensesTotal)}
							</span>
						</div>
					</div>
				</div>
			</BlurFade>
		</div>
	)
}
