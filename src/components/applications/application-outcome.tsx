"use client";

import { CheckCircle2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { Alert, AlertDescription, AlertTitle } from "#components/ui/alert";

/**
 * What the applicant sees once a submit resolves — UI-SPEC A-5 states 4, 5 and
 * 6, and the A-7 copy for each.
 *
 * Split out of `rental-application-form.tsx` for the 300-line ceiling
 * (CLAUDE.md), and it is a coherent seam rather than an arbitrary cut: nothing
 * here touches form state, and every string here is outcome copy.
 *
 * THE CONFIRMATION SHOWS NOTHING THE APPLICANT SUBMITTED, AND OFFERS NO COPY,
 * PRINT OR DOWNLOAD OF IT. Re-displaying name, email, phone, address and income
 * on a device that may well be a library terminal is an unforced disclosure,
 * and a "print your application" affordance would also need a print stylesheet
 * nothing else in this phase needs.
 *
 * NEITHER FAILURE STATE ACCUSES THE APPLICANT, AND NEITHER IS DESTRUCTIVE-RED.
 * A couple applying from one household NATs to a single address and a library
 * NATs dozens, so "too many requests", "blocked" and "suspicious activity" are
 * all factually wrong here as well as rude. The form stays intact behind these
 * notices and the submit control stays live (D-04b).
 */

/**
 * UI-SPEC A-7, held as constants so the E2E snapshot and the render agree.
 *
 * ONE DELIBERATE DIVERGENCE FROM THE COPY DECK. A-7's capped body names a short
 * retry interval, a couple of orders of magnitude below the real one. It is not
 * true of what shipped:
 * `apply-token`'s address-keyed limiter runs on a one-HOUR window, and the
 * per-link cap does not reopen at all, so an applicant who waits the promised
 * interval is told exactly the same thing again. The repo's own marketing-copy
 * guard independently bans that wording as an undocumented response-time
 * commitment, which is the same objection arriving from the other direction —
 * and it is a whole-file scan, so this note describes the wording rather than
 * quoting it. The reassurance the sentence exists to carry, that nothing typed
 * is gone, is kept verbatim; only the invented interval is removed.
 */
const NOTICE_COPY = {
	capped: {
		title: "This listing is busy right now",
		body: "Nothing you typed has been lost. Please wait a while and submit again.",
	},
	failed: {
		title: "We could not submit your application",
		body: "Check your connection and try again. Nothing you typed has been lost.",
	},
} as const;

const VALIDATION_BODY =
	"Check the highlighted fields above, then submit again.";

export type SubmitNotice =
	| { kind: "invalid"; count: number }
	| { kind: "capped" }
	| { kind: "failed" };

export function ApplicationConfirmation({
	propertyLabel,
	unitLabel,
}: {
	propertyLabel: string | null;
	unitLabel: string | null;
}) {
	const headingRef = useRef<HTMLHeadingElement>(null);
	// A-5 state 4: the card content is replaced in place, so without moving
	// focus a screen-reader user is left on a control that no longer exists and
	// a sighted user is left scrolled to the bottom of a form that is gone.
	useEffect(() => {
		headingRef.current?.focus();
		window.scrollTo({ top: 0 });
	}, []);

	const listing =
		propertyLabel === null
			? "The property owner"
			: unitLabel === null
				? propertyLabel
				: `${propertyLabel}, Unit ${unitLabel}`;

	return (
		<div role="status" className="flex flex-col gap-3">
			{/* text-success sits on the ICON and only the icon: a vivid token on a
			    text run fails WCAG AA in one theme or the other. */}
			<CheckCircle2 className="size-5 text-success" aria-hidden="true" />
			<h2
				ref={headingRef}
				tabIndex={-1}
				className="text-base font-semibold text-foreground"
			>
				Application received
			</h2>
			{/* mb-0 on all three: each <p> is a flex item of the gap-3 column, so
			    the base bottom margin is added to the item's height (D-3). */}
			<p className="mb-0 text-sm text-muted-foreground">
				{listing} has your application. The owner will contact you directly if
				they would like to move forward.
			</p>
			<p className="mb-0 text-sm text-muted-foreground">
				We will not email you about this application, and there is no status
				page to check. TenantFlow does not make rental decisions.
			</p>
			<p className="mb-0 text-sm text-muted-foreground">
				You can close this page.
			</p>
		</div>
	);
}

export function SubmitNoticeAlert({ notice }: { notice: SubmitNotice }) {
	if (notice.kind === "invalid") {
		return (
			<Alert variant="destructive">
				<AlertTitle>
					{notice.count === 1
						? "1 answer needs your attention"
						: `${notice.count} answers need your attention`}
				</AlertTitle>
				<AlertDescription>{VALIDATION_BODY}</AlertDescription>
			</Alert>
		);
	}
	// DEFAULT variant, never destructive: the form is intact, the submit control
	// is still live, and nothing the applicant did was wrong.
	const copy = NOTICE_COPY[notice.kind];
	return (
		<Alert>
			<AlertTitle>{copy.title}</AlertTitle>
			<AlertDescription>{copy.body}</AlertDescription>
		</Alert>
	);
}
