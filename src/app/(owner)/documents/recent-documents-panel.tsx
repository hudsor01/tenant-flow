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
function metaLine(doc: DocumentRow): string {
	const label = categoryLabel(doc.document_type);
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
			<EmptyDescription>
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
function RecentList({ rows }: { rows: DocumentRow[] }) {
	return (
		<>
			<ul className="space-y-1">
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
							<ItemContent>
								{/* Both overrides are required: the primitives default to
								    `font-medium` and `text-sm`, and these rows are metadata
								    (§I-8), not headings. */}
								<ItemTitle className="font-normal truncate">
									{doc.title ?? doc.file_path}
								</ItemTitle>
								<ItemDescription className="text-xs">
									{metaLine(doc)}
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
				<RecentList rows={rows} />
			)}
		</div>
	);
}
