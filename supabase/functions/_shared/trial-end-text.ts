/**
 * The trial-ending email's subject and opening line, as pure functions
 * (66.2-39 fix round 4, Part 8o).
 *
 * A dependency-free leaf, like `tier-gate-decision.ts`: no import statement
 * and no runtime global, so `__tests__/billing-email-claims.test.ts` imports
 * and runs it under Vitest. The handler
 * (`stripe-webhooks/handlers/customer-subscription-trial-will-end.ts`) reads
 * Deno's env and cannot be imported from Node. Do not add an import here.
 *
 * Stripe sends `customer.subscription.trial_will_end` three days before a
 * trial ends, at once when less time is left (stripe-checkout's carry-over
 * trial can start with 48 to 72 hours left), and at once when a trial is ended
 * early (`trial_end=now`, or a Customer Portal plan change). So:
 *
 * - the subject names the end instead of "in 3 days", which was false for
 *   every send with less time left;
 * - with no `trial_end` the line reads "is ending", not "ends on in 3 days";
 * - the end is named as a date and time in UTC, with the zone written out.
 *   The function cannot know the owner's time zone, and a date alone, worked
 *   out in the Edge runtime's UTC, read as the day after for a US owner whose
 *   trial ends in the evening. "2:13 AM UTC" names one instant whatever the
 *   reader's zone. It is built from the UTC fields, not `toLocaleString`,
 *   whose separators and spaces vary with the runtime's ICU version (newer
 *   ones put U+202F before "AM");
 * - a trial that is over (the subscription no longer `trialing`, or its end
 *   already past) gets no email: there is nothing left to warn about, and
 *   "ends on <a past time>" would be false.
 */

const MONTHS = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
] as const;

/** The end as "November 13, 2026, at 2:13 AM UTC" (`trialEnd` in Unix seconds). */
function formatTrialEnd(trialEnd: number): string {
	const date = new Date(trialEnd * 1000);
	const hours = date.getUTCHours();
	const hour12 = hours % 12 === 0 ? 12 : hours % 12;
	const minutes = String(date.getUTCMinutes()).padStart(2, "0");
	const meridiem = hours < 12 ? "AM" : "PM";
	return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}, at ${hour12}:${minutes} ${meridiem} UTC`;
}

/** The email's subject and its first line after the greeting. */
export function trialEndCopy(trialEnd: number | null): {
	subject: string;
	lead: string;
} {
	if (trialEnd === null) {
		return {
			subject: "Your TenantFlow trial is ending",
			lead: "Your TenantFlow trial is ending.",
		};
	}
	const end = formatTrialEnd(trialEnd);
	return {
		subject: `Your TenantFlow trial ends on ${end}`,
		lead: `Your TenantFlow trial ends on ${end}.`,
	};
}

/** Whether the trial is still running at `nowMs`, so the email has something to warn about. */
export function trialIsStillRunning(
	status: string,
	trialEnd: number | null,
	nowMs: number,
): boolean {
	if (status !== "trialing") return false;
	return trialEnd === null || trialEnd * 1000 > nowMs;
}
