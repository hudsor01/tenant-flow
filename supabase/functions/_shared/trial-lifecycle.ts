/**
 * Which trial email an owner is due, and what it says, as pure functions.
 *
 * A dependency-free leaf, like `trial-end-text.ts`: no import statement and
 * no runtime global, so `__tests__/trial-lifecycle.test.ts` imports and runs
 * it under Vitest. The `trial-lifecycle` Edge Function reads Deno's env and the
 * database and cannot be imported from Node. Do not add an import here.
 *
 * Why these emails exist: an owner on the database-managed 14-day trial heard
 * nothing from TenantFlow after signing up. `expire_trials()` only flips the
 * status, and the one trial email the app had fires for Stripe-managed trials
 * (`customer.subscription.trial_will_end`), which a trial owner never reaches.
 * Most owners signed in once, on the day they signed up, so the in-app trial
 * banner never reached them either.
 *
 * Every statement in the copy below is held by `trial-lifecycle.test.ts` to
 * the code it describes: the trial's length and limits (`PRICING_PLANS`
 * FREETRIAL), the route that adds a property, the one plans page a lapsed
 * owner can reach, and what the proxy closes when a trial ends.
 */

/** The emails, one per owner each, ever (the send log's unique key). */
export const TRIAL_EMAIL_KINDS = [
	"welcome",
	"add_first_property",
	"trial_ending",
	"trial_ended",
] as const;

export type TrialEmailKind = (typeof TRIAL_EMAIL_KINDS)[number];

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** The trial's length (`set_trial_on_signup`: `trial_ends_at := now() + 14 days`). */
const TRIAL_DAYS = 14;

/** A welcome goes only to an owner who signed up this recently. */
const WELCOME_WINDOW_MS = 2 * DAY_MS;

/** The first-property nudge: from this far into the trial... */
const NUDGE_FROM_MS = 2 * DAY_MS;
/** ...until this far, so it never lands next to the trial-ending email. */
const NUDGE_UNTIL_MS = 7 * DAY_MS;

/** The trial-ending email, this close to the end. */
const ENDING_WINDOW_MS = 3 * DAY_MS;

/** The trial-ended email, at most this long after the end. */
export const ENDED_WINDOW_MS = 7 * DAY_MS;

/** No owner gets two of these emails less than this far apart. */
const MIN_GAP_MS = 20 * HOUR_MS;

/** What the decision reads about one owner. Times are epoch milliseconds. */
export interface TrialOwnerState {
	status: string | null;
	/** A Stripe subscription id means a Stripe-managed trial or a paid plan. */
	subscriptionId: string | null;
	createdAtMs: number;
	trialEndsAtMs: number | null;
	hasProperty: boolean;
	/** The kinds already sent (or claimed) for this owner. */
	sent: ReadonlySet<TrialEmailKind>;
	/** The newest send to this owner, if any. */
	lastSentAtMs: number | null;
}

/**
 * The one email this owner is due at `nowMs`, or null.
 *
 * `launchAtMs` is when these emails started. A welcome goes only to an owner
 * who signed up after it, so turning the job on never welcomes an owner who
 * signed up months ago.
 *
 * Order, most urgent first: ended, ending, welcome, first property. At most one
 * email per run, and none within MIN_GAP_MS of the last one.
 */
export function dueTrialEmail(
	owner: TrialOwnerState,
	nowMs: number,
	launchAtMs: number,
): TrialEmailKind | null {
	// Only the database-managed trial. A Stripe subscription is a Stripe trial
	// (which has its own trial_will_end email) or a paid plan.
	if (owner.subscriptionId !== null) return null;
	if (owner.status !== "trialing" && owner.status !== "expired") return null;
	if (owner.trialEndsAtMs === null) return null;
	if (owner.lastSentAtMs !== null && nowMs - owner.lastSentAtMs < MIN_GAP_MS) {
		return null;
	}

	const untilEnd = owner.trialEndsAtMs - nowMs;
	const trialStartMs = owner.trialEndsAtMs - TRIAL_DAYS * DAY_MS;
	const intoTrial = nowMs - trialStartMs;
	const unsent = (kind: TrialEmailKind) => !owner.sent.has(kind);

	if (untilEnd <= 0) {
		return -untilEnd <= ENDED_WINDOW_MS && unsent("trial_ended")
			? "trial_ended"
			: null;
	}
	if (owner.status !== "trialing") return null;

	if (untilEnd <= ENDING_WINDOW_MS) {
		return unsent("trial_ending") ? "trial_ending" : null;
	}
	if (
		unsent("welcome") &&
		owner.createdAtMs >= launchAtMs &&
		nowMs - owner.createdAtMs <= WELCOME_WINDOW_MS
	) {
		return "welcome";
	}
	if (
		unsent("add_first_property") &&
		!owner.hasProperty &&
		intoTrial >= NUDGE_FROM_MS &&
		intoTrial <= NUDGE_UNTIL_MS
	) {
		return "add_first_property";
	}
	return null;
}

/**
 * Addresses no email is sent to: the reserved test domains (RFC 2606, RFC
 * 6761) and the app's own synthetic test owners. Resend rejects the reserved
 * ones with a 422, which files an error in Sentry for every send.
 */
export function isUndeliverableTestAddress(email: string): boolean {
	const domain = email.trim().toLowerCase().split("@").pop() ?? "";
	return (
		domain === "" ||
		/(^|\.)example\.(com|net|org)$/.test(domain) ||
		/\.(test|invalid|localhost|local|example)$/.test(domain) ||
		domain === "tenantflow.app"
	);
}

/** What an email says. Plain text throughout; the caller escapes and lays it out. */
export interface TrialEmailCopy {
	subject: string;
	preheader: string;
	heading: string;
	paragraphs: string[];
	ctaLabel: string;
	/** Path on the app, joined to the app URL by the caller. */
	ctaPath: string;
	note: string | null;
}

/** The routes the emails link to. */
const ADD_PROPERTY_PATH = "/properties/new";
/** The plans page, which the proxy keeps open to an owner whose trial ended. */
const CHOOSE_PLAN_PATH = "/billing/plans";

/**
 * The copy for one kind. `endText` names the trial's end as
 * `formatTrialEnd` writes it ("December 8, 2026, at 7:52 PM UTC").
 */
export function trialEmailCopy(
	kind: TrialEmailKind,
	firstName: string | null,
	endText: string,
): TrialEmailCopy {
	const hi = `Hi ${firstName?.trim() || "there"},`;
	switch (kind) {
		case "welcome":
			return {
				subject: "Welcome to TenantFlow: start with your first property",
				preheader: "Your 14-day free trial has started. No card is needed.",
				heading: "Welcome to TenantFlow",
				paragraphs: [
					hi,
					"Your 14-day free trial has started. No card is needed.",
					"The quickest way to see how TenantFlow works is to add a property and its units. From there you can add tenants, build a lease from a state template and track rent on the lease's ledger.",
				],
				ctaLabel: "Add your first property",
				ctaPath: ADD_PROPERTY_PATH,
				note: `During the trial you can add one property with up to five units. Your trial ends on ${endText}.`,
			};
		case "add_first_property":
			return {
				subject: "Add your first property to TenantFlow",
				preheader: "A property and its units are the first step.",
				heading: "Your first property is the first step",
				paragraphs: [
					hi,
					"You haven't added a property yet. Units belong to a property, a lease is for one of its units, and each lease keeps its own rent ledger, so the property comes first.",
					"Add the property and its units, then a tenant and their lease.",
				],
				ctaLabel: "Add your first property",
				ctaPath: ADD_PROPERTY_PATH,
				note: `During the trial you can add one property with up to five units. Your trial ends on ${endText}.`,
			};
		case "trial_ending":
			return {
				subject: `Your TenantFlow trial ends on ${endText}`,
				preheader: "Choose a plan to keep using TenantFlow.",
				heading: "Your trial is ending",
				paragraphs: [
					hi,
					`Your TenantFlow trial ends on ${endText}.`,
					"To keep using TenantFlow after that, choose a plan. When the trial ends without one, only Settings and the plans page stay open until you choose a plan.",
				],
				ctaLabel: "Choose a plan",
				ctaPath: CHOOSE_PLAN_PATH,
				note: null,
			};
		case "trial_ended":
			return {
				subject: "Your TenantFlow trial has ended",
				preheader: "Choose a plan to open your account again.",
				heading: "Your trial has ended",
				paragraphs: [
					hi,
					`Your TenantFlow trial ended on ${endText}.`,
					"Your properties, tenants and leases are still saved. Until you choose a plan, only Settings and the plans page are open.",
				],
				ctaLabel: "Choose a plan",
				ctaPath: CHOOSE_PLAN_PATH,
				note: null,
			};
	}
}
