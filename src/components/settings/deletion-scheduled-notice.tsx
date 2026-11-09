import { Clock } from "lucide-react";
import { formatCount } from "#lib/formatters/count";

const GRACE_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

function deletionDate(deletionRequestedAt: string): Date {
	return new Date(new Date(deletionRequestedAt).getTime() + GRACE_PERIOD_MS);
}

/**
 * What an account-deletion request does, as both Danger Zones say it
 * (`AccountDataSection` and `GdprDataActions`). Read from the database
 * functions (66.2-39 fix round 4, Part 8i): `request_account_deletion()` only
 * stamps `users.deletion_requested_at`. The nightly
 * `process_account_deletions()` runs `anonymize_deleted_user()` once the
 * request is 30 days old, and that raises, so the job retries the next night,
 * while any lease is active. It clears the profile's name, email, phone and
 * avatar link, marks the owner's properties inactive, and deletes the
 * notifications (and their archive), notification preferences and settings,
 * and rental applications (and their links). Leases, tenants, expenses, the
 * rent ledger, the owner's emergency contact and the sign-in (`auth.users`)
 * are kept. `account-deletion-claims.test.tsx` holds each sentence to the SQL.
 */
export const ACCOUNT_DELETION_COPY = {
	intro:
		"Request deletion of your account. It runs after 30 days, and you can cancel until then.",
	confirmTitle: "This schedules your account for deletion in 30 days.",
	confirmBody:
		"Then your name, email, phone and photo are removed from your profile, your properties are marked inactive, and your notifications and rental applications are deleted. Your leases, tenants, expenses and rent records are kept, and so are your sign-in and emergency contact. If a lease is still active then, deletion waits until none is. You can cancel until it runs.",
} as const;

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
 *
 * The date is when the job may first run, not when it does: it runs the
 * first night after it, and waits while a lease is active. Past that date
 * the notice says the deletion is due rather than counting negative days
 * (Part 8i).
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
	const date = (
		<strong>
			{deleteDate.toLocaleDateString("en-US", {
				year: "numeric",
				month: "long",
				day: "numeric",
			})}
		</strong>
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
					{daysLeft > 0 ? (
						<>
							Deletion runs on or after {date}, in{" "}
							<strong>{formatCount(daysLeft, "day")}</strong>. If a lease is
							still active then, it waits until none is.
						</>
					) : (
						<>
							Deletion was due on {date}. It runs on the first night no lease is
							active.
						</>
					)}{" "}
					You can cancel until it runs.
				</p>
			</div>
		</div>
	);
}
