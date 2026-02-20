'use client'

import { useState } from 'react'
import type { ElementType } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { formatCents } from '#lib/formatters/currency'
import type { FinancialLineItem } from '@repo/shared/types/financial-statements'

export interface BalanceSectionProps {
	title: string
	icon: ElementType
	items: { label: string; items: FinancialLineItem[]; subtotal: number }[]
	total: number
	totalLabel: string
	colorClass: string
}

export function BalanceSection({
	title,
	icon: Icon,
	items,
	total,
	totalLabel,
	colorClass
}: BalanceSectionProps) {
	const [expanded, setExpanded] = useState<Record<string, boolean>>({})

	const toggleExpanded = (label: string) => {
		setExpanded(prev => ({ ...prev, [label]: !prev[label] }))
	}

	return (
		<div className="bg-card border border-border rounded-lg overflow-hidden">
			<div
				className={`p-4 border-b border-border flex items-center gap-3 ${colorClass}`}
			>
				<Icon className="w-5 h-5" />
				<h3 className="font-medium text-foreground">{title}</h3>
			</div>
			<div className="divide-y divide-border">
				{items.map(section => (
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
							<span className="text-sm font-medium tabular-nums">
								{formatCents(section.subtotal * 100)}
							</span>
						</button>
						{expanded[section.label] && (
							<div className="bg-muted/20 px-4 pb-4">
								{section.items.map((item, idx) => (
									<div
										key={idx}
										className="flex items-center justify-between py-2 pl-6"
									>
										<span className="text-sm text-muted-foreground">
											{item.name}
										</span>
										<span
											className={`text-sm tabular-nums ${item.amount < 0 ? 'text-red-600' : ''}`}
										>
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
					<span className={`text-lg font-bold tabular-nums ${colorClass}`}>
						{formatCents(total * 100)}
					</span>
				</div>
			</div>
		</div>
	)
}
