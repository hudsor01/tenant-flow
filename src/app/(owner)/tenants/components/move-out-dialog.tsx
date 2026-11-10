import { Button } from "#components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#components/ui/dialog";
import { Input } from "#components/ui/input";
import { Label } from "#components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#components/ui/select";
import { Textarea } from "#components/ui/textarea";
import {
	MOVE_OUT_NOTES_MAX_LENGTH,
	MOVE_OUT_REASON_LABELS,
} from "#lib/constants/status-types";
import { pluralNoun } from "#lib/formatters/count";

interface MoveOutDialogProps {
	/** The tenant the confirmation names. */
	tenantName: string | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	moveOutDate: string;
	onMoveOutDateChange: (value: string) => void;
	moveOutReason: string;
	onMoveOutReasonChange: (value: string) => void;
	additionalNotes: string;
	onAdditionalNotesChange: (value: string) => void;
	isPending: boolean;
	onSubmit: () => void;
}

export function MoveOutDialog({
	open,
	onOpenChange,
	moveOutDate,
	onMoveOutDateChange,
	moveOutReason,
	onMoveOutReasonChange,
	additionalNotes,
	onAdditionalNotesChange,
	isPending,
	onSubmit,
	tenantName,
}: MoveOutDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						{tenantName
							? `Mark ${tenantName} as moved out?`
							: "Mark this tenant as moved out?"}
					</DialogTitle>
					{/* One UPDATE: the status becomes moved_out and the date and
					    reason (`slug` or `slug: notes`) are saved on the tenant,
					    whose page shows them; the tenant lists show the tenant
					    (they hide only 'inactive'), and the leases are untouched. */}
					<DialogDescription className="mb-0">
						This changes the tenant's status to Moved out and saves the date,
						reason and notes on their page. They stay in your tenant list, and
						their leases are kept.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<div className="space-y-2">
						<Label htmlFor="moveOutDate">Move Out Date *</Label>
						<Input
							id="moveOutDate"
							type="date"
							value={moveOutDate}
							onChange={(e) => onMoveOutDateChange(e.target.value)}
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="moveOutReason">Reason *</Label>
						<Select value={moveOutReason} onValueChange={onMoveOutReasonChange}>
							<SelectTrigger id="moveOutReason">
								<SelectValue placeholder="Select reason" />
							</SelectTrigger>
							<SelectContent>
								{Object.entries(MOVE_OUT_REASON_LABELS).map(([slug, label]) => (
									<SelectItem key={slug} value={slug}>
										{label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label htmlFor="additionalNotes">Additional Notes (Optional)</Label>
						<Textarea
							id="additionalNotes"
							value={additionalNotes}
							onChange={(e) => onAdditionalNotesChange(e.target.value)}
							placeholder="Any additional details..."
							rows={3}
							maxLength={MOVE_OUT_NOTES_MAX_LENGTH}
							aria-describedby="additionalNotesHint"
						/>
						<p
							id="additionalNotesHint"
							className="mb-0 text-xs text-muted-foreground"
						>
							Up to {MOVE_OUT_NOTES_MAX_LENGTH.toLocaleString("en-US")}{" "}
							{pluralNoun(MOVE_OUT_NOTES_MAX_LENGTH, "character")}.
						</p>
					</div>
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isPending}
					>
						Cancel
					</Button>
					<Button
						onClick={onSubmit}
						disabled={isPending || !moveOutDate || !moveOutReason}
					>
						{isPending ? "Processing..." : "Mark as Moved Out"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
