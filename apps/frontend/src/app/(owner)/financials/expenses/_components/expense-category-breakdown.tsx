'use client'

import { BlurFade } from '#components/ui/blur-fade'
import { formatCents } from '#lib/formatters/currency'
import { getCategoryBadge } from './expense-category-badge'

interface CategorySummary {
	category: string
	amount: number
	percentage: number
}

interface ExpenseCategoryBreakdownProps {
	categories: CategorySummary[]
}

export function ExpenseCategoryBreakdown({
	categories
}: ExpenseCategoryBreakdownProps) {
	if (categories.length === 0) return null

	return (
		<BlurFade delay={0.35} inView>
			<div className="bg-card border border-border rounded-lg p-4 mb-6">
				<h3 className="text-sm font-medium text-foreground mb-3">
					Expense Breakdown
				</h3>
				<div className="flex flex-wrap gap-4">
					{categories.map(cat => (
						<div key={cat.category} className="flex items-center gap-3">
							{getCategoryBadge(cat.category)}
							<span className="text-sm text-muted-foreground">
								{formatCents(cat.amount)} ({cat.percentage.toFixed(1)}%)
							</span>
						</div>
					))}
				</div>
			</div>
		</BlurFade>
	)
}
