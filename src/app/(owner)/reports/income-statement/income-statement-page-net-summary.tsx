import { BlurFade } from "#components/ui/blur-fade";
import { formatCurrency } from "#lib/utils/currency";

interface IncomeStatementPageNetSummaryProps {
	totalRevenue: number;
	totalExpenses: number;
	netIncome: number;
}

export function IncomeStatementPageNetSummary({
	totalRevenue,
	totalExpenses,
	netIncome,
}: IncomeStatementPageNetSummaryProps) {
	return (
		<BlurFade delay={0.4}>
			<div className="bg-card border border-border rounded-lg p-6">
				<h3 className="font-medium text-foreground mb-4">Net Income Summary</h3>
				<div className="space-y-3">
					<div className="flex justify-between py-2 border-b border-border">
						<span className="text-sm text-foreground">Total Revenue</span>
						<span className="text-sm font-medium text-success-text tabular-nums">
							{formatCurrency(totalRevenue)}
						</span>
					</div>
					<div className="flex justify-between py-2 border-b border-border">
						<span className="text-sm text-foreground">
							Total Operating Expenses
						</span>
						<span className="text-sm font-medium text-destructive-text tabular-nums">
							-{formatCurrency(totalExpenses)}
						</span>
					</div>
				</div>
				<div className="flex items-center justify-between p-4 mt-4 bg-primary/5 rounded-lg">
					<span className="font-medium text-foreground">Net Income</span>
					<span
						className={`text-xl font-bold tabular-nums ${netIncome >= 0 ? "text-success-text" : "text-destructive-text"}`}
					>
						{netIncome >= 0 ? "+" : ""}
						{formatCurrency(netIncome)}
					</span>
				</div>
			</div>
		</BlurFade>
	);
}
