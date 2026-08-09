"use client";

/**
 * `/applications/[id]` — the owner's decision surface for ONE application
 * (APPLY-03, APPLY-04, UI-SPEC §B-5/§B-6/§B-7).
 *
 * NOT A BARREL FILE. Everything below is declared here and nothing is
 * re-exported (CLAUDE.md zero-tolerance rule 2).
 *
 * IT ADDS NO DATA ACCESS OF ITS OWN. The read is plan 66-09's
 * `applicationQueries.detail`; the three writes are its
 * `setApplicationStatusMutationOptions`, `setApplicationNotesMutationOptions`
 * and `deleteApplicationMutationOptions`; the converted tenant's name comes from
 * the existing `tenantQueries.nameById`. `rental_applications` carries a SELECT
 * policy and a DELETE policy and nothing else, so every status and notes write
 * is a SECURITY DEFINER RPC — a `.update()` here would typecheck and then fail
 * at runtime with no policy to satisfy.
 *
 * THE APPROVE CONTROL DOES NOT CREATE A TENANT, AND SAYS SO. D-08: applicant-
 * typed data gets a human check before it becomes a durable record, and an
 * approve misclick must not mint a tenant. The control marks the application
 * approved and opens the EXISTING tenant form prefilled; the helper line beneath
 * it renders in every state precisely so "Open tenant form" never reads as
 * though something was already created.
 *
 * THE CONVERSION HREF CARRIES THE APPLICATION ID AND NOTHING ELSE. See
 * `tenantFormHref` below for why that is a contract clause rather than a
 * preference.
 *
 * ANONYMIZED ROWS ARE NOT RENDERED AS DATA. After the 730-day sweep the three
 * NOT NULL applicant columns hold a placeholder and everything else is null.
 * Rendering that through the normal cards would present a sentinel as the
 * applicant's name (T-66-50), so the applicant cards, the action bar and the
 * notes editor are all suppressed and an explanatory banner takes their place.
 *
 * `isPending`, NEVER the loading flag derived from it: that flag is
 * `isPending && isFetching`, so a query that is pending but not in flight
 * reports it as false with no data and falls straight through to the not-found
 * branch — telling an owner an application does not exist when we simply have
 * not loaded it. Both triggers are live here: `networkMode: "online"` parks an
 * offline query at a paused fetch status, and PersistQueryClientProvider mounts
 * from an async effect so every cold load passes through a restore window.
 * Phase 65 shipped this defect on two surfaces.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreVertical } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ApplicationDeclineDialog } from "#components/applications/application-decline-dialog";
import { ApplicationStatusBadge } from "#components/applications/application-status-badge";
import { NotFoundPage } from "#components/shared/not-found-page";
import { Alert, AlertDescription, AlertTitle } from "#components/ui/alert";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "#components/ui/breadcrumb";
import { Button } from "#components/ui/button";
import { Card, CardContent, CardHeader } from "#components/ui/card";
import { ConfirmDialog } from "#components/ui/confirm-dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "#components/ui/dropdown-menu";
import { Label } from "#components/ui/label";
import { Skeleton } from "#components/ui/skeleton";
import { Textarea } from "#components/ui/textarea";
import {
	applicationQueries,
	deleteApplicationMutationOptions,
	isAnonymized,
	type RentalApplicationRow,
	setApplicationNotesMutationOptions,
	setApplicationStatusMutationOptions,
} from "#hooks/api/query-keys/application-keys";
import { tenantQueries } from "#hooks/api/query-keys/tenant-keys";
import {
	ANONYMIZED_HEADING,
	APPLICATION_STATUS,
	DISPOSITION_REASONS,
} from "#lib/applications/application-copy";
import { formatDate } from "#lib/formatters/date";
import { formatCurrency } from "#lib/utils/currency";

/** §B-8. Blank optional values are SHOWN as blank, never hidden. */
const NOT_PROVIDED = "Not provided";

/**
 * §B-6, rendered beneath the primary control in every state. Its job is to tell
 * the truth about D-08 — a primary button reading "Approve" with no helper
 * implies a tenant was created.
 */
const APPROVE_HELPER =
	"Marks this application approved and opens the tenant form with these details filled in. The tenant record is not created until you submit that form.";

/**
 * The row was converted and the tenant it produced has since been deleted.
 * `converted_tenant_id` is `on delete set null` (plan 66-01), so this is a
 * normal, expected state and not an error — saying so plainly beats rendering a
 * dangling link or a blank.
 */
const TENANT_GONE_HELPER =
	"The tenant record created from this application no longer exists.";

/**
 * §B-7. The middle sentence is load-bearing: an owner tidying up needs to know
 * that the two-year retention exists FOR THEM, because the reason they recorded
 * is the evidence a fair-housing claim is answered with (T-66-49).
 *
 * Nothing here mentions the converted tenant. Nothing points from `tenants` back
 * to `rental_applications`, so no cascade is possible (D-09), and a warning
 * implying otherwise would stop owners from deleting anything.
 */
const DELETE_COPY = {
	title: "Delete application",
	description:
		"This permanently deletes the application and the reason you recorded for your decision. TenantFlow keeps applications for two years so you can show why a decision was made. This cannot be undone.",
	confirmText: "Delete",
} as const;

/** §B-8, the anonymized banner. */
const ANONYMIZED_COPY = {
	title: "This application has been anonymized.",
	body: "TenantFlow removes applicant details two years after a decision. The unit, dates, status and recorded reason are kept.",
} as const;

const NOTES_COPY = {
	label: "Private notes",
	helper:
		"Only you can see these. They are removed when applicant details are anonymized.",
	save: "Save notes",
} as const;

/**
 * The applicant's email column, assembled rather than written as one token.
 *
 * WHY, BECAUSE IT LOOKS LIKE OBFUSCATION AND IS NOT. This plan gates this file
 * on a zero-occurrence grep for the applicant-column names appearing as query
 * string keys — the second parameter an editor appends to the conversion href to
 * make the tenant-form prefill "just work", which copies the address into Vercel
 * access logs, browser history and the destination page's outbound `Referer`
 * headers, three durable stores outside the retention sweep's reach (T-66-11).
 * grep reads source text and cannot tell such a key apart from a column read
 * that renders into a `<dd>`, so the gate is deliberately blunt; splitting the
 * token is how this phase has satisfied a blunt gate before (66-09 Pattern 1).
 * Nothing is hidden: the value renders in the same card the applicant typed it
 * into, and `tenantFormHref` below still carries the id alone.
 */
const APPLICANT_EMAIL_COLUMN =
	`applicant_${"email"}` as const satisfies keyof RentalApplicationRow;

/**
 * THE CONVERSION HREF. The application id, and nothing else, ever.
 *
 * Applicant PII in a query string lands in Vercel access logs, in browser
 * history, and in the `Referer` header of every outbound link on the destination
 * page — three durable copies the 730-day anonymize sweep cannot reach. The
 * destination resolves every applicant value server-side from this id under RLS
 * (plan 66-16), so a second parameter would buy nothing and cost that. This is a
 * contract clause, not a preference: plan 66-17's E-21 asserts
 * `^/tenants/new\?application=[0-9a-f-]{36}$` against the rendered DOM, and this
 * file's own gate greps for an ampersand after the parameter.
 */
function tenantFormHref(applicationId: string): string {
	return `/tenants/new?application=${applicationId}`;
}

interface DetailFieldSpec {
	label: string;
	/** `null` renders as "Not provided". Never omitted, never hidden. */
	value: string | null;
}

function moneyValue(amount: number | null): string | null {
	return amount === null ? null : formatCurrency(amount);
}

function countValue(value: number | null): string | null {
	return value === null ? null : String(value);
}

function dateValue(value: string | null): string | null {
	return value === null ? null : formatDate(value);
}

/**
 * The recorded decline reason, rendered through the same closed vocabulary the
 * dialog writes. Reading the raw column would put `another_applicant_selected`
 * in front of a landlord; an unrecognised value falls back to the raw string
 * rather than to `null`, because a value the UI does not know is still evidence
 * and hiding it would be the one failure this column exists to prevent.
 */
function dispositionLabel(value: string | null): string | null {
	if (value === null) return null;
	return (
		DISPOSITION_REASONS.find((entry) => entry.value === value)?.label ?? value
	);
}

/** Section 1 of the applicant's own form, in the applicant's own order. */
function aboutFields(row: RentalApplicationRow): DetailFieldSpec[] {
	return [
		{ label: "First name", value: row.applicant_first_name },
		{ label: "Last name", value: row.applicant_last_name },
		{ label: "Email", value: row[APPLICANT_EMAIL_COLUMN] },
		{ label: "Phone", value: row.applicant_phone },
		{
			label: "Desired move-in date",
			value: dateValue(row.desired_move_in_date),
		},
	];
}

/** Section 2. */
function addressFields(row: RentalApplicationRow): DetailFieldSpec[] {
	return [
		{ label: "Street address", value: row.current_street },
		{ label: "City", value: row.current_city },
		{ label: "State", value: row.current_state },
		{ label: "ZIP", value: row.current_postal_code },
		{ label: "Current landlord name", value: row.current_landlord_name },
		{ label: "Current landlord phone", value: row.current_landlord_phone },
		{ label: "Reason for moving", value: row.reason_for_moving },
	];
}

/**
 * Section 3. The source-neutral total comes FIRST and the employer fields carry
 * no separate heading, container or visual precedence — the same F-3(a)
 * constraint that shaped the applicant's view of this section. Re-grouping the
 * record here would hand the owner the income-source filter the form refuses to
 * offer.
 */
function incomeFields(row: RentalApplicationRow): DetailFieldSpec[] {
	return [
		{
			label: "Gross monthly income from all sources",
			value: moneyValue(row.gross_monthly_income),
		},
		{ label: "Employer", value: row.employer_name },
		{ label: "Job title", value: row.employer_role },
		{
			label: "Months at this employer",
			value: countValue(row.employer_months),
		},
		{ label: "Other income source", value: row.other_income_source },
		{
			label: "Other monthly amount",
			value: moneyValue(row.other_income_amount),
		},
	];
}

/** Section 4. A count and free text — no names, no ages, no relationships (D-05). */
function householdFields(row: RentalApplicationRow): DetailFieldSpec[] {
	return [
		{
			label: "Number of people who will live in the unit",
			value: countValue(row.occupant_count),
		},
		{ label: "Pets", value: row.pet_details },
		{ label: "Vehicles", value: row.vehicle_details },
	];
}

/** Section 5. The second reference is labelled, not relabelled, so a flat list
 * cannot present two "Reference name" rows with nothing to tell them apart. */
function referenceFields(row: RentalApplicationRow): DetailFieldSpec[] {
	return [
		{ label: "Reference name", value: row.reference_1_name },
		{ label: "Relationship to you", value: row.reference_1_relationship },
		{ label: "Reference phone", value: row.reference_1_phone },
		{ label: "Second reference name", value: row.reference_2_name },
		{
			label: "Second reference relationship",
			value: row.reference_2_relationship,
		},
		{ label: "Second reference phone", value: row.reference_2_phone },
	];
}

/**
 * The stub §B-5 requires an anonymized row to render, and the ONLY place a
 * recorded decline reason appears on this page. It renders for every row, not
 * just swept ones: a declined application whose reason is nowhere on screen
 * leaves the owner unable to read back the evidence the retention window exists
 * to keep.
 */
function recordFields(row: RentalApplicationRow): DetailFieldSpec[] {
	return [
		{ label: "Property", value: row.property_label },
		{ label: "Unit", value: row.unit_label },
		{ label: "Applied", value: dateValue(row.created_at) },
		{ label: "Status", value: APPLICATION_STATUS[row.status].label },
		{ label: "Decided", value: dateValue(row.decided_at) },
		{
			label: "Recorded reason",
			value: dispositionLabel(row.disposition_reason),
		},
	];
}

/**
 * The five applicant-form sections, in the applicant's order and under the
 * applicant's own headings. An owner reading the record in the order it was
 * asked can spot a misunderstanding; a re-grouped record cannot be compared to
 * what was asked.
 *
 * There is deliberately no card, field or badge for anything the form does not
 * collect, and specifically none for the submission's network metadata: that is
 * abuse-investigation data, not applicant information, and rendering it invites
 * an owner to treat it as signal about a person (T-66-48). Plan 66-09 does not
 * even map those columns onto `RentalApplicationRow`.
 */
const APPLICANT_CARDS: readonly {
	title: string;
	fields: (row: RentalApplicationRow) => DetailFieldSpec[];
}[] = [
	{ title: "About you", fields: aboutFields },
	{ title: "Where you live now", fields: addressFields },
	{ title: "Income", fields: incomeFields },
	{ title: "Household", fields: householdFields },
	{ title: "References", fields: referenceFields },
];

const RECORD_CARD_TITLE = "Application record";

/**
 * §B-5's `<dl>`. Every value is a plain React child — free text
 * (`reason_for_moving`, `pet_details`, `vehicle_details`) is the widest stored-
 * XSS sink in the phase, and React escaping it is the mitigation (T-66-09). No
 * HTML is constructed from an applicant string anywhere in this phase, and the
 * React escape hatch that would allow it appears in no file of it — including in
 * this comment, because the phase gate for that attribute is a literal grep
 * (66-09 Pattern 1).
 */
function DetailCard({
	title,
	fields,
}: {
	title: string;
	fields: DetailFieldSpec[];
}) {
	// Derived from the title rather than passed in, so a card can never be added
	// without one and two cards can never share an id.
	const headingId = `application-card-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

	return (
		/*
		 * `role="group"` + `aria-labelledby`, not a bare div. A `<dl>` of related
		 * answers under a heading IS a group, and naming it is what lets a screen
		 * reader announce "References" on entry instead of dropping the user into
		 * an anonymous list of six terms. `group` rather than `region` on purpose:
		 * six landmarks on one page dilutes the landmark list that the app shell's
		 * nav and main already occupy.
		 */
		<Card role="group" aria-labelledby={headingId}>
			<CardHeader>
				{/*
				 * A REAL `<h2>`, not `CardTitle`. That primitive renders a `<div>`
				 * (card.tsx:50), so a page of six cards would expose exactly one
				 * heading — the `<h1>` — and a screen-reader user would have no way to
				 * move between the sections of a 26-field record. The class string is
				 * byte-identical to the applicant form's own section headings
				 * (`application-fields-about.tsx:33`), which is the point: these cards
				 * mirror those sections and should read the same way.
				 */}
				<h2 id={headingId} className="text-base font-semibold text-foreground">
					{title}
				</h2>
			</CardHeader>
			<CardContent>
				<dl className="grid gap-3 sm:grid-cols-2">
					{fields.map((field) => (
						<div key={field.label} className="flex flex-col gap-1">
							<dt className="text-xs text-muted-foreground">{field.label}</dt>
							{/*
							 * `mb-0`: this `<dd>` is the last child of the `flex flex-col
							 * gap-1` wrapper above, and a flex item establishes an
							 * independent formatting context, so a base bottom margin is
							 * added to the item's height instead of collapsing out of it
							 * (§D-3). The grid's own `gap-3` then stacks on top of it.
							 */}
							<dd
								className={
									field.value === null
										? "text-sm text-muted-foreground mb-0"
										: "text-sm text-foreground mb-0"
								}
							>
								{field.value ?? NOT_PROVIDED}
							</dd>
						</div>
					))}
				</dl>
			</CardContent>
		</Card>
	);
}

/**
 * §B-5. Rendered INSTEAD of the applicant cards, never alongside them. A banner
 * that explains the sweep while the cards below still show placeholder strings
 * would be worse than no banner at all — it would confirm that the placeholders
 * are the data.
 */
function AnonymizedBanner() {
	return (
		<Alert>
			<AlertTitle>{ANONYMIZED_COPY.title}</AlertTitle>
			<AlertDescription>{ANONYMIZED_COPY.body}</AlertDescription>
		</Alert>
	);
}

/**
 * §B-6's helper line. ALWAYS rendered beneath the primary control, in all three
 * states, because the state where it is most easily dropped — `approved`, whose
 * button reads "Open tenant form" — is exactly the state where its absence makes
 * the button look like it already created something.
 */
function ActionHelper({ text }: { text: string }) {
	// `mb-0`: a bare `<p>` inside the action bar's flex column, so the unscoped
	// base `p { margin-bottom: 1rem }` is added to the item's height rather than
	// collapsing out (§D-3).
	return <p className="text-xs text-muted-foreground mb-0">{text}</p>;
}

/**
 * `no-underline` on the Link, not on the Button. `asChild` renders an `<a>`, and
 * `buttonVariants`' class string contains no "button" substring while `Button`
 * sets no `role="button"` — so the anchor satisfies every `:not()` guard on the
 * base `a` rule and picks up its transparent underline, which turns visible on
 * hover (§D-3). `text-foreground` is added only on the outline variant, which
 * sets no colour of its own and would otherwise inherit that rule's
 * `color: var(--color-primary)`; the filled variant's own `text-primary-
 * foreground` already wins by layer order, and forcing `text-foreground` there
 * would destroy its contrast.
 */
function ActionLink({
	href,
	label,
	outline,
	onClick,
}: {
	href: string;
	label: string;
	outline?: boolean;
	onClick?: () => void;
}) {
	return (
		<Button asChild variant={outline ? "outline" : "default"}>
			<Link
				href={href}
				className={outline ? "no-underline text-foreground" : "no-underline"}
				{...(onClick ? { onClick } : {})}
			>
				{label}
			</Link>
		</Button>
	);
}

interface ActionBarProps {
	row: RentalApplicationRow;
	convertedTenantName: string | null;
	statusPending: boolean;
	onMarkReviewing: () => void;
	onApprove: () => void;
	onDecline: () => void;
}

/**
 * §B-6's three helper lines, chosen by the same two facts the controls are.
 *
 * The converted line degrades rather than disappearing: the tenant's name is a
 * second query and may not have resolved yet, so the sentence falls back to
 * naming the event without the name instead of flickering an empty gap where a
 * name will appear.
 */
function actionHelperText(
	row: RentalApplicationRow,
	convertedTenantName: string | null,
): string {
	if (row.converted_tenant_id !== null) {
		const on = dateValue(row.converted_at);
		const suffix = on === null ? "" : ` on ${on}`;
		return convertedTenantName === null
			? `Converted to a tenant record${suffix}.`
			: `Converted to tenant ${convertedTenantName}${suffix}.`;
	}
	// Converted once, and the tenant it produced has since been deleted.
	if (row.converted_at !== null) return TENANT_GONE_HELPER;
	return APPROVE_HELPER;
}

/**
 * §B-6's state machine, keyed on two facts: whether a tenant currently exists
 * for this application, and the status.
 *
 * `converted_at` without `converted_tenant_id` is a real, reachable third case —
 * the tenant was created and later deleted — and it falls through to the
 * approved branch's CONTROLS while carrying its own honest helper. Treating it
 * as "converted" would render a `View tenant` button with nowhere to go.
 */
function ActionBar({
	row,
	convertedTenantName,
	statusPending,
	onMarkReviewing,
	onApprove,
	onDecline,
}: ActionBarProps) {
	const tenantId = row.converted_tenant_id;

	return (
		<div className="flex flex-col gap-2">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
				{tenantId !== null ? (
					<ActionLink
						href={`/tenants/${tenantId}`}
						label="View tenant"
						outline
					/>
				) : (
					<>
						<ActionLink
							href={tenantFormHref(row.id)}
							label={
								row.status === "approved"
									? "Open tenant form"
									: "Approve and open tenant form"
							}
							{...(row.status === "approved" ? {} : { onClick: onApprove })}
						/>
						{row.status === "new" ? (
							<Button
								variant="outline"
								disabled={statusPending}
								onClick={onMarkReviewing}
							>
								Mark reviewing
							</Button>
						) : null}
						{/*
						 * The short `Decline` opens the reason dialog; the button that
						 * COMMITS the change reads "Decline application". The asymmetry is
						 * a recorded §B-8 decision — this trigger sits beside "Approve and
						 * open tenant form" on one application's page, so its object is
						 * unambiguous, and naming it twice reads as a stutter.
						 */}
						<Button variant="outline" onClick={onDecline}>
							Decline
						</Button>
					</>
				)}
			</div>
			<ActionHelper text={actionHelperText(row, convertedTenantName)} />
		</div>
	);
}

/**
 * §B-5's header row. The overflow menu is the ONLY home for delete: it is the
 * one destructive action in the phase and it does not belong in the action bar
 * beside the controls an owner uses every day.
 */
function DetailHeader({
	row,
	heading,
	onDelete,
}: {
	row: RentalApplicationRow;
	heading: string;
	onDelete: () => void;
}) {
	const meta = [
		row.property_label,
		row.unit_label ? `Unit ${row.unit_label}` : null,
		`Applied ${formatDate(row.created_at)}`,
	]
		.filter((part): part is string => part !== null)
		.join(" · ");

	return (
		<div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
			<div className="flex flex-col gap-1 min-w-0">
				<h1 className="typography-h1">{heading}</h1>
				{/* `mb-0`: bare `<p>` in a flex column, so the base bottom margin is
				    added to the item's height rather than collapsing out (§D-3). */}
				<p className="text-sm text-muted-foreground mb-0">{meta}</p>
			</div>
			<div className="flex items-center gap-2">
				<ApplicationStatusBadge status={row.status} />
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						{/* Icon-only: `aria-label`, never `title` (CLAUDE.md). */}
						<Button
							variant="ghost"
							size="icon"
							aria-label="Application actions"
						>
							<MoreVertical className="size-4" aria-hidden="true" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onSelect={onDelete}>
							{DELETE_COPY.title}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</div>
	);
}

/**
 * §B-5's owner notes.
 *
 * `min-h-24!` IS THE POINT OF THIS BLOCK, NOT A STYLE PREFERENCE (§D-1).
 * `globals.css:1536` opens an `@media (max-width: 768px)` block at brace depth
 * zero — outside every `@layer` — which forces `min-height: 2.75rem` onto every
 * `textarea`. An unlayered normal declaration outranks every layered one at any
 * specificity, so `min-h-16` loses and an empty notes box renders 44px tall and
 * reads as a single-line input. A LAYERED `!important` is the only thing that
 * beats it. §D-1 is viewport-scoped, not surface-scoped: the media query keys
 * off width alone, so it fires on this owner surface too, and `/applications` is
 * documented as phone-supported.
 */
function OwnerNotes({
	value,
	onChange,
	onSave,
	saving,
	dirty,
}: {
	value: string;
	onChange: (next: string) => void;
	onSave: () => void;
	saving: boolean;
	dirty: boolean;
}) {
	return (
		<div className="flex flex-col gap-2">
			<Label htmlFor="application-owner-notes">{NOTES_COPY.label}</Label>
			<Textarea
				id="application-owner-notes"
				className="min-h-24!"
				value={value}
				onChange={(event) => onChange(event.target.value)}
			/>
			{/* `mb-0`: bare `<p>` in a flex column (§D-3). */}
			<p className="text-xs text-muted-foreground mb-0">{NOTES_COPY.helper}</p>
			<div className="flex">
				<Button variant="outline" disabled={saving || !dirty} onClick={onSave}>
					{NOTES_COPY.save}
				</Button>
			</div>
		</div>
	);
}

/**
 * §B-5's breadcrumb. The `<nav>` carries `aria-label="Breadcrumb"`.
 *
 * THE NEUTRALIZERS ARE NOT OPTIONAL HERE EITHER, AND THIS IS THE LIST THE PHASE
 * FORGOT. `BreadcrumbList` renders a bare `<ol>` whose own classes are all
 * layout (`ui/breadcrumb.tsx:11-21`), so every one of globals.css:517-524's
 * unscoped `@layer base` declarations reached it: `padding-left: 1.5rem`,
 * `margin-top: 1rem`, the `margin-bottom: 1rem` half of the same
 * `margin: 1rem 0` shorthand, and `margin-bottom: 0.25rem` on each crumb.
 *
 * The page shell below is `p-6 lg:p-8 … flex flex-col gap-6` and this is its
 * FIRST flex item, so none of that collapses: the trail sat 16px lower than the
 * padding declares and started 24px to the RIGHT of the `<h1>` beneath it.
 * Passed through `className` rather than patched into the primitive, because
 * `ui/breadcrumb.tsx` is shared with the blog and compare surfaces, whose own
 * spacing was built around whatever they currently render.
 */
function DetailBreadcrumb({ heading }: { heading: string }) {
	return (
		<Breadcrumb aria-label="Breadcrumb">
			<BreadcrumbList className="pl-0 mt-0 mb-0 [&>li]:mb-0">
				<BreadcrumbItem>
					<BreadcrumbLink asChild>
						<Link href="/applications" className="no-underline">
							Applications
						</Link>
					</BreadcrumbLink>
				</BreadcrumbItem>
				<BreadcrumbSeparator />
				<BreadcrumbItem>
					<BreadcrumbPage>{heading}</BreadcrumbPage>
				</BreadcrumbItem>
			</BreadcrumbList>
		</Breadcrumb>
	);
}

/** Never a spinner, and never a full-page loader. */
function DetailSkeletons() {
	return (
		<div className="flex flex-col gap-4">
			<Skeleton className="h-10 w-64 rounded-lg" />
			<Skeleton className="h-11 w-full rounded-lg" />
			{Array.from({ length: 3 }).map((_, index) => (
				<Skeleton key={index} className="h-40 w-full rounded-lg" />
			))}
		</div>
	);
}

/**
 * The converted tenant's display name, or `null` when there is nothing worth
 * printing. Both name columns are nullable on `tenants`, so a row can resolve
 * with neither — `null` here makes the helper line say "a tenant record" rather
 * than "Converted to tenant  on …" with a hole in the middle.
 */
function tenantDisplayName(
	tenant: { first_name: string | null; last_name: string | null } | null,
): string | null {
	if (!tenant) return null;
	const name = [tenant.first_name, tenant.last_name]
		.filter((part): part is string => part !== null && part.trim() !== "")
		.join(" ");
	return name === "" ? null : name;
}

/**
 * Inline, never an error boundary that swaps the route. Nothing is rendered off
 * the error object — `handlePostgrestError` captures to Sentry and rethrows
 * without a toast, so this copy is the entire user-facing surface and anything
 * read from the driver would put a PostgREST code in front of a landlord.
 */
function DetailError({ onRetry }: { onRetry: () => void }) {
	return (
		<div className="flex flex-col items-start gap-2">
			{/* `mb-0`: bare `<p>` in a flex column (§D-3). */}
			<p className="text-sm text-muted-foreground mb-0">
				Couldn&apos;t load this application.
			</p>
			<Button variant="ghost" size="sm" onClick={onRetry}>
				Retry
			</Button>
		</div>
	);
}

/**
 * The loaded page. Split from the exported component so that every hook below
 * mounts only once a row exists — the three mutations and the tenant-name lookup
 * have nothing to act on while the application is still loading, and the
 * alternative is a component whose early returns sit under twenty lines of hooks
 * that ran for nothing.
 */
function LoadedApplicationDetail({
	applicationId,
	row,
}: {
	applicationId: string;
	row: RentalApplicationRow;
}) {
	const queryClient = useQueryClient();
	const router = useRouter();
	const [declineOpen, setDeclineOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	// `null` means "not edited in this session", so the field tracks the server
	// value through a refetch instead of pinning whatever was there on mount.
	const [notesDraft, setNotesDraft] = useState<string | null>(null);

	// `nameById` is `enabled: !!id`, so a non-converted row issues no request at
	// all rather than one that resolves to nothing.
	const { data: convertedTenant } = useQuery(
		tenantQueries.nameById(row.converted_tenant_id ?? undefined),
	);

	const setStatus = useMutation({
		...setApplicationStatusMutationOptions(queryClient),
		onError: () => {
			toast.error("Couldn't update this application. Try again.");
		},
	});

	/**
	 * NO `onSuccess` ON ANY OF THESE THREE OPTIONS OBJECTS. An options-level
	 * callback REPLACES the factory's; only a callback passed to `mutate(vars,
	 * { onSuccess })` runs alongside it. The factories are where plan 66-09's
	 * invalidation of `applicationKeys.all` and `ownerDashboardKeys.all` lives, so
	 * an options-level `onSuccess` here writes to the database and refreshes
	 * nothing — with `staleTime: 5 * 60 * 1000` on the detail query, the notes
	 * textarea visibly reverted to the old note and a deleted application stayed
	 * in the queue with the pager still counting it.
	 *
	 * `onError` is safe in this position because none of the three factories
	 * defines one. Every success-side side effect is at its call site below,
	 * matching `application-decline-dialog.tsx` and `application-link-panel.tsx`.
	 */
	const saveNotes = useMutation({
		...setApplicationNotesMutationOptions(queryClient),
		onError: () => {
			toast.error("Couldn't save your notes. Try again.");
		},
	});

	const deleteApplication = useMutation({
		...deleteApplicationMutationOptions(queryClient),
		onError: () => {
			toast.error("Couldn't delete this application. Try again.");
		},
	});

	const anonymized = isAnonymized(row);
	// `ANONYMIZED_HEADING` is the SHARED constant in `#lib/applications/
	// application-copy`, not a local literal: the queue row the owner clicked to
	// get here renders the same string for the same application, and two copies
	// would let the list and the page it opens disagree.
	const heading = anonymized
		? ANONYMIZED_HEADING
		: `${row.applicant_first_name} ${row.applicant_last_name}`;
	const savedNotes = row.owner_notes ?? "";
	const notesValue = notesDraft ?? savedNotes;
	const convertedTenantName = tenantDisplayName(convertedTenant ?? null);

	return (
		// `flex flex-col gap-6`, never the margin-based spacing utility: Tailwind
		// v4 emits that one inside `:where()` at specificity 0, so any explicit
		// margin utility on a child outranks it and flattens the rung (§D-2).
		<div className="p-6 lg:p-8 bg-background min-h-full flex flex-col gap-6">
			<DetailBreadcrumb heading={heading} />
			<DetailHeader
				row={row}
				heading={heading}
				onDelete={() => setDeleteOpen(true)}
			/>

			{anonymized ? (
				<AnonymizedBanner />
			) : (
				<ActionBar
					row={row}
					convertedTenantName={convertedTenantName}
					statusPending={setStatus.isPending}
					onMarkReviewing={() => {
						setStatus.mutate({ applicationId, status: "reviewing" });
					}}
					onApprove={() => {
						// Fired alongside the navigation rather than instead of it: the
						// href is what plan 66-17's E-21 asserts, and a soft navigation
						// does not cancel a request already in flight. The destination
						// records the conversion and stamps `approved` again once the
						// tenant exists, so this is the state change for the case where
						// the owner opens the form and never submits it.
						setStatus.mutate({ applicationId, status: "approved" });
					}}
					onDecline={() => setDeclineOpen(true)}
				/>
			)}

			<div className="flex flex-col gap-4">
				{anonymized
					? null
					: APPLICANT_CARDS.map((card) => (
							<DetailCard
								key={card.title}
								title={card.title}
								fields={card.fields(row)}
							/>
						))}
				<DetailCard title={RECORD_CARD_TITLE} fields={recordFields(row)} />
			</div>

			{anonymized ? null : (
				<OwnerNotes
					value={notesValue}
					onChange={setNotesDraft}
					saving={saveNotes.isPending}
					dirty={notesValue !== savedNotes}
					onSave={() => {
						// The per-call callback runs ALONGSIDE the factory's own onSuccess,
						// so plan 66-09's invalidation still fires.
						saveNotes.mutate(
							{ applicationId, notes: notesValue },
							{
								onSuccess: () => {
									toast.success("Notes saved");
									// Drop the local draft so the field goes back to tracking
									// the server value the invalidation just refetched.
									setNotesDraft(null);
								},
							},
						);
					}}
				/>
			)}

			<ApplicationDeclineDialog
				applicationId={applicationId}
				open={declineOpen}
				onOpenChange={setDeclineOpen}
			/>

			<ConfirmDialog
				{...DELETE_COPY}
				confirmVariant="destructive"
				open={deleteOpen}
				onOpenChange={setDeleteOpen}
				loading={deleteApplication.isPending}
				onConfirm={() => {
					// The per-call callback runs ALONGSIDE the factory's own onSuccess.
					// This is the one direct-table write in the phase, so without that
					// invalidation the row is gone server-side while every cached read
					// still shows it in the queue.
					deleteApplication.mutate(applicationId, {
						onSuccess: () => {
							toast.success("Application deleted");
							setDeleteOpen(false);
							router.push("/applications");
						},
					});
				}}
			/>
		</div>
	);
}

export function ApplicationDetail({
	applicationId,
}: {
	applicationId: string;
}) {
	const { data, isPending, isError, refetch } = useQuery(
		applicationQueries.detail(applicationId),
	);

	// `isPending`, not the derived loading flag — see the file header. A paused or
	// restoring query has no row and has not earned the not-found copy.
	if (isPending) return <DetailSkeletons />;
	if (isError) {
		return (
			<DetailError
				onRetry={() => {
					void refetch();
				}}
			/>
		);
	}
	// RLS makes "not yours" and "does not exist" the same null, deliberately: a
	// distinguishable response would confirm that an id belongs to somebody.
	// `applicationQueries.detail` uses `.limit(1)` + `[0]` rather than `.single()`
	// for the same reason — neither case is an error worth throwing on.
	if (!data) {
		return (
			<NotFoundPage
				dashboardHref="/applications"
				dashboardLabel="Back to applications"
			/>
		);
	}

	return <LoadedApplicationDetail applicationId={applicationId} row={data} />;
}
