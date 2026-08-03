/**
 * The `/documents` landing — a three-band descending-weight ladder over the
 * vault, the lease builder, and the four printable forms (DOCS-01, D-01).
 *
 * DOCS-01 SUPERSEDES what this file used to be (D-06). It previously answered
 * with a 308 to `/documents/vault`, and the comment justifying it claimed the
 * move was permanent because there was "no plan to bring back a /documents
 * index". There is now: `/documents` is the section's entry point, and the flat
 * sidebar item points here. That reversal is deliberate, not an oversight.
 *
 * `/documents/vault` stays the CANONICAL vault URL (D-05). Nothing here
 * competes with it — Band 1 links straight to it, and the page's single primary
 * button is the loudest affordance on the surface precisely so the vault stays
 * one obvious click away.
 *
 * SERVER COMPONENT. No client directive, no hooks, no database client, no
 * navigation-side-effect import. Its one and only client island is
 * `<RecentDocumentsPanel />`, nested inside the Band 1 panel below the rule.
 * The band rule is a plain `<div>`, NOT `#components/ui/separator` — that
 * primitive is `"use client"`, so importing it for a decorative line would
 * ship a second client boundary and make the sentence above false.
 *
 * Note what the purity guard in `__tests__/documents-hub.test.ts` does and does
 * not do: it greps THIS file for a `"use client"` directive, so it catches the
 * page itself going client. It cannot see a client component reached through an
 * import — that is why the `Separator` swap above is load-bearing rather than
 * cosmetic, and why this comment states the constraint the test cannot.
 *
 * This page adds no `error.tsx` of its own; it inherits `(owner)/error.tsx`,
 * which wraps every owner page including this one. What keeps a failed document
 * fetch from taking down "Open the vault" is `throwOnError: false`
 * (`query-provider.tsx:78`), which keeps query failures out of render entirely
 * so the recent list degrades in place (65-UI-SPEC §I-10).
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "#components/ui/button";
import { DocumentHubTile } from "./document-hub-tile";
import {
	DOCUMENTS_HUB_BANDS,
	DOCUMENTS_HUB_ENTRIES,
	DOCUMENTS_VAULT_ENTRY,
	type DocumentsHubBand,
	type DocumentsHubBandId,
} from "./documents-hub-entries";
import { RecentDocumentsPanel } from "./recent-documents-panel";

/** Declared once so the meta description and the visible subtitle cannot drift. */
const PAGE_SUBTITLE =
	"Your document vault, the lease builder, and printable forms.";

export const metadata: Metadata = {
	title: "Documents",
	description: PAGE_SUBTITLE,
};

/**
 * An index read on `DOCUMENTS_HUB_BANDS` is `| undefined` under
 * `noUncheckedIndexedAccess`, and neither `!` nor a type assertion may be used
 * to silence it (CLAUDE.md ZT-8). Throwing is the honest path: a band the data
 * module does not declare is a broken build, not a rendering case.
 */
function bandById(id: DocumentsHubBandId): DocumentsHubBand {
	const band = DOCUMENTS_HUB_BANDS.find((candidate) => candidate.id === id);
	if (!band) {
		throw new Error(`Unknown documents hub band: ${id}`);
	}
	return band;
}

/**
 * BAND 1 — full width, the page's only accent medallion and only primary
 * button. Its heading IS the vault entry's title (§I-4), which is why the band
 * itself carries no title of its own.
 */
function VaultBand() {
	const band = bandById("vault");
	const VaultIcon = DOCUMENTS_VAULT_ENTRY.icon;

	return (
		<section
			aria-labelledby={band.headingId}
			className="bg-card border border-border rounded-lg p-6"
		>
			<div className="flex items-start gap-4">
				<div className="size-12 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
					<VaultIcon className="size-6 text-primary" aria-hidden="true" />
				</div>
				<div className="space-y-4">
					<div className="space-y-1">
						<h2
							id={band.headingId}
							className="text-base font-semibold text-foreground"
						>
							{DOCUMENTS_VAULT_ENTRY.title}
						</h2>
						<p className="text-sm text-muted-foreground">
							{DOCUMENTS_VAULT_ENTRY.description}
						</p>
					</div>
					{/*
					 * `no-underline` on the Link, not the Button. `asChild` means the
					 * rendered element is an <a>, and `buttonVariants`' class string
					 * contains no "button" substring while Button sets no
					 * `role="button"` — so this anchor satisfies every :not() guard on
					 * globals.css's base `a` rule and picks up its always-present
					 * underline, drawn in a fully transparent colour that turns visible
					 * on hover via `text-decoration-color: currentColor`. On a filled primary
					 * button that reads as a stray white underline across the label.
					 * Every `<Button asChild><Link>` in the app has this; fixing it in
					 * `buttonVariants` would be the systemic fix but reaches far
					 * outside DOCS-01, so it is scoped here.
					 */}
					<Button asChild>
						<Link className="no-underline" href={DOCUMENTS_VAULT_ENTRY.href}>
							Open the vault
						</Link>
					</Button>
				</div>
			</div>
			{/*
			 * §I-7: 24px from the CTA to the rule, and the panel's own `mt-4`
			 * supplies the 16px below it. The rule sits outside the flex row
			 * above so it spans the panel's full width, which is what makes the
			 * recent list read as a preview OF the vault rather than a sibling
			 * surface competing with it.
			 *
			 * A plain div, not `<Separator>`: the primitive is `"use client"` and
			 * this line is decorative, so radix would buy a second client boundary
			 * on an RSC page for nothing. Classes and `role="none"` reproduce what
			 * a decorative horizontal `SeparatorPrimitive.Root` renders.
			 */}
			<div
				role="none"
				data-orientation="horizontal"
				className="bg-border shrink-0 h-px w-full mt-6"
			/>
			<RecentDocumentsPanel />
		</section>
	);
}

/** BAND 2 — one tile, stepped down to the `size-10` / `p-5` rung. */
function BuildBand() {
	const band = bandById("build");

	return (
		<section aria-labelledby={band.headingId} className="flex flex-col gap-4">
			<h2
				id={band.headingId}
				className="text-base font-semibold text-foreground"
			>
				{band.title}
			</h2>
			<div className="grid gap-4">
				{DOCUMENTS_HUB_ENTRIES.filter((entry) => entry.band === "build").map(
					(entry) => (
						<DocumentHubTile key={entry.id} entry={entry} size="md" />
					),
				)}
			</div>
		</section>
	);
}

/** BAND 3 — four tiles at the lightest rung, `size-8` / `p-4`. */
function PrintablesBand() {
	const band = bandById("printables");

	return (
		<section aria-labelledby={band.headingId} className="flex flex-col gap-4">
			<div>
				<h2
					id={band.headingId}
					className="text-base font-semibold text-foreground"
				>
					{band.title}
				</h2>
				<p className="text-sm text-muted-foreground">{band.description}</p>
			</div>
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{DOCUMENTS_HUB_ENTRIES.filter(
					(entry) => entry.band === "printables",
				).map((entry) => (
					<DocumentHubTile key={entry.id} entry={entry} size="sm" />
				))}
			</div>
		</section>
	);
}

export default function DocumentsPage() {
	return (
		<div className="p-6 lg:p-8 bg-background min-h-full space-y-8">
			<div>
				<h1 className="typography-h1">Documents</h1>
				<p className="text-sm text-muted-foreground">{PAGE_SUBTITLE}</p>
			</div>

			<VaultBand />
			<BuildBand />
			<PrintablesBand />
		</div>
	);
}
