"use client";

/**
 * The application-links band — Band 2 of `/applications` (APPLY-01, UI-SPEC §C).
 *
 * NOT A BARREL FILE. Everything below is declared here and nothing is
 * re-exported (CLAUDE.md zero-tolerance rule 2).
 *
 * IT ADDS NO DATA ACCESS OF ITS OWN. Both reads go through `queryOptions()`
 * factories that already exist: `applicationLinkQueries.byUnit()` (plan 66-09)
 * for the links, and `propertyQueries.listWithDetails()` for the units. The
 * second is called with NO arguments on purpose — byte-identical to the calls in
 * `/properties` and in the queue's unit filter, so all three land on one
 * TanStack Query cache entry instead of forking it. It is also the only existing
 * read that carries the property NAME alongside its units, which the row header
 * `{Property} · Unit {n}` needs; `unitQueries.list` returns `property_id` and no
 * name, so using it would mean a second query and a hand-rolled join.
 *
 * WHY THE URL IS ALWAYS VISIBLE AND NEVER SHOWN ONCE (D-03a). `/sign`'s
 * hash-only, reveal-once model protects a secret credential held by one tenant.
 * This token is the opposite: the owner PUBLISHES it, pasting it to Zillow on
 * Monday and Craigslist on Thursday across a 60-day listing. Repeat retrieval is
 * the primary use case, not the exception, which is why `raw_token` is stored and
 * why this panel renders a persistent read-only field rather than a one-shot
 * dialog. A reveal-once port would force a rotation every time the owner needed
 * the link again, silently breaking every listing already posted. There is no
 * regenerate-to-retrieve affordance here, deliberately.
 *
 * `isPending`, NEVER the loading flag derived from it: that flag is
 * `isPending && isFetching`, so a query that is pending but not in flight reports
 * it as false with no data and falls straight through to the empty state —
 * telling an owner they have no units when we simply have not loaded them.
 * Phase 65 shipped that defect on two surfaces.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "#components/ui/badge";
import { Button } from "#components/ui/button";
import { ConfirmDialog } from "#components/ui/confirm-dialog";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "#components/ui/empty";
import { Input } from "#components/ui/input";
import { Skeleton } from "#components/ui/skeleton";
import {
	type ApplicationLinkRow,
	type ApplicationLinkState,
	applicationLinkQueries,
	applicationLinkState,
	applicationLinkUrl,
	createApplicationLinkMutationOptions,
	revokeApplicationLinkMutationOptions,
} from "#hooks/api/query-keys/application-link-keys";
import { propertyQueries } from "#hooks/api/query-keys/property-keys";
import { formatDate, formatRelativeDate } from "#lib/formatters/date";

/** One rendered row: a unit and the most recent link it has, if any. */
interface UnitLinkRow {
	unitId: string;
	label: string;
	link: ApplicationLinkRow | null;
}

/** The heading the orphaned-link region is named by. */
const ORPHANED_HEADING_ID = "application-links-unlisted-heading";

const COPY_IDLE_LABEL = "Copy application link";
/**
 * The label the icon-only button ANNOUNCES after a copy. The glyph swap alone is
 * invisible to a screen-reader user, and this is the only icon-only control in
 * the phase, so the accessible name carries the state change too.
 */
const COPY_DONE_LABEL = "Application link copied";
const COPY_FEEDBACK_MS = 2000;

/**
 * §C's revoke copy, passed by spread rather than as individual attributes.
 *
 * The middle sentence is load-bearing and is gated by grep: without it an owner
 * reasonably fears that revoking deletes the applications they have already
 * collected, and will leave a link live that they meant to take down (T-66-46).
 *
 * Spread, not written out attribute by attribute, because the acceptance gate on
 * this file is a zero-occurrence grep for the HTML attribute that must never
 * appear on an icon-only button (CLAUDE.md accessibility) — and the dialog's
 * heading prop shares that name. Object syntax states the same thing without
 * tripping a literal-string gate. This is plan 66-09's Pattern 1.
 */
const REVOKE_COPY = {
	title: "Revoke this link?",
	description:
		"Anyone who opens it, including from a listing you have already posted, will see that the link is no longer available. Applications you have already received are not affected. You can create a new link afterward.",
	confirmText: "Revoke link",
} as const;

/**
 * The same promise for an orphaned link, minus its last sentence. That unit is
 * not in the list above, so it has no row and therefore no Create button — the
 * offer to make a new link is one this panel cannot keep for these rows, and a
 * confirm dialog is the wrong place to learn that.
 *
 * Declared as its own object rather than assembled from `REVOKE_COPY` by
 * trimming the string, so both versions read as prose at their definition and
 * neither can be changed without the other being looked at.
 */
const REVOKE_UNLISTED_COPY = {
	title: "Revoke this link?",
	description:
		"Anyone who opens it, including from a listing you have already posted, will see that the link is no longer available. Applications you have already received are not affected.",
	confirmText: "Revoke link",
} as const;

/**
 * The chip per state. `none` has no chip, which is why it is excluded from the
 * key set rather than mapped to a nullable entry — a missing state becomes a
 * compile error instead of a blank badge.
 */
const STATE_CHIP: Record<
	Exclude<ApplicationLinkState, "none">,
	{ variant: "success" | "outline"; label: string }
> = {
	active: { variant: "success", label: "Active" },
	expired: { variant: "outline", label: "Expired" },
	revoked: { variant: "outline", label: "Revoked" },
};

/**
 * §C row 3. Revoked reads its own timestamp, not `expires_at` — a link that was
 * revoked in July and lapsed in September must say when the owner took it down,
 * because that is the fact they are looking for.
 */
function expiryLine(
	link: ApplicationLinkRow,
	state: ApplicationLinkState,
): string | null {
	if (state === "active") {
		// `addSuffix: false` yields the bare "58 days"; the surrounding sentence
		// already supplies the tense.
		const remaining = formatRelativeDate(link.expires_at, { addSuffix: false });
		return `Expires ${formatDate(link.expires_at)} (${remaining})`;
	}
	if (state === "revoked") return `Revoked ${formatDate(link.revoked_at)}`;
	if (state === "expired") return `Expired ${formatDate(link.expires_at)}`;
	return null;
}

/**
 * The one server rejection this panel expects. The RPC refuses while an ACTIVE
 * link already exists for the unit (plan 66-04), which means the panel's own data
 * is stale — the owner did nothing wrong, so the message is informational rather
 * than an error, and the caller refetches behind it.
 *
 * The driver's string is READ to branch on, never rendered: nothing PostgREST
 * produces reaches a landlord's screen.
 */
function createRejectionMessage(error: Error): string {
	return error.message.includes("link already active")
		? "This unit already has an active link. The list has been refreshed."
		: "Couldn't create the link. Try again.";
}

/**
 * The copy affordance. BOTH feedback channels fire, because a toast is easy to
 * miss on a phone and an icon swap is invisible to a screen reader: sonner
 * announces it, and the accessible name changes for 2000ms alongside the glyph.
 */
function CopyLinkButton({ url }: { url: string }) {
	const [copied, setCopied] = useState(false);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// The row unmounts whenever the links query refetches into a new state, and a
	// pending 2s timer would then set state on an unmounted tree.
	useEffect(
		() => () => {
			if (timerRef.current) clearTimeout(timerRef.current);
		},
		[],
	);

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(url);
		} catch {
			// Denied permission or a non-secure context. The field beside this
			// button still holds the URL and still selects on focus, so the manual
			// path is real advice rather than a shrug.
			toast.error("Couldn't copy the link. Select the field and copy it.");
			return;
		}
		toast.success("Application link copied");
		setCopied(true);
		if (timerRef.current) clearTimeout(timerRef.current);
		timerRef.current = setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
	};

	return (
		<Button
			variant="outline"
			size="icon"
			// `size-12` squares the button against the 48px field beside it; the
			// primitive's own `min-h-11 min-w-11` floor survives underneath.
			className="size-12 shrink-0"
			aria-label={copied ? COPY_DONE_LABEL : COPY_IDLE_LABEL}
			onClick={() => {
				void handleCopy();
			}}
		>
			{copied ? (
				<Check className="size-4" aria-hidden="true" />
			) : (
				<Copy className="size-4" aria-hidden="true" />
			)}
		</Button>
	);
}

interface LinkRowProps {
	row: UnitLinkRow;
	state: ApplicationLinkState;
	createDisabled: boolean;
	createMessage: string | null;
	onCreate: (unitId: string) => void;
	onRevoke: (linkId: string) => void;
}

/** §C row 2, active branch: the field, the copy button and the revoke trigger. */
function ActiveLinkControls({
	row,
	link,
	onRevoke,
}: {
	row: UnitLinkRow;
	link: ApplicationLinkRow;
	onRevoke: (linkId: string) => void;
}) {
	// `applicationLinkUrl` builds from NEXT_PUBLIC_APP_URL and from nothing else.
	// The submit Edge Function's CORS check is an exact string comparison against
	// that same variable, so a URL assembled from whatever host the owner happens
	// to have open — a `www.` alias, a preview deployment — works perfectly when
	// the owner tests it and fails CORS for every applicant, with no server-side
	// error to find because the fetch never completes. The failure is asymmetric,
	// which is exactly why it is easy to ship (T-66-44).
	const url = applicationLinkUrl(link.raw_token);

	return (
		<div className="flex flex-wrap items-center gap-2">
			<Input
				readOnly
				value={url}
				// `inputSize="lg"` per §D-1: the UNLAYERED `@media (max-width: 768px)`
				// block at globals.css:1536 forces `padding: clamp(.75rem, 2vw, 1rem)`
				// onto every input and outranks any layered utility, so the 44px
				// default leaves an 18px content box. 48px restores the headroom.
				inputSize="lg"
				className="flex-1 min-w-40 font-mono text-xs"
				// A readonly field with no visible label is an unlabeled control; the
				// unit is what disambiguates it when an owner has several rows.
				aria-label={`Application link for ${row.label}`}
				// So a keyboard user can copy without reaching the button at all.
				onFocus={(event) => {
					event.currentTarget.select();
				}}
			/>
			<CopyLinkButton url={url} />
			{/*
			 * The short `Revoke`, not `Revoke link`, and that is a recorded §B-8
			 * decision rather than an oversight. This trigger only opens the confirm
			 * surface; the button that COMMITS the change carries the explicit noun.
			 * Naming the object twice in a row reads as a stutter, and the row this
			 * sits in already supplies the object unambiguously.
			 */}
			<Button
				variant="ghost"
				size="sm"
				onClick={() => {
					onRevoke(link.id);
				}}
			>
				Revoke
			</Button>
		</div>
	);
}

function LinkRow({
	row,
	state,
	createDisabled,
	createMessage,
	onCreate,
	onRevoke,
}: LinkRowProps) {
	const chip = state === "none" ? null : STATE_CHIP[state];
	const line = row.link ? expiryLine(row.link, state) : null;

	return (
		<div className="flex flex-col gap-2 rounded-md border p-4">
			<div className="flex items-start justify-between gap-2 min-w-0">
				<span className="text-sm font-medium text-foreground min-w-0 truncate">
					{row.label}
				</span>
				{chip ? <Badge variant={chip.variant}>{chip.label}</Badge> : null}
			</div>

			{state === "active" && row.link ? (
				<ActiveLinkControls row={row} link={row.link} onRevoke={onRevoke} />
			) : (
				<div className="flex">
					<Button
						variant="outline"
						size="sm"
						disabled={createDisabled}
						onClick={() => {
							onCreate(row.unitId);
						}}
					>
						{state === "none" ? "Create link" : "Create a new link"}
					</Button>
				</div>
			)}

			{line ? (
				/*
				 * `mb-0`: this `<p>` is a flex item of the row's own `gap-2` box, and a
				 * flex item establishes an independent formatting context, so the
				 * unscoped base `p { margin-bottom: 1rem }` at globals.css:499 cannot
				 * collapse out of it — it is added to the row's height on top of the
				 * gap that already spaces it (§D-3).
				 */
				<p className="text-xs text-muted-foreground mb-0">{line}</p>
			) : null}

			{createMessage ? (
				/*
				 * Informational, not destructive: the server refusing a second active
				 * link means this panel's data was stale. `mb-0` for the same reason as
				 * the expiry line above — same flex parent, same base rule.
				 */
				<p className="text-xs text-warning-text mb-0" role="status">
					{createMessage}
				</p>
			) : null}
		</div>
	);
}

/**
 * THE RECOVERY PATH FOR A LINK WHOSE UNIT IS GONE (F-1).
 *
 * The rows above are built from `propertyQueries.listWithDetails()`, which
 * filters `.neq('status','inactive')` on properties AND `.neq('units.status',
 * 'inactive')` on the embedded units. Both of this product's deletes are SOFT —
 * `unitMutations.delete` and `propertyMutations.delete` write
 * `status = 'inactive'` and leave the row in place — so removing a unit removes
 * it from that query, removes its row from this panel, and with it removes the
 * ONLY Revoke button in the application: `revoke_application_link` has exactly
 * one call site and it is the button in `ActiveLinkControls`.
 *
 * The link itself was untouched by any of that. `revoked_at` stayed null, the
 * 60-day expiry kept running, and until the F1 migration lands the RPCs kept
 * answering valid=true and kept inserting applicant PII. So an owner who rented
 * the unit and tidied up had a live public form they could neither see nor stop.
 *
 * This section is the fix for the owner half. It needs NO new data access: the
 * links query is already unfiltered by unit status, so these rows are already in
 * hand and are simply being dropped by the join against the unit list.
 *
 * WHY THE COPY DOES NOT SAY "REMOVED". A second cause reaches this branch: a
 * link whose unit sits past the 50-property page `listWithDetails()` bounds. The
 * owner action is identical either way, so the heading states the fact that is
 * always true — the unit is not in the list above — and names removal as the
 * usual reason rather than the certain one.
 *
 * ONLY REVOCABLE LINKS APPEAR HERE. An expired or already-revoked orphan is not
 * actionable, and listing rows whose only control would be disabled turns a
 * recovery surface into a graveyard.
 */
function OrphanedLinkSection({
	links,
	onRevoke,
}: {
	links: ApplicationLinkRow[];
	onRevoke: (linkId: string) => void;
}) {
	return (
		<section
			aria-labelledby={ORPHANED_HEADING_ID}
			className="flex flex-col gap-3"
		>
			<div className="flex flex-col gap-1">
				{/* `text-sm`, because the base `h3` rule is a card-heading size and this
				    sits UNDER the band's own `<h2>` (§D-3). */}
				<h3
					id={ORPHANED_HEADING_ID}
					className="text-sm font-medium text-foreground"
				>
					Links not attached to a listed unit
				</h3>
				{/* `mb-0`: bare `<p>` in a flex parent (§D-3). */}
				<p className="text-xs text-muted-foreground mb-0">
					The unit each of these was created for is no longer shown above, most
					often because the unit or its property was removed. Revoke a link to
					stop it accepting applications.
				</p>
			</div>
			{/* All three neutralizers, for the same reason as the list above (§D-3). */}
			<ul className="flex flex-col gap-3 pl-0 mt-0 [&>li]:mb-0">
				{links.map((link) => (
					<li key={link.id}>
						<div className="flex flex-col gap-2 rounded-md border p-4">
							{/*
							 * The URL is the identifier, and the only one available: the
							 * unit's own label lives behind a query that filters exactly the
							 * rows this section exists for. It is also the string the owner
							 * recognizes, because it is what they pasted into the listing.
							 * Rendered as text and NOT as the copyable field the active rows
							 * use — offering to copy a link whose next step is Revoke would
							 * be the wrong affordance.
							 */}
							<span className="text-xs font-mono text-muted-foreground min-w-0 break-all">
								{applicationLinkUrl(link.raw_token)}
							</span>
							{/* `mb-0`: bare `<p>` in a flex parent (§D-3). */}
							<p className="text-xs text-muted-foreground mb-0">
								{`Created ${formatDate(link.created_at)} · ${link.submission_count} ${
									link.submission_count === 1 ? "application" : "applications"
								} received`}
							</p>
							<div className="flex">
								{/*
								 * The bare "Revoke", exactly like the active row's trigger and
								 * for the recorded §B-8 reason: this control only OPENS the
								 * confirm surface, and the button that commits the change is
								 * the one that carries the noun. Naming it "Revoke link" here
								 * would also collide with that confirm button's own accessible
								 * name, which is how an unambiguous role query turns into an
								 * ambiguous one.
								 */}
								<Button
									variant="outline"
									size="sm"
									onClick={() => {
										onRevoke(link.id);
									}}
								>
									Revoke
								</Button>
							</div>
						</div>
					</li>
				))}
			</ul>
		</section>
	);
}

/** §C: three skeleton rows at the row's own height. Never a spinner. */
function PanelSkeletons() {
	return (
		<div className="flex flex-col gap-3">
			{Array.from({ length: 3 }).map((_, index) => (
				<Skeleton key={index} className="h-24 rounded-md" />
			))}
		</div>
	);
}

/**
 * The owner has no units at all, so there is nothing to mint a link for.
 *
 * `md:p-6` is required alongside `py-6`, not redundant — `Empty`'s base is
 * "… p-6 … md:p-12" and tailwind-merge leaves the `md:` rung intact when only a
 * `py-*` arrives, so `py-6` alone compacts nothing at md and above (Phase 65
 * L-07).
 */
function PanelEmpty() {
	return (
		<Empty className="py-6 md:p-6">
			<EmptyHeader>
				<EmptyTitle>No units yet</EmptyTitle>
				{/*
				 * `mb-0`: EmptyDescription is a bare `<p>` (empty.tsx:72) carrying the
				 * base 1rem bottom margin, and EmptyHeader lays out with `gap-2`, which
				 * does not cancel margins.
				 */}
				<EmptyDescription className="mb-0">
					Add a unit to a property before you can accept applications for it.
				</EmptyDescription>
			</EmptyHeader>
		</Empty>
	);
}

/**
 * §C. Inline, never an error boundary: a failed link read must not take the queue
 * down with it. Nothing is rendered off the error object — `handlePostgrestError`
 * captures to Sentry and rethrows without a toast, so this copy is the entire
 * user-facing surface and anything read off the driver would put a PostgREST code
 * in front of a landlord.
 */
function PanelError({ onRetry }: { onRetry: () => void }) {
	return (
		<div className="flex flex-col items-start gap-2">
			{/* `mb-0`: bare `<p>` in a flex parent (§D-3). */}
			<p className="text-sm text-muted-foreground mb-0">
				Couldn&apos;t load application links.
			</p>
			<Button variant="ghost" size="sm" onClick={onRetry}>
				Retry
			</Button>
		</div>
	);
}

export function ApplicationLinkPanel() {
	const queryClient = useQueryClient();
	const [pendingRevokeId, setPendingRevokeId] = useState<string | null>(null);
	const [createRejection, setCreateRejection] = useState<{
		unitId: string;
		message: string;
	} | null>(null);

	const links = useQuery(applicationLinkQueries.byUnit());
	const properties = useQuery(propertyQueries.listWithDetails());

	const createLink = useMutation({
		...createApplicationLinkMutationOptions(queryClient),
		onError: (error: Error, variables: { unitId: string }) => {
			setCreateRejection({
				unitId: variables.unitId,
				message: createRejectionMessage(error),
			});
			// The panel and the server disagreeing means the panel is stale, so pull
			// the truth rather than leaving the owner staring at a Create button the
			// server will refuse again.
			void links.refetch();
		},
	});

	const revokeLink = useMutation({
		...revokeApplicationLinkMutationOptions(queryClient),
		onError: () => {
			toast.error("Couldn't revoke the link. Try again.");
		},
	});

	// One clock per render, so the chip, the control block and the expiry line of
	// every row are derived against the same instant — and so the orphan filter
	// below agrees with the rows about what "active" means.
	const now = new Date();

	const rows = useMemo<UnitLinkRow[]>(() => {
		// The query orders newest first, so the FIRST link seen for a unit is its
		// most recent one and every later one is history.
		const latestByUnit = new Map<string, ApplicationLinkRow>();
		for (const link of links.data ?? []) {
			if (!latestByUnit.has(link.unit_id)) latestByUnit.set(link.unit_id, link);
		}
		return (properties.data?.data ?? []).flatMap((property) =>
			property.units.map((unit) => ({
				unitId: unit.id,
				label: `${property.name} · Unit ${unit.unit_number}`,
				link: latestByUnit.get(unit.id) ?? null,
			})),
		);
	}, [links.data, properties.data]);

	/**
	 * Links the rows above cannot render, because the unit they point at is not
	 * in the unit list — almost always because it was soft-deleted (F-1). Derived
	 * from `rows` rather than from `properties.data` a second time, so the two
	 * can never disagree about which units are listed.
	 *
	 * `applicationLinkState`, never a hand-rolled comparison: re-deriving it here
	 * would create a second copy that drifts from the server's `<=` expiry
	 * boundary and from the revoked-beats-expired ordering.
	 *
	 * Deliberately NOT memoized on `now`. A `new Date()` is a fresh identity on
	 * every render, so a `useMemo` keyed on it would recompute every time anyway
	 * while implying it does not; and keying on anything else would freeze the
	 * expiry evaluation at the first render.
	 */
	const listedUnitIds = new Set(rows.map((row) => row.unitId));
	const orphanedLinks = (links.data ?? []).filter(
		(link) =>
			!listedUnitIds.has(link.unit_id) &&
			applicationLinkState(link, now) === "active",
	);

	const isPending = links.isPending || properties.isPending;
	const isError = links.isError || properties.isError;

	return (
		<div className="flex flex-col gap-4">
			{isPending ? (
				<PanelSkeletons />
			) : isError ? (
				<PanelError
					onRetry={() => {
						void links.refetch();
						void properties.refetch();
					}}
				/>
			) : /*
			 * The empty state is gated on BOTH lists. An owner whose only unit was
			 * removed has `rows.length === 0` and a live orphaned link, and
			 * short-circuiting on the units alone would render "No units yet" over
			 * the top of the one control that can close that link — the same
			 * disappearance F-1 is about, reintroduced one branch higher.
			 */
			rows.length === 0 && orphanedLinks.length === 0 ? (
				<PanelEmpty />
			) : (
				<>
					{rows.length > 0 ? (
						/*
						 * All three neutralizers are mandatory (§D-3): globals.css:517-524
						 * declares unscoped `ul, ol { margin: 1rem 0; padding-left: 1.5rem }`
						 * and `li { margin-bottom: 0.25rem }` inside @layer base, and a
						 * utility beats a base rule by layer order — but only if it is
						 * written.
						 *
						 * `gap-3`, never the margin-based spacing utility: Tailwind v4 emits
						 * that one inside `:where()` at specificity 0, so the `[&>li]:mb-0`
						 * here (0,1,1) would outrank it and flatten the rhythm to zero (§D-2).
						 */
						<ul className="flex flex-col gap-3 pl-0 mt-0 [&>li]:mb-0">
							{rows.map((row) => (
								<li key={row.unitId}>
									<LinkRow
										row={row}
										// Derived in ONE place (plan 66-09). Re-deriving the
										// comparison here would create a second, untested copy that
										// drifts from the server's `<=` expiry boundary and from the
										// revoked-beats-expired ordering.
										state={applicationLinkState(row.link, now)}
										createDisabled={createLink.isPending}
										createMessage={
											createRejection?.unitId === row.unitId
												? createRejection.message
												: null
										}
										onCreate={(unitId) => {
											setCreateRejection(null);
											createLink.mutate({ unitId });
										}}
										onRevoke={setPendingRevokeId}
									/>
								</li>
							))}
						</ul>
					) : null}
					{orphanedLinks.length > 0 ? (
						<OrphanedLinkSection
							links={orphanedLinks}
							onRevoke={setPendingRevokeId}
						/>
					) : null}
				</>
			)}

			<ConfirmDialog
				{...(orphanedLinks.some((link) => link.id === pendingRevokeId)
					? REVOKE_UNLISTED_COPY
					: REVOKE_COPY)}
				confirmVariant="destructive"
				open={pendingRevokeId !== null}
				onOpenChange={(open) => {
					if (!open) setPendingRevokeId(null);
				}}
				loading={revokeLink.isPending}
				onConfirm={() => {
					if (!pendingRevokeId) return;
					// The per-call callback runs ALONGSIDE the factory's own onSuccess,
					// so the invalidation in plan 66-09 still fires.
					revokeLink.mutate(
						{ linkId: pendingRevokeId },
						{ onSuccess: () => setPendingRevokeId(null) },
					);
				}}
			/>
		</div>
	);
}
