import { Download } from "lucide-react";
import { useId } from "react";
import { Button } from "#components/ui/button";

interface ReportExportButtonProps {
	onExport: () => void;
	/** Why the export is unavailable right now, or null when it can run. */
	unavailableReason: string | null;
}

/**
 * The CSV Export control of a report header (cash flow, income statement,
 * balance sheet). aria-disabled, not disabled, keeps the tab stop so the
 * reason stays reachable; the click is ignored while it is set.
 */
export function ReportExportButton({
	onExport,
	unavailableReason,
}: ReportExportButtonProps) {
	const reasonId = useId();
	const unavailable = unavailableReason !== null;
	return (
		<>
			<Button
				variant="outline"
				onClick={unavailable ? undefined : onExport}
				aria-disabled={unavailable || undefined}
				aria-describedby={unavailable ? reasonId : undefined}
				className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
			>
				<Download aria-hidden="true" />
				Export
			</Button>
			{unavailable ? (
				<span id={reasonId} className="sr-only">
					{unavailableReason}
				</span>
			) : null}
		</>
	);
}
