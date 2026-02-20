import { ArrowRight } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import { formatCents } from '#lib/formatters/currency'

interface CashFlowBalanceSummaryProps {
	openingBalance: number
	netCashFlow: number
	closingBalance: number
}

export function CashFlowBalanceSummary({
	openingBalance,
	netCashFlow,
	closingBalance
}: CashFlowBalanceSummaryProps) {
	return (
		<BlurFade delay={0.15} inView>
			<div className="bg-card border border-border rounded-lg p-6 mb-8">
				<div className="flex flex-col md:flex-row items-center justify-between gap-6">
					<div className="flex-1 text-center">
						<p className="text-sm text-muted-foreground mb-1">
							Opening Balance
						</p>
						<p className="text-2xl font-semibold tabular-nums">
							{formatCents(openingBalance * 100)}
						</p>
					</div>
					<ArrowRight className="w-6 h-6 text-muted-foreground hidden md:block" />
					<div className="flex-1 text-center">
						<p className="text-sm text-muted-foreground mb-1">Net Cash Flow</p>
						<p
							className={`text-2xl font-semibold tabular-nums ${netCashFlow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
						>
							{netCashFlow >= 0 ? '+' : ''}
							{formatCents(netCashFlow * 100)}
						</p>
					</div>
					<ArrowRight className="w-6 h-6 text-muted-foreground hidden md:block" />
					<div className="flex-1 text-center">
						<p className="text-sm text-muted-foreground mb-1">
							Closing Balance
						</p>
						<p className="text-2xl font-semibold tabular-nums">
							{formatCents(closingBalance * 100)}
						</p>
					</div>
				</div>
			</div>
		</BlurFade>
	)
}
