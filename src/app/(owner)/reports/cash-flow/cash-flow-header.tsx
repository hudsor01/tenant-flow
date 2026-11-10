import { BlurFade } from "#components/ui/blur-fade";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#components/ui/select";
import { ReportExportButton } from "../report-export-button";

interface CashFlowHeaderProps {
	period: string;
	year: string;
	onPeriodChange: (value: string) => void;
	onYearChange: (value: string) => void;
	onExport: () => void;
	/** Why the export is unavailable right now, or null when it can run. */
	exportUnavailableReason: string | null;
}

export function CashFlowHeader({
	period,
	year,
	onPeriodChange,
	onYearChange,
	onExport,
	exportUnavailableReason,
}: CashFlowHeaderProps) {
	return (
		<BlurFade delay={0.1}>
			<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
				<div>
					<h1 className="typography-h1">Cash Flow</h1>
					<p className="mb-0 text-muted-foreground">
						Track money coming in and going out.
					</p>
				</div>
				{/* Below sm the header stacks and this row spans it: the controls wrap
				    rather than shrink, since a shrunk select clips its value. */}
				<div className="flex flex-wrap gap-2 sm:flex-nowrap">
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
					<ReportExportButton
						onExport={onExport}
						unavailableReason={exportUnavailableReason}
					/>
				</div>
			</div>
		</BlurFade>
	);
}
