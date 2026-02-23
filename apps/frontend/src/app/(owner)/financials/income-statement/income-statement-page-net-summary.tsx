import { BlurFade } from '#components/ui/blur-fade'
import { formatCents } from '#lib/formatters/currency'

interface PreviousPeriod {
	netIncome: number
	changePercent: number
}

interface IncomeStatementPageNetSummaryProps {
	totalRevenue: number
	totalExpenses: number
	netIncome: number
	grossProfit?: number | undefined
	operatingIncome?: number | undefined
	previousPeriod?: PreviousPeriod | undefined
}

export function IncomeStatementPageNetSummary({
	totalRevenue,
	totalExpenses,
	netIncome,
	grossProfit,
	operatingIncome,
	previousPeriod
}: IncomeStatementPageNetSummaryProps) {
	return (
		<BlurFade delay={0.4} inView>
			<div className="bg-card border border-border rounded-lg p-6">
				<h3 className="font-medium text-foreground mb-4">
					Net Income Summary
				</h3>
				<div className="space-y-3">
					<div className="flex justify-between py-2 border-b border-border">
						<span className="text-sm text-foreground">Total Revenue</span>
						<span className="text-sm font-medium text-emerald-600 tabular-nums">
							{formatCents(totalRevenue * 100)}
						</span>
					</div>
					<div className="flex justify-between py-2 border-b border-border">
						<span className="text-sm text-foreground">
							Total Operating Expenses
						</span>
						<span className="text-sm font-medium text-red-600 tabular-nums">
							-{formatCents(totalExpenses * 100)}
						</span>
					</div>
					{grossProfit !== undefined && (
						<div className="flex justify-between py-2 border-b border-border">
							<span className="text-sm text-foreground">Gross Profit</span>
							<span className="text-sm font-medium text-foreground tabular-nums">
								{formatCents((grossProfit || 0) * 100)}
							</span>
						</div>
					)}
					{operatingIncome !== undefined && (
						<div className="flex justify-between py-2 border-b border-border">
							<span className="text-sm text-foreground">Operating Income</span>
							<span className="text-sm font-medium text-foreground tabular-nums">
								{formatCents((operatingIncome || 0) * 100)}
							</span>
						</div>
					)}
				</div>
				<div className="flex items-center justify-between p-4 mt-4 bg-primary/5 rounded-lg">
					<span className="font-medium text-foreground">Net Income</span>
					<span
						className={`text-xl font-bold tabular-nums ${netIncome >= 0 ? 'text-emerald-600' : 'text-destructive'}`}
					>
						{netIncome >= 0 ? '+' : ''}
						{formatCents(netIncome * 100)}
					</span>
				</div>
				{previousPeriod && (
					<div className="mt-4 p-4 bg-muted/50 rounded-lg">
						<p className="text-xs text-muted-foreground mb-2">
							Period Comparison
						</p>
						<div className="flex items-center gap-2">
							<span className="text-sm text-foreground">Previous Period:</span>
							<span className="text-sm font-medium tabular-nums">
								{formatCents(previousPeriod.netIncome * 100)}
							</span>
							<span
								className={`text-sm font-medium ${previousPeriod.changePercent >= 0 ? 'text-emerald-600' : 'text-destructive'}`}
							>
								({previousPeriod.changePercent >= 0 ? '+' : ''}
								{previousPeriod.changePercent.toFixed(1)}%)
							</span>
						</div>
					</div>
				)}
			</div>
		</BlurFade>
	)
}
