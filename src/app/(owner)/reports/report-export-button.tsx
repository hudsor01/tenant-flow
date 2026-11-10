import { Download } from "lucide-react";
import { useId } from "react";
import { UNAVAILABLE_OUTLINE_BUTTON_CLASSES } from "#components/shared/unavailable-outline-button";
import { Button } from "#components/ui/button";

interface ReportExportButtonProps {
	onExport: () => void;
	/** Why the export is unavailable right now, or null when it can run. */
	unavailableReason: string | null;
}

/**
 * The CSV Export control of a report header (cash flow, income statement,
 * balance sheet). aria-disabled, not disabled, keeps the tab stop so the
 * reason stays reachable; while it is set the click is ignored and the
 * outline hover cancelled (UNAVAILABLE_OUTLINE_BUTTON_CLASSES).
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
				className={UNAVAILABLE_OUTLINE_BUTTON_CLASSES}
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
