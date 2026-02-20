'use client'

import { Wallet } from 'lucide-react'
import { formatCents } from '#lib/formatters/currency'
import type { FinancialLineItem } from '@repo/shared/types/financial-statements'

export function EquitySection({
	items,
	totalEquity
}: {
	items: FinancialLineItem[]
	totalEquity: number
}) {
	return (
		<div className="bg-card border border-border rounded-lg overflow-hidden">
			<div className="p-4 border-b border-border flex items-center gap-3 text-primary">
				<Wallet className="w-5 h-5" />
				<h3 className="font-medium text-foreground">Equity</h3>
			</div>
			<div className="divide-y divide-border">
				{items.map((item, idx) => (
					<div
						key={idx}
						className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
					>
						<span className="text-sm">{item.name}</span>
						<span className="text-sm font-medium tabular-nums">
							{formatCents(item.amount * 100)}
						</span>
					</div>
				))}
			</div>
			<div className="p-4 bg-muted/30 border-t border-border">
				<div className="flex items-center justify-between">
					<span className="text-sm font-semibold">Total Equity</span>
					<span className="text-lg font-bold text-primary tabular-nums">
						{formatCents(totalEquity * 100)}
					</span>
				</div>
			</div>
		</div>
	)
}
