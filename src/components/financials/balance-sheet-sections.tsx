'use client'

import type { ElementType } from 'react'
import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '#components/ui/button'
import { BlurFade } from '#components/ui/blur-fade'
import { formatCurrency } from '#lib/utils/currency'
import type { FinancialLineItem } from '#types/financial-statements'

interface BalanceSectionProps {
	title: string
	icon: ElementType
	items: { label: string; items: FinancialLineItem[]; subtotal: number }[]
	total: number
	totalLabel: string
	colorClass: string
	delay: number
}

export function BalanceSection({
	title,
	icon: Icon,
	items,
	total,
	totalLabel,
	colorClass,
	delay
}: BalanceSectionProps) {
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
					{items.map((section) => (
						<div key={section.label}>
							<Button
								variant="ghost"
								onClick={() =>
									setExpanded(prev => ({
										...prev,
										[section.label]: !prev[section.label]
									}))
								}
								className="w-full flex items-center justify-between p-4 h-auto rounded-none"
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
							</Button>
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
