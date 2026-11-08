import { Clock } from "lucide-react";
import { formatCount } from "#lib/formatters/count";

const GRACE_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

function deletionDate(deletionRequestedAt: string): Date {
	return new Date(new Date(deletionRequestedAt).getTime() + GRACE_PERIOD_MS);
}

/**
 * The "Account scheduled for deletion" notice, shared by the Data tab's
 * Danger Zone (`AccountDataSection`) and the canceled-subscription section's
 * inline Danger Zone (`GdprDataActions`), which rendered it twice in
 * identical markup (66.2-39 fix round 4, G28/G29).
 *
 * `mb-0` on both lines: the text is a flex item of the notice, so the
 * `@layer base` `p` margin (`margin-bottom: 1rem`) set the two lines 16px
 * apart where `mt-1` declares 4 and stood 16px more inside the box below
 * them than above (33 against 17).
 */
export function DeletionScheduledNotice({
	deletionRequestedAt,
}: {
	deletionRequestedAt: string;
}) {
	const deleteDate = deletionDate(deletionRequestedAt);
	const daysLeft = Math.ceil(
		(deleteDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
	);
	return (
		<div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 p-4">
			<Clock
				className="h-5 w-5 text-warning-text mt-0.5 shrink-0"
				aria-hidden="true"
			/>
			<div>
				<p className="mb-0 text-sm font-medium text-warning-text">
					Account scheduled for deletion
				</p>
				<p className="mt-1 mb-0 text-sm text-muted-foreground">
					Your account will be permanently deleted on{" "}
					<strong>
						{deleteDate.toLocaleDateString("en-US", {
							year: "numeric",
							month: "long",
							day: "numeric",
						})}
					</strong>
					. You have <strong>{formatCount(daysLeft, "day")}</strong> remaining
					to cancel.
				</p>
			</div>
		</div>
	);
}
