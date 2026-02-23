'use client'

import { Check, X } from 'lucide-react'
import { formatCents } from '#lib/formatters/currency'

export function BalanceEquationCheck({
	totalAssets,
	totalLiabilities,
	totalEquity,
	isBalanced
}: {
	totalAssets: number
	totalLiabilities: number
	totalEquity: number
	isBalanced: boolean
}) {
	return (
		<div
			className={`p-4 rounded-lg border mb-6 ${isBalanced ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'}`}
		>
			<div className="flex flex-wrap items-center justify-center gap-4 text-sm">
				<span className="font-medium">
					Assets ({formatCents(totalAssets * 100)})
				</span>
				<span className="text-muted-foreground">=</span>
				<span className="font-medium">
					Liabilities ({formatCents(totalLiabilities * 100)})
				</span>
				<span className="text-muted-foreground">+</span>
				<span className="font-medium">
					Equity ({formatCents(totalEquity * 100)})
				</span>
				{isBalanced ? (
					<span className="text-emerald-600 font-medium inline-flex items-center gap-1">
						<Check className="size-4" aria-hidden="true" />
						Balanced
					</span>
				) : (
					<span className="text-red-600 font-medium inline-flex items-center gap-1">
						<X className="size-4" aria-hidden="true" />
						Unbalanced
					</span>
				)}
			</div>
		</div>
	)
}
