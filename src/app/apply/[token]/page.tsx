import { AlertCircle } from "lucide-react";
import type { Metadata } from "next";
import { RentalApplicationForm } from "#components/applications/rental-application-form";
import { Card, CardContent, CardHeader, CardTitle } from "#components/ui/card";
import { TOKEN_UNAVAILABLE_COPY } from "#lib/applications/application-copy";
import {
	type ApplyContextResponse,
	type ApplyListing,
	fetchApplyContext,
	formatListingRent,
} from "./apply-context";

export const metadata: Metadata = {
	title: "Rental Application",
	description: "Submit a rental application to the property owner.",
	// D-14. The exclusion lives in the RENDERED HEAD, not in robots.txt, and the
	// difference matters: a robots.txt disallow means the crawler never fetches
	// the page, so it never reads a noindex tag — and the bare URL can still be
	// indexed from an inbound link, which is precisely where these links live
	// (a public Zillow or Craigslist listing). `/apply` is therefore deliberately
	// ABSENT from the disallow list (plan 66-03) so the crawler can reach the
	// page and read the instruction it is meant to obey.
	robots: { index: false, follow: false },
};

// The token in the URL is the entire capability, so the page must reflect LIVE
// token state: a link the owner revoked a second ago has to render unavailable
// on the very next request. A cached or statically rendered page would keep
// serving the form after revocation (T-66-38). Paired with `cache: "no-store"`
// on the context fetch — the two cover different caches (the full-route cache
// and the data cache) and neither is sufficient on its own.
export const dynamic = "force-dynamic";

/**
 * The ONE reason allowed to read differently from `TOKEN_UNAVAILABLE_COPY`,
 * because it is the only one that is not about the token at all. A dead token is
 * permanent and there is nothing the applicant can do; a transport fault is
 * recoverable and refreshing genuinely fixes it. Telling someone their link is
 * dead when our own fetch failed is a worse outcome than either.
 *
 * Local to this file rather than added to `application-copy.ts` on purpose: that
 * module holds the strings that are requirement-level or that are themselves
 * controls (APPLY-06, § 3604(c), the non-enumeration constant). This one is
 * neither, and diluting that module with ordinary UI copy weakens the signal
 * that everything in it is load-bearing.
 */
const CONTEXT_ERROR_COPY = {
	title: "We could not load this page",
	body: "Something went wrong on our end, not with your link. Refresh the page and try again.",
} as const;

export default async function ApplyPage({
	params,
}: {
	params: Promise<{ token: string }>;
}) {
	const { token } = await params;
	const context = await fetchApplyContext(token);

	// No loading state, no skeleton, no Suspense boundary: this is a Server
	// Component with force-dynamic, so the context has resolved before first
	// paint and there is no moment at which a fallback could be shown.
	return (
		<main id="main-content" className="min-h-dvh bg-muted/40 px-4 py-10">
			{/* flex flex-col gap-6. /sign puts Tailwind's vertical-space utility on
			    this exact element, and this file mirrors /sign, so this is the line
			    the trap gets copied on. v4 compiles that family inside :where() at
			    specificity 0, so any explicit margin utility on a child — and every
			    child below carries mb-0 — outranks it and flattens the whole rung to
			    zero (D-2). gap is not cancelled by a child margin, which removes the
			    conflict rather than managing it. The gate for this is a whole-file
			    grep for the utility prefix, so it is named here in prose only. */}
			<div className="mx-auto w-full max-w-2xl flex flex-col gap-6">
				<header className="flex flex-col gap-4">
					{/* font-semibold (600), one step down from /sign's font-bold (700),
					    to stay inside this phase's two-weight typography contract. */}
					<span className="text-center text-xl font-semibold tracking-tight text-foreground">
						TenantFlow
					</span>
					<div className="flex flex-col gap-3">
						{/* Visible <h1>, unlike /sign's sr-only one. An applicant arriving
						    cold from a listing has no idea what this page is; a tenant
						    clicking a link their landlord emailed them already does. */}
						<h1 className="typography-h1 text-foreground">
							Rental application
						</h1>
						{/* mb-0: this <p> is a flex item of the gap-3 column above, so the
						    unscoped base `p { margin-bottom: 1rem }` is ADDED to the item's
						    height instead of collapsing out of it (D-3). */}
						<p className="mb-0 text-sm text-muted-foreground">
							This form goes directly to the property owner. TenantFlow does not
							screen applicants.
						</p>
						{/* mb-0: same gap-3 flex column as the line above (D-3). */}
						<p className="mb-0 text-sm text-muted-foreground">
							About 5 minutes. Five short sections.
						</p>
					</div>
				</header>

				<ApplyCard context={context} token={token} />

				{/* mb-0: this <p> is a flex item of the gap-6 page column, so the base
				    <p> margin would be added to the shell's height rather than
				    collapsing away below the card (D-3). */}
				<p className="mb-0 text-center text-xs text-muted-foreground">
					Delivered directly to the property owner. TenantFlow does not screen
					applicants.
				</p>
			</div>
		</main>
	);
}

/**
 * The single card slot. Three branches and no fourth.
 */
function ApplyCard({
	context,
	token,
}: {
	context: ApplyContextResponse;
	token: string;
}) {
	// `token` is threaded down solely so the form can post it back; the shell
	// itself never renders it, and it must never appear in page output (T-66-02).
	if (context.valid)
		return <ListingCard listing={context.listing} token={token} />;

	// The only branch that renders differently, and it earns that by being the
	// only reason that carries no information about the token: our fetch failed,
	// which says nothing about whether the link is good.
	if (context.reason === "context_error") {
		return <NoticeCard {...CONTEXT_ERROR_COPY} />;
	}

	// ONE card for invalid, expired, revoked AND unit-deleted. There is
	// deliberately no switch on `context.reason` here and there must never be
	// one. get_application_context already collapses those four into a single
	// shape with NULL details, and apply-token answers 200 for every one of them
	// so a status code cannot enumerate tokens; rendering one constant is the
	// structural version of the same guarantee at the last hop. Differentiated
	// copy — "this link expired" beside "this link is not valid" — would let
	// anyone probing published listing URLs tell a real token in a dead state
	// from a token that never existed (T-66-02).
	return <NoticeCard {...TOKEN_UNAVAILABLE_COPY} />;
}

function ListingCard({
	listing,
	token,
}: {
	listing: ApplyListing;
	token: string;
}) {
	return (
		<Card>
			{/* px-4 sm:px-6 is Spacing exception 3: it reclaims 16px of field width
			    at 375px, which /sign does not need with two fields and this form
			    very much does with 26. gap-6 rather than the vertical-space utility
			    /sign uses in the same position (D-2). */}
			<CardContent className="flex flex-col gap-6 px-4 sm:px-6">
				<dl className="grid gap-3 rounded-lg border bg-background p-4 text-sm">
					<SummaryRow label="Property" value={listing.property_label} />
					<SummaryRow label="Unit" value={listing.unit_label} />
					<SummaryRow
						label="Monthly rent"
						value={formatListingRent(listing.rent_amount)}
					/>
					{/* Owner DISPLAY NAME only — never an owner email, never an owner
					    phone (UI-20). This page renders for anyone at all holding the
					    capability URL, because the URL is published to a rental listing,
					    so owner contact details here would be an unforced disclosure to
					    the entire internet. D-10 also puts the owner in control of first
					    contact, so the applicant has no use for them. The context RPC
					    does not return them and this page must not acquire them from
					    anywhere else. */}
					<SummaryRow label="Delivered to" value={listing.owner_display_name} />
				</dl>

				{/* The only client island on this page. Everything above it is
				    server-rendered and holds no state at all. */}
				<RentalApplicationForm
					token={token}
					propertyLabel={listing.property_label}
					unitLabel={listing.unit_label}
				/>
			</CardContent>
		</Card>
	);
}

function SummaryRow({ label, value }: { label: string; value: string | null }) {
	// A-5: a row with no value is OMITTED entirely. /sign falls back to "N/A" and
	// that fallback is deliberately not ported — "N/A" on a public listing
	// summary reads as a broken page to someone who has never seen this product.
	if (value === null) return null;
	return (
		<div className="flex items-start justify-between gap-4">
			{/* No font-medium on the <dt>. /sign uses it, but 500 is outside this
			    phase's declared 400/600 two-weight contract and the three sanctioned
			    weight exceptions are all inherited primitives, not authored markup.
			    The label/value distinction is carried by the colour token instead. */}
			<dt className="text-muted-foreground">{label}</dt>
			<dd className="text-right text-foreground">{value}</dd>
		</div>
	);
}

function NoticeCard({ title, body }: { title: string; body: string }) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					{/* text-warning sits on the ICON and only the icon. A vivid token on
					    a text run fails WCAG AA in one theme or the other and is a
					    blocking violation in this phase (UI-SPEC Color). This is a Card,
					    not an Alert, so the Alert primitive's [&>svg]:text-current does
					    not apply and the class actually lands. */}
					<AlertCircle className="size-5 text-warning" />
					{title}
				</CardTitle>
			</CardHeader>
			<CardContent>
				{/* mb-0: CardContent is a flex item of the Card, and a flex item
				    establishes its own block formatting context, so this <p>'s base
				    1rem bottom margin cannot collapse out through it — it would be
				    added on top of the Card's own py-6 (D-3). */}
				<p className="mb-0 text-sm text-muted-foreground">{body}</p>
			</CardContent>
		</Card>
	);
}
