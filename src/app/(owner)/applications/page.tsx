/**
 * `/applications` — the owner review queue (APPLY-03, UI-SPEC §B-2).
 *
 * THIS FILE IS WHAT MAKES THE NAV ENTRY STOP 404ING. The sidebar and the Cmd+K
 * palette have pointed at `/applications` since wave 1, and `/applications` has
 * been in `PRIVATE_ROUTE_PREFIXES` since then too — deliberately in that order,
 * because the `(owner)` directory group does not appear in the URL and confers
 * no gate at all. The deny-list in `src/lib/routes/private-routes.ts` is the
 * whole gate. Shipping the page first would have served an authenticated
 * surface publicly for however many commits it took to notice.
 *
 * A SERVER COMPONENT. No hooks, no database client, no browser API. It mounts
 * exactly two client islands — `<ApplicationQueue />`, which holds the filter
 * state and the queue query, and `<ApplicationLinkPanel />`, which holds the
 * clipboard, the revoke dialog and the two link mutations. The band shell around
 * the second one stays here on the server because a `<section>`, an `<h2>` and a
 * paragraph need no interactivity.
 *
 * BAND ORDER: QUEUE FIRST, LINKS SECOND. A returning owner opens this page to
 * read applications; a brand-new owner has none. Weight follows the common
 * case, and the first-run case is carried by the queue's own zero-applications
 * state, whose primary button scrolls to the links band. That is why the queue
 * is not wrapped in a card while the links band is — the queue IS the page, and
 * putting the primary content in a card next to a carded secondary band would
 * flatten exactly the hierarchy this composition depends on.
 *
 * NO ERROR BOUNDARY OF ITS OWN. This page inherits `(owner)/error.tsx`, and the
 * queue degrades in place on a failed load (`throwOnError: false` in
 * `query-provider.tsx`). A boundary here would swap the whole route for an error
 * card and take the links band down with it — and that band is the one thing a
 * first-run owner actually needs.
 */

import type { Metadata } from "next";
import { ApplicationLinkPanel } from "#components/applications/application-link-panel";
import { ApplicationQueue } from "#components/applications/application-queue";

/** Declared once so the meta description and the visible subtitle cannot drift. */
const PAGE_SUBTITLE =
	"Review applicants for your vacant units and turn approvals into tenant records.";

export const metadata: Metadata = {
	title: "Applications",
	description: PAGE_SUBTITLE,
};

export default function ApplicationsPage() {
	return (
		// `flex flex-col gap-8`, never the margin-based spacing utility: Tailwind v4
		// emits that one inside `:where()` at specificity 0, so any explicit margin
		// utility on a child outranks it and flattens the rung (§D-2).
		<div className="p-6 lg:p-8 bg-background min-h-full flex flex-col gap-8">
			<div className="flex flex-col gap-1">
				<h1 className="typography-h1">Applications</h1>
				{/*
				 * `mb-0` because this `<p>` is a flex item of the `gap-1` header box,
				 * which is itself a flex item of the `gap-8` shell. A flex item
				 * establishes an independent formatting context, so the unscoped base
				 * `p { margin-bottom: 1rem }` at globals.css:499 cannot collapse out of
				 * it — the 16px is added to the header's height and then `gap-8` adds
				 * its own 32px on top, putting 48px between the subtitle and the queue
				 * where the composition asks for 32 (§D-3).
				 */}
				<p className="text-sm text-muted-foreground mb-0">{PAGE_SUBTITLE}</p>
			</div>

			<ApplicationQueue />

			{/*
			 * BAND 2 — application links (§C).
			 *
			 * The `id` is load-bearing, not decorative: the queue's zero-applications
			 * empty state carries the primary `Create an application link` button,
			 * and that button resolves this element by id, scrolls to it and focuses
			 * it. Renaming the id silently turns that CTA into a no-op — the handler
			 * guards on a missing element rather than throwing, so nothing would
			 * fail visibly.
			 *
			 * `tabIndex={-1}` is what makes the second half of that CTA real. A
			 * `<section>` is not focusable by default, so `.focus()` on it is a
			 * silent no-op: a sighted mouse user sees the smooth scroll while a
			 * keyboard or screen-reader user is left at the top of the page with
			 * focus unmoved, which is the failure mode "scroll to" affordances
			 * classically ship. `aria-labelledby` then gives the landed-on region a
			 * name to announce instead of an anonymous group.
			 */}
			<section
				id="application-links"
				tabIndex={-1}
				aria-labelledby="application-links-heading"
				className="rounded-lg border bg-card p-6 flex flex-col gap-4"
			>
				<h2
					id="application-links-heading"
					className="text-base font-semibold text-foreground"
				>
					Application links
				</h2>
				{/*
				 * `mb-0`: this `<p>` is a flex item of the band's own `gap-4` box, and
				 * a flex item establishes an independent formatting context, so the
				 * unscoped base `p { margin-bottom: 1rem }` at globals.css:499 cannot
				 * collapse out of it — the 16px is added to the item's height on top
				 * of the 16px gap that already spaces it (§D-3).
				 */}
				<p className="text-sm text-muted-foreground mb-0">
					Post one link per vacant unit. Anyone with the link can apply. You can
					revoke a link at any time.
				</p>
				<ApplicationLinkPanel />
			</section>
		</div>
	);
}
