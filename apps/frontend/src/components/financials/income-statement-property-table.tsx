'use client'

import { Building2 } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import type { PropertyPL } from '@repo/shared/types/financial-statements'

interface IncomeStatementPropertyTableProps {
	byProperty: PropertyPL[]
	formatCurrency: (amount: number) => string
}

export function IncomeStatementPropertyTable({
	byProperty,
	formatCurrency
}: IncomeStatementPropertyTableProps) {
	return (
		<BlurFade delay={0.8} inView>
			<div className="bg-card border border-border rounded-lg overflow-hidden">
				<div className="p-4 border-b border-border">
					<h3 className="font-medium text-foreground">
						Profit & Loss by Property
					</h3>
				</div>
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead className="bg-muted/50">
							<tr>
								<th className="text-left p-4 text-sm font-medium text-muted-foreground">
									Property
								</th>
								<th className="text-right p-4 text-sm font-medium text-muted-foreground">
									Revenue
								</th>
								<th className="text-right p-4 text-sm font-medium text-muted-foreground">
									Expenses
								</th>
								<th className="text-right p-4 text-sm font-medium text-muted-foreground">
									Net Income
								</th>
								<th className="text-right p-4 text-sm font-medium text-muted-foreground">
									Occupancy
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{byProperty.map((prop, idx) => (
								<BlurFade
									key={prop.propertyId}
									delay={0.85 + idx * 0.03}
									inView
								>
									<tr className="hover:bg-muted/30 transition-colors">
										<td className="p-4">
											<div className="flex items-center gap-3">
												<div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
													<Building2 className="w-4 h-4 text-primary" />
												</div>
												<span className="text-sm font-medium">
													{prop.propertyName}
												</span>
											</div>
										</td>
										<td className="p-4 text-right text-sm text-emerald-600">
											{formatCurrency(prop.revenue)}
										</td>
										<td className="p-4 text-right text-sm text-red-600">
											{formatCurrency(prop.expenses)}
										</td>
										<td className="p-4 text-right text-sm font-medium">
											{formatCurrency(prop.netIncome)}
										</td>
										<td className="p-4 text-right">
											<span
												className={`text-sm font-medium ${prop.occupancyRate >= 95 ? 'text-emerald-600' : prop.occupancyRate >= 85 ? 'text-amber-600' : 'text-red-600'}`}
											>
												{prop.occupancyRate}%
											</span>
										</td>
									</tr>
								</BlurFade>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</BlurFade>
	)
}
