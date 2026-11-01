import { Download } from "lucide-react";
import { BlurFade } from "#components/ui/blur-fade";
import { Button } from "#components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#components/ui/select";

interface IncomeStatementPageHeaderProps {
	period: string;
	year: string;
	onPeriodChange: (value: string) => void;
	onYearChange: (value: string) => void;
}

export function IncomeStatementPageHeader({
	period,
	year,
	onPeriodChange,
	onYearChange,
}: IncomeStatementPageHeaderProps) {
	return (
		<BlurFade delay={0.1}>
			<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
				<div>
					<h1 className="typography-h1">Income Statement</h1>
					<p className="text-muted-foreground">
						Revenue, expenses, and profitability analysis.
					</p>
				</div>
				<div className="flex gap-2">
					{/* Each trigger's name starts with the value it shows, then says
					    what it picks (WCAG 2.5.3; a bare trigger had no name). */}
					<Select value={period} onValueChange={onPeriodChange}>
						<SelectTrigger
							className="w-32.5"
							aria-label={`${period.charAt(0).toUpperCase()}${period.slice(1)} (period)`}
						>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="monthly">Monthly</SelectItem>
							<SelectItem value="quarterly">Quarterly</SelectItem>
							<SelectItem value="yearly">Yearly</SelectItem>
						</SelectContent>
					</Select>
					<Select value={year} onValueChange={onYearChange}>
						<SelectTrigger className="w-25" aria-label={`${year} (year)`}>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{Array.from({ length: 3 }, (_, i) =>
								String(new Date().getFullYear() - i),
							).map((y) => (
								<SelectItem key={y} value={y}>
									{y}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Button variant="outline">
						<Download className="w-4 h-4" />
						Export
					</Button>
				</div>
			</div>
		</BlurFade>
	);
}
