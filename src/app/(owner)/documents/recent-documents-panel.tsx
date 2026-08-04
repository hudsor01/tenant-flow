"use client";

/**
 * The `/documents` landing's "Recently added" preview — the ONE client island
 * this page adds (D-04). Everything else on the route is a Server Component.
 *
 * SC-3 / D-02, the reason this file has no data layer of its own: it calls
 * `documentSearchQueries.list({ page: 0 })` with no filters and no observer
 * overrides. That is byte-identical to the vault's default unfiltered call at
 * `documents-vault.client.tsx:230-239` — all five of its spreads are empty and
 * its `pageParam` is 0 — so both surfaces land on the SAME TanStack Query cache
 * entry, `["documents","search","",null,null,null,null,0]`. Building a second
 * query, a second mapper, or a direct `.from("documents")` select here is a
 * blocking violation: it would fork the cache and let the landing render a row
 * set the vault does not.
 *
 * That is also why nothing is passed as a second argument to `useQuery`. A
 * `staleTime`, `select` or `enabled` override does not fork the cache ENTRY,
 * but it does fork the behaviour the "cannot disagree" claim is stated about —
 * and `staleTime: 0` in particular would collide with the global
 * `refetchOnWindowFocus: true` and fire a full RPC plus ~50 signed-URL mints on
 * every window focus (T-65-12). The factory's own 45min/55min stale/gc pair is
 * tied to the 1-hour signed-URL TTL and must not be touched from here.
 *
 * D-03, the reason rows are inert: the shared cache entry carries live signed
 * URLs for up to 50 documents. A clickable row would be a second file-download
 * path competing with the vault's, so rows render no link, no button and no
 * href. The footer `View all documents` link is the one door, and
 * `/documents/vault` stays canonical (D-05).
 */

import { useQuery } from "@tanstack/react-query";
import { File } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Button } from "#components/ui/button";
import { Empty, EmptyDescription, EmptyTitle } from "#components/ui/empty";
import {
	Item,
	ItemContent,
	ItemDescription,
	ItemMedia,
	ItemTitle,
} from "#components/ui/item";
import { Skeleton } from "#components/ui/skeleton";
import type { DocumentRow } from "#hooks/api/query-keys/document-keys";
import { documentSearchQueries } from "#hooks/api/query-keys/document-search-keys";
import { useDocumentCategories } from "#hooks/api/use-document-categories";
import { formatRelativeDate } from "#lib/formatters/date";
import { DEFAULT_CATEGORY_LABELS } from "#lib/validation/documents";

const RECENT_LIMIT = 5;

/**
 * A widening ASSIGNMENT, not a type assertion (ZT-8). Owners can create custom
 * category slugs, so indexing the narrow `Record<DefaultCategorySlug, string>`
 * directly would not compile — and asserting the lookup non-null would lie.
 * Widened to `Record<string, string>`, an unknown slug is an honest `undefined`
 * under `noUncheckedIndexedAccess` and falls through to the prettifier below.
 */
const CATEGORY_LABELS: Record<string, string> = DEFAULT_CATEGORY_LABELS;

/**
 * Resolve a category slug to the label the OWNER sees, not the seed default.
 *
 * `document_categories.label` is mutable for every row including the seeded
 * defaults — `documentCategoryMutations.update()` gates on nothing but
 * ownership ("Only `label` is mutable"; there is no `is_default` guard). So an
 * owner who renames `insurance` to "Insurance Certificates", or adds a custom
 * `hoa_dues` / "HOA Dues", gets the right label everywhere the per-owner table
 * is read and the wrong one everywhere the static map is.
 *
 * The vault already reads that table (`documents-vault.client.tsx:168`, whose
 * own Phase 65 comment records the move off the static map), so a panel reading
 * DEFAULT_CATEGORY_LABELS would contradict a decision this same phase made one
 * file over: "Insurance · 3 days ago" here against "Insurance Certificates" in
 * the vault filter and the upload Select, in the same session.
 *
 * This does NOT fork the document cache and so does not touch SC-3 — it is the
 * same `documentCategoryQueries.list()` entry the vault already warms (5-min
 * staleTime, categories change rarely), so the two surfaces agree by sharing a
 * cache entry here exactly as they do for rows.
 */
function ownerCategoryLabel(
	slug: string,
	bySlug: ReadonlyMap<string, string>,
): string {
	// Map#get, so no prototype-chain hazard on this path regardless of slug.
	const owned = bySlug.get(slug);
	if (owned) return owned;
	// Fallback while the categories query is pending, or if the row references a
	// slug the owner has since deleted: seed default, then the prettifier.
	return categoryLabel(slug);
}

function categoryLabel(slug: string): string {
	// `Object.hasOwn`, not a bare index read. `CATEGORY_LABELS` is a plain object
	// literal, so it carries `Object.prototype`, and document category slugs are
	// owner-created — validated only by `documentCategorySlugSchema`'s
	// /^[a-z0-9_]+$/, which admits `constructor` and `__proto__`. A bare read
	// resolves those off the prototype chain and returns a truthy non-string, so
	// this `: string` function would hand `metaLine` the `Object` constructor and
	// the row would render `function Object() { [native code] } · 3 days ago`.
	// The widening to `Record<string, string>` keeps unknown slugs an honest
	// `undefined` for own-property misses only; this closes the rest.
	const known = Object.hasOwn(CATEGORY_LABELS, slug)
		? CATEGORY_LABELS[slug]
		: undefined;
	if (known) return known;
	const spaced = slug.replace(/_/g, " ");
	return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * `{category} · {relative date}`. `created_at` is nullable in the schema and
 * `formatRelativeDate` returns "" for null, so the date half is guarded rather
 * than rendered as a dangling separator. The separator is a middle dot, never
 * an em-dash (`document-row.tsx:72` sets the house convention).
 */
function metaLine(
	doc: DocumentRow,
	bySlug: ReadonlyMap<string, string>,
): string {
	const label = ownerCategoryLabel(doc.document_type, bySlug);
	const relative = doc.created_at ? formatRelativeDate(doc.created_at) : "";
	return relative ? `${label} · ${relative}` : label;
}

/** §I-3: five skeleton rows, never a spinner. */
function RecentSkeletons() {
	return (
		<div className="space-y-2">
			{Array.from({ length: RECENT_LIMIT }).map((_, index) => (
				<Skeleton key={index} className="h-10 rounded-md" />
			))}
		</div>
	);
}

function RecentError({ onRetry }: { onRetry: () => void }) {
	return (
		<div className="space-y-2">
			{/*
			 * Nothing is rendered off the error object. `handlePostgrestError`
			 * captures to Sentry and rethrows WITHOUT a toast, so this copy is the
			 * entire user-facing surface for a failed load — leaking the driver
			 * string here would put "PGRST116" in front of a landlord (T-65-06).
			 */}
			<p className="text-sm text-muted-foreground">
				Couldn&apos;t load recent documents.
			</p>
			{/*
			 * `variant="ghost"` is 65-UI-SPEC §I-3 verbatim and the divergence from
			 * both shipped Retry siblings is DELIBERATE, not a copy error:
			 * `documents-vault.client.tsx:499-507` ("Try again") and
			 * `notification-popover-list.tsx:82-84` ("Retry") both use
			 * `variant="outline"`. This panel sits inside the vault card, 24px under
			 * the page's only filled primary button; an outlined control there would
			 * compete with the CTA the whole band exists to promote.
			 */}
			<Button variant="ghost" size="sm" onClick={onRetry}>
				Retry
			</Button>
		</div>
	);
}

/**
 * §I-3 / D-12. No `EmptyMedia`, no `EmptyHeader`, no CTA — the vault's own
 * button is 24px above. The body names no entity type on purpose: the
 * superseded copy enumerated four of the five and renamed one, and the
 * enumeration is a drift surface with no upside in a five-row preview.
 *
 * The `md:py-6` companion is required, not redundant: `Empty`'s base is
 * "… p-6 … md:p-12", and tailwind-merge does NOT drop a base `p-*` when only a
 * later `py-*` arrives, so `py-6` alone leaves the primitive uncompacted at
 * `md` and above (L-07).
 */
function RecentEmpty() {
	return (
		<Empty className="py-6 md:py-6">
			<EmptyTitle>No documents yet</EmptyTitle>
			{/*
			 * `mb-0` for the same reason as the row meta line: EmptyDescription is a
			 * bare `<p>` (empty.tsx:72-81) and `globals.css:499` gives every `<p>` a
			 * 1rem bottom margin. `Empty` lays out with `gap-6`, which does not
			 * cancel margins, and this is its LAST child — so the 16px landed
			 * directly on top of the `py-6` this component sets, making the panel
			 * read as 24px above and 40px below.
			 */}
			<EmptyDescription className="mb-0">
				Documents you upload appear here, newest first.
			</EmptyDescription>
		</Empty>
	);
}

/**
 * `Item` renders a `<div>` or a radix `Slot` — there is no `as` prop — so
 * `asChild` is what makes these real `<li>` elements. Free win: `itemVariants`
 * gates its hover background behind `[a]:hover:bg-accent/50`, so a non-anchor
 * row gets no hover affordance and D-03 holds by construction.
 */
function RecentList({
	rows,
	categoryBySlug,
}: {
	rows: DocumentRow[];
	categoryBySlug: ReadonlyMap<string, string>;
}) {
	return (
		<>
			{/*
			 * These four utilities neutralize GLOBAL base rules; none is defensive
			 * noise. `globals.css:517-524` declares unscoped
			 * `ul, ol { margin: 1rem 0; padding-left: 1.5rem }` and
			 * `li { margin-bottom: 0.25rem }` inside `@layer base`, and Tailwind
			 * v4's preflight resets only `list-style` for lists (verified in the
			 * compiled bundle: `ol,ul,menu{list-style:none}` with no universal
			 * margin/padding reset anywhere), so the base rule stands.
			 *
			 * `gap-1`, NOT `space-y-1`, is the row rhythm. v4 wraps space utilities
			 * in `:where()` to make them specificity-0 — compiled as
			 * `:where(.space-y-1>:not(:last-child))` — so the `[&>li]:mb-0` needed
			 * to kill the base `li` margin (specificity 0,1,1) outranks it and
			 * silently flattens the gap to 0. `gap` is not a margin, so it cannot
			 * be beaten by a margin override; that removes the conflict instead of
			 * trading one override for another.
			 *
			 * `mt-0`, NOT `my-0`, for the same reason in the other direction. This
			 * `<ul>` is a non-last child of the `space-y-4` wrapper below, so the
			 * parent supplies its bottom margin via another specificity-0
			 * `:where()` rule; `my-0` (0,1,0) would beat it and pull the "View all
			 * documents" link flush against the last row. Only the base rule's TOP
			 * margin needs killing — the bottom is already governed.
			 *
			 * Scoped here rather than editing the global rule: that `ul, ol` block
			 * is prose styling for marketing and blog content. The vault's own
			 * lists carry the same indent — pre-existing, out of DOCS-01's scope.
			 */}
			<ul className="flex flex-col gap-1 pl-0 mt-0 [&>li]:mb-0">
				{rows.map((doc) => (
					<Item key={doc.id} asChild variant="default" size="sm">
						<li>
							{/*
							 * Default `ItemMedia` variant, NOT variant="icon": the latter's
							 * `size-8 border rounded-sm bg-muted` medallion is heavier than
							 * §I-2's plain glyph and would out-weigh the band's own rungs.
							 * The plain `File` glyph is deliberate too — the mime-derived
							 * icon helpers in `document-row.tsx` are module-private, and
							 * per-mime differentiation buys nothing across five rows.
							 */}
							<ItemMedia>
								<File
									className="size-4 text-muted-foreground"
									aria-hidden="true"
								/>
							</ItemMedia>
							{/*
							 * `min-w-0` is load-bearing, not defensive. ItemContent is
							 * `flex flex-1` (item.tsx:105-115) with no min-width of its
							 * own, so its `min-width: auto` resolves to the min-content
							 * width of a `whitespace-nowrap` title and the flex line
							 * cannot shrink — the row then overflows the card instead of
							 * ellipsising, and with no overflow-x clamp on <main> the
							 * whole page scrolls sideways on mobile.
							 */}
							<ItemContent className="min-w-0">
								{/*
								 * `font-normal`/`text-xs` overrides: the primitives default
								 * to `font-medium` and `text-sm`, and these rows are
								 * metadata (§I-8), not headings.
								 *
								 * `block w-full min-w-0` is what makes §I-2's `truncate`
								 * actually work. ItemTitle is `flex w-fit`
								 * (item.tsx:118-128), and `text-overflow: ellipsis` does
								 * not apply to a flex container's anonymous text child,
								 * while `w-fit` sizes the box to the text so
								 * `overflow: hidden` has nothing to clip — `truncate`
								 * alone is inert here. tailwind-merge resolves
								 * flex->block and w-fit->w-full (verified). Same shape the
								 * vault row uses at document-row.tsx:67-68.
								 *
								 * This matters because `documents.title` is nullable while
								 * `file_path` is NOT NULL, so the fallback renders a
								 * storage path — `{entity_type}/{entity_id}/{ts}-{name}`,
								 * around 100 characters.
								 */}
								<ItemTitle className="font-normal block w-full min-w-0 truncate">
									{doc.title ?? doc.file_path}
								</ItemTitle>
								{/*
								 * `mb-0` neutralizes the third rule from the same unscoped
								 * `@layer base` block as the `<ul>` overrides above:
								 * `globals.css:499-502` sets `p { margin-bottom: 1rem }`,
								 * and ItemDescription renders a bare `<p>` (item.tsx:130-142)
								 * with no margin utility of its own. ItemContent lays its
								 * children out with `gap-1`, and gap does not cancel
								 * margins, so without this each row carried 16px of dead
								 * space under the meta line — swamping the 4px rung the
								 * list's own `gap-1` establishes.
								 *
								 * Safe here precisely because ItemContent uses gap. Do NOT
								 * copy this onto the `<p>` in RecentError or the "Recently
								 * added" label: both are non-last children of `space-y-*`
								 * wrappers, whose margins Tailwind emits at specificity 0
								 * inside `:where()`, so an `mb-0` would outrank and flatten
								 * those rungs instead of protecting them.
								 */}
								<ItemDescription className="text-xs mb-0">
									{metaLine(doc, categoryBySlug)}
								</ItemDescription>
							</ItemContent>
						</li>
					</Item>
				))}
			</ul>
			{/*
			 * The one door, present in THIS branch only. §I-3 gives the empty and
			 * error states no CTA. `text-primary-text` and never `text-primary` for
			 * a text run — the WCAG companion-token rule (§I-9).
			 */}
			<div className="flex justify-end">
				<Link
					href="/documents/vault"
					className="text-xs font-medium text-primary-text hover:underline underline-offset-4"
				>
					View all documents
				</Link>
			</div>
		</>
	);
}

export function RecentDocumentsPanel() {
	// `isPending`, NOT `isLoading`. `isLoading === isPending && isFetching`, so a
	// query that is pending but not fetching reports `isLoading: false` with
	// `data: undefined` and falls through to `RecentEmpty` — claiming the owner
	// has no documents when we simply have not loaded them. Two reachable
	// triggers: `networkMode: "online"` (query-provider.tsx:75) parks an offline
	// query at `fetchStatus: "paused"`, and `PersistQueryClientProvider` mounts
	// from an async effect (query-provider.tsx:244) so every cold load passes
	// through an `isRestoring` window that forces `fetchStatus: "idle"`.
	// `documents-vault.client.tsx` branches on the same predicate for the same
	// reason — the two surfaces share one cache entry and must agree (SC-3).
	const { data, isPending, isError, refetch } = useQuery(
		documentSearchQueries.list({ page: 0 }),
	);
	const rows = (data?.rows ?? []).slice(0, RECENT_LIMIT);

	// Same `documentCategoryQueries.list()` entry the vault reads, so the two
	// surfaces show one owner's labels rather than one owner's and one seed's.
	// Deliberately NOT gated on its loading state: categories are decoration on a
	// metadata line, so a pending category query must never hold back rows that
	// have already loaded — `ownerCategoryLabel` falls back to the seed default
	// and then the prettifier until it resolves.
	const { categories } = useDocumentCategories();
	const categoryBySlug = useMemo(
		() => new Map(categories.map((c) => [c.slug, c.label])),
		[categories],
	);

	return (
		// `mt-4` is §I-7's 16px offset below the band rule that `page.tsx` renders
		// above this island; that rule's own `mt-6` supplies the 24px above it.
		<div className="mt-4 space-y-4">
			<p className="text-xs text-muted-foreground">Recently added</p>
			{isPending ? (
				<RecentSkeletons />
			) : isError ? (
				<RecentError
					onRetry={() => {
						void refetch();
					}}
				/>
			) : rows.length === 0 ? (
				<RecentEmpty />
			) : (
				<RecentList rows={rows} categoryBySlug={categoryBySlug} />
			)}
		</div>
	);
}
