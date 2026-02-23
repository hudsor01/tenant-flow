'use client'

import { BlurFade } from '#components/ui/blur-fade'
import type { MonthlyData } from '@repo/shared/types/financial-statements'

interface IncomeStatementMonthlyTrendProps {
	byMonth: MonthlyData[]
}

export function IncomeStatementMonthlyTrend({
	byMonth
}: IncomeStatementMonthlyTrendProps) {
	const maxNetIncome = Math.max(...byMonth.map(d => d.netIncome))

	return (
		<BlurFade delay={0.7} inView>
			<div className="bg-card border border-border rounded-lg p-6 mb-6">
				<h3 className="font-medium text-foreground mb-4">
					Monthly Income Trend
				</h3>
				<div className="h-48 flex items-end gap-2">
					{byMonth.map((data, index) => (
						<BlurFade key={index} delay={0.75 + index * 0.03} inView>
							<div className="flex-1 flex flex-col items-center gap-2">
								<div className="w-full flex flex-col gap-0.5">
									<div
										className="w-full bg-emerald-500 rounded-t transition-all"
										style={{
											height: `${(data.netIncome / maxNetIncome) * 120}px`
										}}
									/>
								</div>
								<span className="text-xs text-muted-foreground">
									{data.month}
								</span>
							</div>
						</BlurFade>
					))}
				</div>
				<div className="flex justify-center gap-6 mt-4">
					<div className="flex items-center gap-2">
						<div className="w-3 h-3 rounded bg-emerald-500" />
						<span className="text-xs text-muted-foreground">Net Income</span>
					</div>
				</div>
			</div>
		</BlurFade>
	)
}
