"use client";

/**
 * The decline dialog — UI-SPEC §B-7 / UI-16 (APPLY-03).
 *
 * NOT A BARREL FILE. Everything below is declared here and nothing is
 * re-exported (CLAUDE.md zero-tolerance rule 2).
 *
 * IT ADDS NO DATA ACCESS OF ITS OWN. The single write goes through plan 66-09's
 * `setApplicationStatusMutationOptions`, which wraps the `set_application_status`
 * RPC. There is no `.update()` alternative to reach for: plan 66-01 ships a
 * SELECT policy and a DELETE policy on `rental_applications` and nothing else,
 * so a direct table update typechecks and then fails at runtime with no policy
 * to satisfy.
 *
 * WHY THIS IS A `Dialog` AND NOT THE SHARED `ConfirmDialog`. A confirm surface
 * asks a yes/no question; this one has to CAPTURE something. The reason is the
 * part of the record that outlives the applicant: the 730-day sweep clears every
 * applicant field and `owner_notes` with it, and the closed-vocabulary
 * `disposition_reason` is what remains for the landlord to show why a decision
 * was made (D-11d). A confirm dialog has nowhere to put it.
 *
 * THE REASON LIST IS CLOSED, AND THAT IS THE WHOLE POINT. `DISPOSITION_REASONS`
 * is imported, never re-typed here. A local copy would drift from
 * `rental_applications_disposition_reason_check` and reach the owner as an
 * opaque 23514 naming a constraint they have never heard of. A free-text box
 * here would be worse than either: it would be applicant PII living in the one
 * column the anonymize sweep deliberately preserves, which is precisely the data
 * the sweep exists to remove and would then be unable to.
 *
 * NO RED, ANYWHERE, INCLUDING IN THIS PROSE. UI-16 and UI-13: declining is
 * reversible (the status can be moved back), it deletes nothing, and it sends
 * the applicant nothing at all (D-10). Red styling on a fair-housing-regulated
 * decision surface reads as a judgment about the person rather than as a state
 * change. This plan's acceptance gate for this file is a zero-occurrence grep
 * for that variant's name, and grep reads comments too (66-09 Pattern 1) — which
 * is why the name is spelled nowhere above.
 *
 * THE CONFIRM STAYS DISABLED UNTIL A REASON IS CHOSEN. The RPC also rejects a
 * null reason, but relying on that turns a missing UI affordance into a server
 * error toast: the owner clicks a button that looks ready, waits for a round
 * trip, and is told something failed. The disabled state says the same thing
 * before the click.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "#components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#components/ui/select";
import { setApplicationStatusMutationOptions } from "#hooks/api/query-keys/application-keys";
import {
	DISPOSITION_REASONS,
	type DispositionReasonValue,
} from "#lib/applications/application-copy";

/**
 * §B-7, verbatim. The body sentence names the two facts an owner needs before
 * choosing: the reason is stored, and it survives the removal of the applicant's
 * details.
 */
const DECLINE_COPY = {
	title: "Decline this application",
	body: "Choose a reason. This is stored with the application and is kept after applicant details are removed, so you can show why a decision was made.",
	/**
	 * The trigger on the detail page reads the short `Decline`; the button that
	 * COMMITS the change names the object. The asymmetry is a recorded §B-8
	 * decision, not an oversight — the trigger sits beside "Approve and open
	 * tenant form" on one application's page, so its object is unambiguous, while
	 * this button is the last thing read before a durable record changes.
	 */
	confirm: "Decline application",
} as const;

/**
 * Radix's `onValueChange` hands back a bare `string`. Narrowing it against the
 * same array the options were rendered from means an unrecognised value fails
 * closed to "nothing chosen" — which keeps the confirm disabled — instead of
 * being cast into the RPC argument and raising `invalid decline reason` there.
 *
 * `""` is the no-selection state, not a sentinel item: Radix shows the
 * `SelectValue` placeholder for `""` exactly as it does for `undefined`, and an
 * `undefined` on a controlled `value` prop is a compile error under
 * `exactOptionalPropertyTypes`.
 */
function toDispositionReason(value: string): DispositionReasonValue | "" {
	return (
		DISPOSITION_REASONS.find((entry) => entry.value === value)?.value ?? ""
	);
}

export function ApplicationDeclineDialog({
	applicationId,
	open,
	onOpenChange,
}: {
	applicationId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const queryClient = useQueryClient();
	const [reason, setReason] = useState<DispositionReasonValue | "">("");

	const setStatus = useMutation({
		...setApplicationStatusMutationOptions(queryClient),
		onError: () => {
			// Nothing is read off the error object. `handlePostgrestError` captures
			// to Sentry and rethrows without a toast, so this copy is the entire
			// user-facing surface and anything read from the driver would put a
			// PostgREST code in front of a landlord.
			toast.error("Couldn't decline this application. Try again.");
		},
	});

	const handleOpenChange = (next: boolean) => {
		// A dismissed dialog forgets its choice. Reopening it pre-armed with a
		// reason the owner backed out of is one Enter key from a recorded decision
		// they did not make.
		if (!next) setReason("");
		onOpenChange(next);
	};

	const handleConfirm = () => {
		if (reason === "") return;
		setStatus.mutate(
			{ applicationId, status: "rejected", dispositionReason: reason },
			{
				// The per-call callback runs ALONGSIDE the factory's own onSuccess, so
				// plan 66-09's invalidation of `applicationKeys.all` and
				// `ownerDashboardKeys.all` still fires.
				onSuccess: () => {
					toast.success("Application declined");
					handleOpenChange(false);
				},
			},
		);
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{DECLINE_COPY.title}</DialogTitle>
					<DialogDescription>{DECLINE_COPY.body}</DialogDescription>
				</DialogHeader>

				<Select
					value={reason}
					onValueChange={(next) => setReason(toDispositionReason(next))}
				>
					{/*
					 * `aria-label`, not a visible label: the trigger's own value is the
					 * label at rest, and a control with no accessible name is a blocking
					 * a11y violation (CLAUDE.md).
					 */}
					<SelectTrigger aria-label="Reason" className="w-full">
						<SelectValue placeholder="Choose a reason" />
					</SelectTrigger>
					<SelectContent>
						{DISPOSITION_REASONS.map((entry) => (
							<SelectItem key={entry.value} value={entry.value}>
								{entry.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<DialogFooter>
					<Button
						variant="outline"
						disabled={setStatus.isPending}
						onClick={() => handleOpenChange(false)}
					>
						Cancel
					</Button>
					{/*
					 * Default variant. See the file header: the red variant is forbidden
					 * on this control by UI-16, and this plan gates the file on a
					 * zero-occurrence grep for its name.
					 */}
					<Button
						disabled={reason === "" || setStatus.isPending}
						onClick={handleConfirm}
					>
						{DECLINE_COPY.confirm}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
