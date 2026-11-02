import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { BlurFade } from "#components/ui/blur-fade";
import { formatCurrency } from "#lib/utils/currency";
import type { CashFlowCategory } from "#types/financial-statements";

interface CashFlowBreakdownProps {
	inflowItems: CashFlowCategory[];
	outflowItems: CashFlowCategory[];
	totalInflows: number;
	totalOutflows: number;
}

export function CashFlowBreakdown({
	inflowItems,
	outflowItems,
	totalInflows,
	totalOutflows,
}: CashFlowBreakdownProps) {
	return (
		<BlurFade delay={0.35}>
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
				{/* Cash Inflows */}
				<div className="bg-card border border-border rounded-lg p-6">
					<h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
						<ArrowUpCircle className="w-4 h-4 text-success-text" />
						Cash Inflows
					</h3>
					<div className="space-y-4">
						{inflowItems.map((item) => (
							<div key={item.category}>
								<div className="flex items-center justify-between mb-1">
									<span className="text-sm text-foreground">
										{item.category}
									</span>
									<div className="flex items-center gap-3">
										<span className="text-sm text-muted-foreground">
											{item.percentage.toFixed(1)}%
										</span>
										<span className="text-sm font-medium text-success-text tabular-nums">
											{formatCurrency(item.amount)}
										</span>
									</div>
								</div>
								<div className="h-2 bg-muted rounded-full overflow-hidden">
									<div
										className="h-full bg-success-text rounded-full transition-all duration-500"
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
							<span className="text-sm font-semibold text-success-text tabular-nums">
								{formatCurrency(totalInflows)}
							</span>
						</div>
					</div>
				</div>

				{/* Cash Outflows */}
				<div className="bg-card border border-border rounded-lg p-6">
					<h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
						<ArrowDownCircle className="w-4 h-4 text-destructive-text" />
						Cash Outflows
					</h3>
					<div className="space-y-4">
						{outflowItems.map((item) => (
							<div key={item.category}>
								<div className="flex items-center justify-between mb-1">
									<span className="text-sm text-foreground">
										{item.category}
									</span>
									<div className="flex items-center gap-3">
										<span className="text-sm text-muted-foreground">
											{item.percentage.toFixed(1)}%
										</span>
										<span className="text-sm font-medium text-destructive-text tabular-nums">
											{formatCurrency(item.amount)}
										</span>
									</div>
								</div>
								<div className="h-2 bg-muted rounded-full overflow-hidden">
									<div
										className="h-full bg-destructive-text rounded-full transition-all duration-500"
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
							<span className="text-sm font-semibold text-destructive-text tabular-nums">
								{formatCurrency(totalOutflows)}
							</span>
						</div>
					</div>
				</div>
			</div>
		</BlurFade>
	);
}
