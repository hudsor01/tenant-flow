import { BlurFade } from '#components/ui/blur-fade'
import { formatCents } from '#lib/formatters/currency'

interface CashFlowActivityProps {
	netOperatingCash: number
	netInvestingCash: number
	netFinancingCash: number
}

export function CashFlowActivity({
	netOperatingCash,
	netInvestingCash,
	netFinancingCash
}: CashFlowActivityProps) {
	return (
		<BlurFade delay={0.4} inView>
			<div className="bg-card border border-border rounded-lg p-6">
				<h3 className="font-medium text-foreground mb-4">
					Cash Flow by Activity
				</h3>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div className="text-center p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
						<p className="text-2xl font-semibold text-emerald-600 tabular-nums">
							{formatCents(netOperatingCash * 100)}
						</p>
						<p className="text-sm text-muted-foreground mt-1">
							Operating Activities
						</p>
					</div>
					<div className="text-center p-4 bg-red-50 dark:bg-red-950/30 rounded-lg">
						<p className="text-2xl font-semibold text-red-600 tabular-nums">
							{formatCents(netInvestingCash * 100)}
						</p>
						<p className="text-sm text-muted-foreground mt-1">
							Investing Activities
						</p>
					</div>
					<div className="text-center p-4 bg-primary/5 rounded-lg">
						<p className="text-2xl font-semibold text-foreground tabular-nums">
							{formatCents(netFinancingCash * 100)}
						</p>
						<p className="text-sm text-muted-foreground mt-1">
							Financing Activities
						</p>
					</div>
				</div>
			</div>
		</BlurFade>
	)
}
