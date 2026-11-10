import { Calendar, ClipboardList, FileText } from "lucide-react";
import { CardLayout } from "#components/ui/card-layout";
import { readMoveOutReason } from "#lib/constants/status-types";
import { formatDate, parseLocalYmd } from "#lib/formatters/date";

interface MoveOutRecordProps {
	/** `tenants.move_out_date`, a date-only value (YYYY-MM-DD). */
	date: string | null;
	/** `tenants.move_out_reason`: the reason's slug, or `slug: notes`. */
	reason: string | null;
}

/**
 * The day as the page's other dates read ("July 7, 2026"), parsed in the
 * owner's own zone; a value that is no date shows as written.
 */
function formatMoveOutDate(date: string): string {
	const parsed = parseLocalYmd(date);
	return parsed
		? formatDate(parsed, {
				formatOptions: { year: "numeric", month: "long", day: "numeric" },
			})
		: date;
}

/**
 * What "Mark as moved out" saved on the tenant: the date, the reason's label
 * and the notes, each when set. Nothing renders when neither column is set.
 */
export function MoveOutRecord({ date, reason }: MoveOutRecordProps) {
	if (!date && !reason) return null;
	const read = reason ? readMoveOutReason(reason) : null;

	return (
		<CardLayout
			title="Move-Out"
			description="Saved when this tenant was marked as moved out"
			className="@container/tenant-move-out"
		>
			<div className="grid grid-cols-1 gap-4 @min-[30rem]/tenant-move-out:grid-cols-2">
				{date && (
					<div className="space-y-1">
						<div className="text-muted-foreground flex items-center gap-2">
							<Calendar className="size-4" />
							Move-Out Date
						</div>
						<div className="font-medium wrap-break-word">
							{formatMoveOutDate(date)}
						</div>
					</div>
				)}

				{read && (
					<div className="space-y-1">
						<div className="text-muted-foreground flex items-center gap-2">
							<ClipboardList className="size-4" />
							Reason
						</div>
						<div className="font-medium whitespace-pre-wrap wrap-break-word">
							{read.label}
						</div>
					</div>
				)}
			</div>

			{read?.notes && (
				<div className="space-y-1 pt-4 border-t">
					<div className="text-muted-foreground flex items-center gap-2">
						<FileText className="size-4" />
						Notes
					</div>
					<div className="font-medium whitespace-pre-wrap wrap-break-word">
						{read.notes}
					</div>
				</div>
			)}
		</CardLayout>
	);
}
