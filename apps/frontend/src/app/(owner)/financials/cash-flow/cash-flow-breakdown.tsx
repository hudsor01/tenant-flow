import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import { formatCents } from '#lib/formatters/currency'

interface FlowItem {
	category: string
	amount: number
	percentage: number
}

interface CashFlowBreakdownProps {
	inflowItems: FlowItem[]
	outflowItems: FlowItem[]
	totalInflows: number
	totalOutflows: number
}

export function CashFlowBreakdown({
	inflowItems,
	outflowItems,
	totalInflows,
	totalOutflows
}: CashFlowBreakdownProps) {
	return (
		<BlurFade delay={0.35} inView>
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
				{/* Cash Inflows */}
				<div className="bg-card border border-border rounded-lg p-6">
					<h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
						<ArrowUpCircle className="w-4 h-4 text-emerald-600" />
						Cash Inflows
					</h3>
					<div className="space-y-4">
						{inflowItems.map(item => (
							<div key={item.category}>
								<div className="flex items-center justify-between mb-1">
									<span className="text-sm text-foreground">
										{item.category}
									</span>
									<div className="flex items-center gap-3">
										<span className="text-sm text-muted-foreground">
											{item.percentage.toFixed(1)}%
										</span>
										<span className="text-sm font-medium text-emerald-600 tabular-nums">
											{formatCents(item.amount * 100)}
										</span>
									</div>
								</div>
								<div className="h-2 bg-muted rounded-full overflow-hidden">
									<div
										className="h-full bg-emerald-500 rounded-full transition-all duration-500"
										style={{ width: `${item.percentage}%` }}
									/>
								</div>
							</div>
						))}
						{inflowItems.length === 0 && (
							<p className="text-sm text-muted-foreground text-center py-4">
								No inflows for this period
							</p>
						)}
						<div className="flex items-center justify-between pt-4 border-t border-border">
							<span className="text-sm font-medium text-foreground">
								Total Inflows
							</span>
							<span className="text-sm font-semibold text-emerald-600 tabular-nums">
								{formatCents(totalInflows * 100)}
							</span>
						</div>
					</div>
				</div>

				{/* Cash Outflows */}
				<div className="bg-card border border-border rounded-lg p-6">
					<h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
						<ArrowDownCircle className="w-4 h-4 text-red-600" />
						Cash Outflows
					</h3>
					<div className="space-y-4">
						{outflowItems.map(item => (
							<div key={item.category}>
								<div className="flex items-center justify-between mb-1">
									<span className="text-sm text-foreground">
										{item.category}
									</span>
									<div className="flex items-center gap-3">
										<span className="text-sm text-muted-foreground">
											{item.percentage.toFixed(1)}%
										</span>
										<span className="text-sm font-medium text-red-600 tabular-nums">
											{formatCents(item.amount * 100)}
										</span>
									</div>
								</div>
								<div className="h-2 bg-muted rounded-full overflow-hidden">
									<div
										className="h-full bg-red-500 rounded-full transition-all duration-500"
										style={{ width: `${item.percentage}%` }}
									/>
								</div>
							</div>
						))}
						{outflowItems.length === 0 && (
							<p className="text-sm text-muted-foreground text-center py-4">
								No outflows for this period
							</p>
						)}
						<div className="flex items-center justify-between pt-4 border-t border-border">
							<span className="text-sm font-medium text-foreground">
								Total Outflows
							</span>
							<span className="text-sm font-semibold text-red-600 tabular-nums">
								{formatCents(totalOutflows * 100)}
							</span>
						</div>
					</div>
				</div>
			</div>
		</BlurFade>
	)
}
