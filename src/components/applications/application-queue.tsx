"use client";

/**
 * The owner review queue — Band 1 of `/applications` (APPLY-03, UI-SPEC §B-2,
 * §B-3, §B-4). The one client island the queue page mounts.
 *
 * NOT A BARREL FILE. Everything below is declared here and nothing is
 * re-exported (CLAUDE.md zero-tolerance rule 2).
 *
 * IT ADDS NO DATA ACCESS OF ITS OWN. Both reads go through `queryOptions()`
 * factories that already exist: `applicationQueries.list` (plan 66-09) for the
 * rows, and `propertyQueries.listWithDetails()` for the unit filter's options.
 * The second one is called with NO arguments on purpose — that is byte-identical
 * to `/properties`' own call (`properties/page.tsx:59`), so both surfaces land
 * on the same TanStack Query cache entry instead of forking one.
 *
 * WHY THE UNIT LIST COMES FROM THE PROPERTY FACTORY AND NOT `unitQueries.list`.
 * The queue's meta line reads `{property} · Unit {n}`, so the filter has to
 * offer the same compound label or an owner with "Unit 101" at two properties
 * gets two indistinguishable options. `unitQueries.list` returns `property_id`
 * and no property name; joining it against a second query would be two requests
 * and a hand-rolled join for a control that one existing query already answers.
 *
 * `isPending`, NEVER the loading flag derived from it: that flag is
 * `isPending && isFetching`, so a query that is pending but not in flight
 * reports it as false with no data and falls straight through to the empty
 * state — telling an owner they have no applications when we simply have not
 * loaded them. Both triggers are live in this app: `networkMode: "online"`
 * parks an offline query at a paused fetch status, and PersistQueryClientProvider
 * mounts from an async effect so every cold load passes through a restore
 * window. Phase 65 shipped this defect on two surfaces.
 */

import { useQuery } from "@tanstack/react-query";
import { Inbox, User } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ApplicationStatusBadge } from "#components/applications/application-status-badge";
import { Button } from "#components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "#components/ui/empty";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemMedia,
	ItemTitle,
} from "#components/ui/item";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#components/ui/select";
import { Skeleton } from "#components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#components/ui/tabs";
import {
	APPLICATIONS_PAGE_SIZE,
	type ApplicationListFilters,
	type ApplicationSummaryRow,
	applicationQueries,
	isAnonymized,
} from "#hooks/api/query-keys/application-keys";
import { propertyQueries } from "#hooks/api/query-keys/property-keys";
import {
	ANONYMIZED_HEADING,
	APPLICATION_STATUS,
	APPLICATION_STATUSES,
	type ApplicationStatus,
} from "#lib/applications/application-copy";
import { formatRelativeDate } from "#lib/formatters/date";

/** Radix `Select` cannot hold an empty-string value, so "no filter" is a sentinel. */
const ALL_UNITS = "all-units";

/**
 * The `id` plan 66-14 gives the application-links band (UI-SPEC §C). The
 * first-run empty state is the bridge to it, which is the whole reason the queue
 * sits above the links band rather than below it.
 */
const LINKS_BAND_ID = "application-links";

type StatusTab = "all" | ApplicationStatus;

/**
 * Five triggers, labels sourced from `APPLICATION_STATUS` so the tab and the row
 * chip can never disagree — that map is also what makes the fourth tab read
 * "Declined" while the column value stays `rejected` (UI-14).
 */
const STATUS_TABS: readonly { value: StatusTab; label: string }[] = [
	{ value: "all", label: "All" },
	...APPLICATION_STATUSES.map((status) => ({
		value: status,
		label: APPLICATION_STATUS[status].label,
	})),
];

/** Narrows radix's `string` without a cast; an unknown value fails safe to "all". */
function toStatusTab(value: string): StatusTab {
	return STATUS_TABS.find((tab) => tab.value === value)?.value ?? "all";
}

/**
 * The row's title — T-66-50, and the reason it is a function rather than an
 * inline template.
 *
 * `anonymize_old_rental_applications` writes the literal `[deleted]` into all
 * three NOT NULL applicant columns, so reading the name columns unconditionally
 * puts a swept row in the queue as a person named "[deleted] [deleted]", under a
 * normal user icon and a normal status chip, indistinguishable from a live
 * applicant. `anonymized_at` is already selected by `LIST_SELECT_COLUMNS` and
 * already mapped by `mapRentalApplicationSummaryRow` for exactly this — and
 * `isAnonymized`'s own docstring says it accepts anything carrying the column so
 * the queue row and the detail row can both ask. This is the queue asking.
 *
 * `ANONYMIZED_HEADING` is the SHARED constant the detail page's `<h1>` and
 * breadcrumb also read, so the row and the page it opens cannot disagree about
 * the same application.
 */
function rowHeading(row: ApplicationSummaryRow): string {
	return isAnonymized(row)
		? ANONYMIZED_HEADING
		: `${row.applicant_first_name} ${row.applicant_last_name}`;
}

/** `{property} · Unit {n} · {relative date}` — middle dots, never an em-dash. */
function metaLine(row: ApplicationSummaryRow): string {
	const parts = [row.property_label];
	if (row.unit_label) parts.push(`Unit ${row.unit_label}`);
	const applied = formatRelativeDate(row.created_at);
	if (applied) parts.push(applied);
	return parts.join(" · ");
}

/** §B-3: five skeleton rows at the row's own height. Never a spinner. */
function QueueSkeletons() {
	return (
		<div className="flex flex-col gap-2">
			{Array.from({ length: 5 }).map((_, index) => (
				<Skeleton key={index} className="h-[72px] rounded-lg" />
			))}
		</div>
	);
}

/**
 * §B-3. Inline, never an error boundary: a failed queue load must not take the
 * links band down with it, and that band is the one thing a first-run owner
 * needs. Nothing is rendered off the error object — `handlePostgrestError`
 * captures to Sentry and rethrows without a toast, so this copy is the entire
 * user-facing surface and anything read off the driver would put a PostgREST
 * code in front of a landlord (T-66-43).
 */
function QueueError({ onRetry }: { onRetry: () => void }) {
	return (
		<div className="flex flex-col items-start gap-2">
			<p className="text-sm text-muted-foreground mb-0">
				Couldn&apos;t load applications.
			</p>
			<Button variant="ghost" size="sm" onClick={onRetry}>
				Retry
			</Button>
		</div>
	);
}

/**
 * The owner genuinely has no applications. This is the ONLY empty branch that
 * carries a call to action, and the action is the one that fixes the situation.
 */
function QueueEmpty() {
	return (
		<Empty>
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<Inbox aria-hidden="true" />
				</EmptyMedia>
				<EmptyTitle>No applications yet</EmptyTitle>
				{/*
				 * `mb-0`: EmptyDescription is a bare `<p>` (empty.tsx:72-81) and
				 * globals.css:499 gives every `<p>` a 1rem bottom margin in @layer
				 * base. Its parent EmptyHeader lays out with `gap-2`, and gap does not
				 * cancel margins, so without this the title-to-button rhythm carries
				 * 16px of dead space it never declared.
				 */}
				<EmptyDescription className="mb-0">
					Create an application link for a vacant unit and share it on your
					listing.
				</EmptyDescription>
			</EmptyHeader>
			<EmptyContent>
				<Button
					onClick={() => {
						// The band is plan 66-14's. Guarded rather than assumed: until
						// that plan lands the element does not exist, and a missing
						// scroll target must be a no-op, not a thrown render error.
						const band = document.getElementById(LINKS_BAND_ID);
						if (!band) return;
						band.scrollIntoView({ behavior: "smooth", block: "start" });
						band.focus({ preventScroll: true });
					}}
				>
					Create an application link
				</Button>
			</EmptyContent>
		</Empty>
	);
}

/**
 * The filter matched nothing. NO media and NO call to action, deliberately:
 * offering "create a link" to an owner who has applications and merely filtered
 * them out is the wrong action, and it would read as though their applications
 * had been lost.
 *
 * `md:p-6` is required alongside `py-6`, not redundant — `Empty`'s base is
 * "… p-6 … md:p-12" and tailwind-merge leaves the `md:` rung intact when only a
 * `py-*` arrives, so `py-6` alone compacts nothing at md and above (Phase 65
 * L-07).
 */
function QueueFilteredEmpty() {
	return (
		<Empty className="py-6 md:p-6">
			<EmptyHeader>
				<EmptyTitle>No applications match this filter</EmptyTitle>
				{/* `mb-0` for the same reason as QueueEmpty: bare `<p>`, gap parent. */}
				<EmptyDescription className="mb-0">
					Clear the unit or status filter to see everything.
				</EmptyDescription>
			</EmptyHeader>
		</Empty>
	);
}

/**
 * §B-3. One `Item` per row, `asChild` over a whole-row `<Link>`, and the whole
 * row is the affordance — `ItemActions` holds the chip and nothing else, because
 * a nested interactive element inside a whole-row link is invalid HTML and
 * breaks keyboard navigation.
 *
 * No fixed height and no line clamp on the meta line: at 375px a long property
 * name wraps and the row grows, which is correct (§B-3). That is not free —
 * `ItemDescription`'s own base string carries `line-clamp-2`, so the meta line
 * below carries an explicit `line-clamp-none` to take it back. Without it this
 * paragraph described the opposite of what shipped.
 */
function QueueRows({ rows }: { rows: ApplicationSummaryRow[] }) {
	return (
		/*
		 * All four neutralizers are mandatory (§D-3). globals.css:517-524 declares
		 * unscoped `ul, ol { margin: 1rem 0; padding-left: 1.5rem }` and
		 * `li { margin-bottom: 0.25rem }` inside @layer base, and a utility beats a
		 * base rule by layer order — but only if it is written. Without `pl-0` the
		 * queue indents 24px out of alignment with the page header; without `mt-0`
		 * it gains a 16px top margin the band's own gap did not ask for; without
		 * `[&>li]:mb-0` the 8px row rhythm renders at 12px.
		 *
		 * `mb-0` IS NOT REDUNDANT WITH `mt-0`, AND SHIPPING WITHOUT IT WAS A REAL
		 * DEFECT. `margin: 1rem 0` is a SHORTHAND writing margin-top AND
		 * margin-bottom; `mt-0` compiles to `margin-top: 0` alone and
		 * `[&>li]:mb-0` targets the child `<li>`, so the list's own 16px bottom
		 * margin survived both. `TabsContent` below is `flex flex-col gap-4` and
		 * this list and `QueuePager` are both flex items, so that margin could not
		 * collapse — it ADDED to the gap and rendered 32px where the layout
		 * declares 16px. `mt-0 mb-0` rather than `my-0`: both are physical
		 * longhands, which is what `getComputedStyle` reports and what the unit
		 * harness can therefore decide, while v4's `my-*` emits logical
		 * `margin-block`.
		 *
		 * `gap-2`, not the margin-based spacing utility: Tailwind v4 emits that one
		 * inside `:where()` at specificity 0, so the `[&>li]:mb-0` above (0,1,1)
		 * would outrank it and flatten the row rhythm to zero. `gap` is not a
		 * margin, so it cannot be beaten by a margin override at all (§D-2).
		 */
		<ul className="flex flex-col gap-2 pl-0 mt-0 mb-0 [&>li]:mb-0">
			{rows.map((row) => (
				<li key={row.id}>
					<Item size="default" asChild>
						{/*
						 * BOTH classes are required and each fixes a different half of
						 * the same base rule (globals.css:504). `no-underline` defeats its
						 * transparent underline, which turns visible on hover and would
						 * draw a line across the entire row; `text-foreground` defeats its
						 * `color: var(--color-primary)`, which would tint the whole row
						 * accent-blue. `buttonVariants` is not involved here, but the
						 * rule's three `:not()` guards are all satisfied by a plain
						 * `<Link>` regardless. Phase 65 shipped exactly this.
						 */}
						<Link
							href={`/applications/${row.id}`}
							className="no-underline text-foreground"
						>
							<ItemMedia variant="icon">
								<User
									className="size-4 text-muted-foreground"
									aria-hidden="true"
								/>
							</ItemMedia>
							{/*
							 * `min-w-0` is load-bearing, not defensive. ItemContent is
							 * `flex flex-1` with no min-width of its own, so its
							 * `min-width: auto` floor resolves to the title's min-content
							 * width and the flex line can never shrink — `w-full` below then
							 * constrains nothing and the row overflows instead of clipping.
							 */}
							<ItemContent className="min-w-0">
								{/*
								 * `block w-full min-w-0` is what makes `truncate` actually
								 * fire. ItemTitle is `flex w-fit` (item.tsx:118-128): a flex
								 * container has no anonymous text box for
								 * `text-overflow: ellipsis` to apply to, and `w-fit` sizes the
								 * box to its own text so `overflow: hidden` has nothing to
								 * clip. `truncate` alone here is inert — the exact defect
								 * Phase 65 shipped and fixed in c22cb1f0e.
								 *
								 * `font-normal` overrides the primitive's `font-medium` to
								 * stay inside this phase's two-weight contract.
								 */}
								<ItemTitle className="block w-full min-w-0 truncate font-normal">
									{rowHeading(row)}
								</ItemTitle>
								{/*
								 * `mb-0`: ItemDescription is a bare `<p>` (item.tsx:131-143)
								 * carrying the same base 1rem bottom margin, and ItemContent
								 * spaces its children with `gap-1`, which does not cancel
								 * margins. Without it every row carried 16px of dead space
								 * under the meta line.
								 *
								 * `line-clamp-none` IS WHAT MAKES THIS COMPONENT'S OWN DOC
								 * COMMENT TRUE. `ItemDescription`'s base string carries
								 * `line-clamp-2` (item.tsx:131-143), and `text-xs mb-0` is in
								 * no conflicting tailwind-merge group, so that clamp survived
								 * and applied `overflow: hidden` with `-webkit-line-clamp: 2`
								 * while the comment above claimed there was no clamp. At 375px
								 * `ItemContent` resolves to ~165px and a meta line like
								 * "{long property} · Unit 12B · 3 days ago" runs to three
								 * lines, so the clipped line was the applied date — the row's
								 * only time-ordering signal, lost on the one viewport where
								 * the row is hardest to scan. §B-3 declares no clamp here;
								 * this is the class that delivers it.
								 */}
								<ItemDescription className="text-xs mb-0 line-clamp-none">
									{metaLine(row)}
								</ItemDescription>
							</ItemContent>
							<ItemActions>
								<ApplicationStatusBadge status={row.status} />
							</ItemActions>
						</Link>
					</Item>
				</li>
			))}
		</ul>
	);
}

/**
 * §B-2. `from` and `to` are computed from the page index and the page size, and
 * `total` comes from the `{ count: 'exact' }` header (plan 66-09) — never from
 * the loaded slice, which reports "25 of 25" forever from page two onward and
 * never enables Next (T-66-35).
 */
function QueuePager({
	page,
	total,
	onPageChange,
}: {
	page: number;
	total: number;
	onPageChange: (next: number) => void;
}) {
	const from = page * APPLICATIONS_PAGE_SIZE + 1;
	const to = Math.min(from + APPLICATIONS_PAGE_SIZE - 1, total);
	const isLastPage = (page + 1) * APPLICATIONS_PAGE_SIZE >= total;

	return (
		<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			{/* `mb-0`: bare `<p>` in a flex parent, so the base margin is added to the
			    item height instead of collapsing out (§D-3). */}
			<p className="text-xs text-muted-foreground mb-0">
				Showing {from}–{to} of {total}
			</p>
			<div className="flex items-center gap-2">
				<Button
					variant="outline"
					size="sm"
					disabled={page === 0}
					onClick={() => onPageChange(page - 1)}
				>
					Previous
				</Button>
				<Button
					variant="outline"
					size="sm"
					disabled={isLastPage}
					onClick={() => onPageChange(page + 1)}
				>
					Next
				</Button>
			</div>
		</div>
	);
}

export function ApplicationQueue() {
	const [statusTab, setStatusTab] = useState<StatusTab>("all");
	const [unitFilter, setUnitFilter] = useState<string>(ALL_UNITS);
	const [page, setPage] = useState(0);

	// Conditional spreads, not `undefined` values: `exactOptionalPropertyTypes`
	// makes an explicit `unitId: undefined` a compile error, and an omitted key is
	// also what keeps the query key stable between "no filter" and "cleared".
	const filters: ApplicationListFilters = {
		page,
		...(unitFilter === ALL_UNITS ? {} : { unitId: unitFilter }),
		...(statusTab === "all" ? {} : { status: statusTab }),
	};
	const hasFilters = unitFilter !== ALL_UNITS || statusTab !== "all";

	const { data, isPending, isError, refetch } = useQuery(
		applicationQueries.list(filters),
	);
	const { data: properties } = useQuery(propertyQueries.listWithDetails());

	const unitOptions = useMemo(
		() =>
			(properties?.data ?? []).flatMap((property) =>
				property.units.map((unit) => ({
					id: unit.id,
					label: `${property.name} · Unit ${unit.unit_number}`,
				})),
			),
		[properties],
	);

	const total = data?.total ?? 0;

	return (
		<Tabs
			value={statusTab}
			onValueChange={(value) => {
				setStatusTab(toStatusTab(value));
				// A filter change invalidates the page index: page 3 of the unfiltered
				// corpus is routinely past the end of a filtered one, which would show
				// an empty list with Previous as the only way out.
				setPage(0);
			}}
			className="flex flex-col gap-4"
		>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<Select
					value={unitFilter}
					onValueChange={(value) => {
						setUnitFilter(value);
						setPage(0);
					}}
				>
					{/*
					 * `aria-label`, not a visible label: the trigger's own value is the
					 * label at rest, and an icon-free control with no accessible name is
					 * a blocking a11y violation (CLAUDE.md).
					 */}
					<SelectTrigger className="w-full sm:w-64" aria-label="Filter by unit">
						<SelectValue placeholder="All units" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={ALL_UNITS}>All units</SelectItem>
						{unitOptions.map((unit) => (
							<SelectItem key={unit.id} value={unit.id}>
								{unit.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				{/*
				 * THE TAB STRIP SCROLLS. THE PAGE DOES NOT. THE LABELS DO NOT CLIP.
				 *
				 * Three separate things had to be true for that, and the first attempt
				 * at this fix got one of them. Measured in a real Chrome against the
				 * compiled bundle at 375px, that attempt (`w-full sm:w-fit max-w-full
				 * overflow-x-auto`) produced: strip scrollWidth 327 === clientWidth 327
				 * — nothing to scroll — with every trigger rendered at 64.2px against a
				 * 38px content box, so "Reviewing" (60.7px of text), "Approved" (56px)
				 * and "Declined" (50.5px) all overflowed their own boxes and were
				 * clipped by the scroll container they were supposed to be scrolling.
				 *
				 * WHY `w-full` WAS NOT ENOUGH. It does beat the base `w-fit` in
				 * tailwind-merge, and the box really did become 327px. But the five
				 * triggers carry `flex-1` from `TabsTrigger`'s own base (ui/tabs.tsx),
				 * i.e. `flex: 1 1 0%`, so they size to the box rather than the box
				 * sizing to them. Normally that still overflows, because a flex item's
				 * `min-width: auto` floors it at its min-content width — but the
				 * UNLAYERED `@media (max-width: 768px)` block at globals.css:1536 sets
				 * an explicit `min-width: var(--touch-target-min)` on every `button`,
				 * and an explicit min-width REPLACES `auto`. The floor became 44px, the
				 * triggers shrank to 64.2px each, and there was nothing left to
				 * overflow. No utility can take that rule back: it is unlayered, and
				 * unlayered beats every `@layer utilities` declaration regardless of
				 * specificity — which is why the fix does not try.
				 *
				 * `flex-none` on the trigger is what defeats BOTH. `flex: 0 0 auto`
				 * means the basis is the content width and the shrink factor is zero,
				 * so a trigger cannot be squeezed below its label no matter what floor
				 * is imposed, and the 44px min-width degrades to a harmless floor under
				 * the one short label ("All", 33.9px of box). It is passed per instance
				 * so tailwind-merge resolves it against the base `flex-1` rather than
				 * appending to it.
				 *
				 * With nothing shrinkable inside it, the base `w-fit` is now the RIGHT
				 * width — the box hugs its tabs when they fit and `max-w-full` clamps
				 * it to the container when they do not, which is what turns the
				 * overflow into a scroll of the strip instead of a scroll of the
				 * document. `w-full sm:w-fit` is gone because it existed only to
				 * compensate for triggers that could shrink.
				 *
				 * `justify-start` is not cosmetic. `TabsList`'s base is
				 * `justify-center`, and centred content in a scroll container overflows
				 * equally at both ends — the left overflow of a centred flex line is
				 * unreachable by scrolling in LTR, so the first tabs would be
				 * permanently cut off.
				 *
				 * `scrollbar-hide` is the existing @utility at globals.css:1797. No
				 * counts on the tabs this phase — a per-status count needs a query
				 * nothing else on this page issues (§F).
				 */}
				<TabsList
					aria-label="Filter by status"
					className="max-w-full justify-start overflow-x-auto scrollbar-hide"
				>
					{STATUS_TABS.map((tab) => (
						<TabsTrigger
							key={tab.value}
							value={tab.value}
							className="flex-none"
						>
							{tab.label}
						</TabsTrigger>
					))}
				</TabsList>
			</div>
			{/*
			 * Exactly one `TabsContent`, whose value tracks the active tab. Radix
			 * unmounts inactive content, so five copies of the same list would be five
			 * chances for them to drift; one that follows the selection keeps the
			 * selected trigger's `aria-controls` pointing at a real element, which is
			 * what a bare TabsList would not do.
			 */}
			<TabsContent value={statusTab} className="flex flex-col gap-4">
				{isPending ? (
					<QueueSkeletons />
				) : isError ? (
					<QueueError
						onRetry={() => {
							void refetch();
						}}
					/>
				) : total === 0 ? (
					hasFilters ? (
						<QueueFilteredEmpty />
					) : (
						<QueueEmpty />
					)
				) : (
					<QueueRows rows={data?.rows ?? []} />
				)}
				{!isPending && !isError && total > 0 ? (
					<QueuePager page={page} total={total} onPageChange={setPage} />
				) : null}
			</TabsContent>
		</Tabs>
	);
}
