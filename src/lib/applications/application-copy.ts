/**
 * Rental Application Copy (Phase 66)
 *
 * NOT A BARREL FILE. Every constant below is declared here and nothing is
 * re-exported from anywhere else (CLAUDE.md zero-tolerance rule 2). Importers
 * pull the specific constant they need directly from this path.
 *
 * WHY THE COPY IS A CONSTANT RATHER THAN JSX TEXT. Three of these strings are
 * requirement-level, not decorative:
 *   - `APPLY_DISCLAIMER` is APPLY-06. It is the statement that keeps Fair Credit
 *     Reporting Act duties with the landlord rather than with TenantFlow. The
 *     render and the E2E snapshot both read this constant, so they cannot drift.
 *   - `FAIR_HOUSING_NOTE` is template text on a surface that 42 U.S.C. 3604(c)
 *     regulates directly.
 *   - `TOKEN_UNAVAILABLE_COPY` is a non-enumeration control. See its own note.
 *
 * `TOKEN_UNAVAILABLE_COPY` IS ONE CONSTANT, DELIBERATELY, AND IS NOT SHAPED LIKE
 * `REASON_MESSAGE`. `src/app/sign/[token]/sign-context.ts` maps each token
 * reason to distinct copy, and that is right for `/sign`: an already-signed
 * lease, an expired link and a revoked link are genuinely different situations
 * for the tenant, who holds a link that was sent to them personally. `/apply` is
 * the opposite. Its link is published to a listing, so anyone at all can probe
 * it, and rendering different text for invalid, expired, revoked and
 * unit-deleted would turn the page into a token oracle: a probe could learn
 * which tokens exist and which merely lapsed. One constant makes that divergence
 * impossible to introduce. Four map entries would leave it one line away, which
 * is exactly the edit a well-meaning reviewer makes in the name of helpfulness.
 */

/**
 * APPLY-06, verbatim. Every sentence is load-bearing and the test asserts each
 * promise individually, so weakening any one of them fails a named test rather
 * than a length check.
 */
export const APPLY_DISCLAIMER: {
	heading: string;
	paragraphs: readonly [string, string, string];
} = {
	heading: "About this application",
	paragraphs: [
		"TenantFlow does not screen applicants. We do not run credit checks, background checks, criminal history checks, or eviction searches, and we do not obtain or provide consumer reports. We are not a consumer reporting agency.",
		// COPY NOTE: the em-dash below is the one sanctioned exception to this
		// project's no-em-dash rule. This is statutory-adjacent notice copy,
		// reviewed as a unit, and rewriting it for punctuation style risks changing
		// what it says. Recorded here so a reviewer does not "fix" it.
		"This form is delivered directly to the property owner, who alone decides whether to rent to you. If the owner obtains a background or credit report about you from a screening company, that is separate from this form and the owner is responsible for the notices the Fair Credit Reporting Act requires. We will not email you about this application — the owner will contact you directly.",
		"We do not ask for your Social Security number, date of birth, or financial account details. Do not enter them.",
	],
};

/**
 * Renders at the end of the income section of `/apply`.
 *
 * LOCKED INVARIANT: this is template text the owner can neither edit nor remove.
 * 42 U.S.C. 3604(c) regulates the content of the application form itself, which
 * means an owner-editable non-discrimination statement is a statement an owner
 * could edit into a violation. It stays a constant for that reason, not for
 * convenience.
 */
export const FAIR_HOUSING_NOTE =
	"This owner does not discriminate on the basis of race, color, religion, sex, disability, familial status, or national origin, or on any other basis protected by state or local law.";

/**
 * The ONE string rendered for every unavailable-token state: invalid, expired,
 * revoked, and unit-deleted. See the file header for why there is exactly one.
 * The accompanying test asserts this text names none of those states.
 */
export const TOKEN_UNAVAILABLE_COPY: { title: string; body: string } = {
	title: "This application link isn't available",
	body: "This link is no longer accepting applications. If you found it on a rental listing, contact the person who posted the listing for a current link.",
};

/**
 * D-07, in workflow order. These are the exact values allowed by
 * `rental_applications_status_check`; the column is `text` + `CHECK`, never a
 * PostgreSQL ENUM.
 */
export const APPLICATION_STATUSES = [
	"new",
	"reviewing",
	"approved",
	"rejected",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export type ApplicationStatusBadgeVariant =
	| "info"
	| "warning"
	| "success"
	| "outline";

/**
 * The label and badge variant for each status, in one place so the queue chip,
 * the detail header and the action-bar copy cannot disagree.
 *
 * TWO DELIBERATE DECISIONS THAT LOOK LIKE MISTAKES:
 *
 *   1. `rejected` is labelled "Declined" (UI-14). The DB value stays `rejected`
 *      because D-07 locks the CHECK constraint, but "Declined" is the word an
 *      owner uses about a person. The mismatch is intentional; do not "fix" it
 *      in either direction.
 *
 *   2. `rejected` is `outline`, NOT `destructive` (UI-13). A declined applicant
 *      is not an error state, and red on a fair-housing-regulated surface reads
 *      as a judgment about the person rather than a status. There is a test
 *      asserting `destructive` appears nowhere in this map.
 */
export const APPLICATION_STATUS: Record<
	ApplicationStatus,
	{ label: string; badgeVariant: ApplicationStatusBadgeVariant }
> = {
	new: { label: "New", badgeVariant: "info" },
	reviewing: { label: "Reviewing", badgeVariant: "warning" },
	approved: { label: "Approved", badgeVariant: "success" },
	rejected: { label: "Declined", badgeVariant: "outline" },
};

/**
 * D-11. The heading a swept row is shown under, on BOTH surfaces that render one.
 *
 * `anonymize_old_rental_applications` writes the literal `[deleted]` into the
 * three NOT NULL applicant columns, so any surface that reads
 * `applicant_first_name` unconditionally presents a sentinel as a person's name.
 * The detail page uses this for its `<h1>` and its breadcrumb; the queue uses it
 * for the row title. It lives here rather than in either component because the
 * owner clicks the row and lands on the page — two copies of the string would let
 * the list and the page it opens disagree about the same application.
 */
export const ANONYMIZED_HEADING = "Anonymized application";

export type DispositionReasonValue =
	| "unit_no_longer_available"
	| "income_requirement"
	| "rental_history_requirement"
	| "incomplete_application"
	| "applicant_withdrew"
	| "another_applicant_selected"
	| "other";

/**
 * D-11d. A CLOSED vocabulary, never free text: the reason survives the 730-day
 * anonymize sweep as part of the decision stub, so a free-text field here would
 * be PII that the sweep exists to remove and cannot.
 *
 * Every `value` matches `rental_applications_disposition_reason_check` in
 * `supabase/migrations/20260806120000_rental_applications_schema.sql` exactly.
 * A value that does not match raises 23514 at write time, not at build time.
 */
export const DISPOSITION_REASONS: readonly {
	value: DispositionReasonValue;
	label: string;
}[] = [
	{ value: "unit_no_longer_available", label: "Unit no longer available" },
	{
		value: "income_requirement",
		label: "Income did not meet the stated requirement",
	},
	{
		value: "rental_history_requirement",
		label: "Rental history did not meet the stated requirement",
	},
	{ value: "incomplete_application", label: "Incomplete application" },
	{ value: "applicant_withdrew", label: "Applicant withdrew" },
	{
		value: "another_applicant_selected",
		label: "Another applicant was selected",
	},
	{ value: "other", label: "Other" },
];
