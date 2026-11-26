import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageLayout } from "#components/layout/page-layout";
import { JsonLdScript } from "#components/seo/json-ld-script";
import { BlurFade } from "#components/ui/blur-fade";
import { ScrollRegion } from "#components/ui/scroll-region";
import { clickTrackAttributes } from "#lib/analytics/cta-attributes";
import { createBreadcrumbJsonLd } from "#lib/seo/breadcrumbs";
import { createItemListJsonLd } from "#lib/seo/collection-schema";
import { createPageMetadata } from "#lib/seo/page-metadata";

import type { CompareSummary } from "#types/sections/compare";
import {
	COMPETITORS,
	TENANTFLOW_SUMMARY,
	VALID_COMPETITORS,
} from "./[competitor]/compare-data";
import { formatCheckedMonth } from "./[competitor]/compare-sections";

// ISR — competitor list is static; 1h revalidate covers card-copy edits.
export const revalidate = 3600;

export const metadata: Metadata = createPageMetadata({
	title: "Compare to Other Property Management Software",
	description:
		"Side-by-side comparisons of TenantFlow against Buildium, AppFolio, and RentRedi on pricing, features, and the landlord-only model.",
	path: "/compare",
	ogCard: "compare-overview",
});

/** The summary table's columns (2026-11-24 SEO audit C6). */
const SUMMARY_COLUMNS: { key: keyof CompareSummary; label: string }[] = [
	{ key: "startingPrice", label: "Starting price" },
	{ key: "minimum", label: "Unit minimum" },
	{ key: "tenantAccess", label: "Tenant portal or app" },
	{ key: "rentPayments", label: "Rent payments" },
	{ key: "leaseESign", label: "Lease e-sign" },
	{ key: "documents", label: "Document storage" },
];

export default function ComparePage() {
	const competitors = VALID_COMPETITORS.map((slug) => COMPETITORS[slug]).filter(
		(competitor): competitor is NonNullable<typeof competitor> =>
			competitor !== undefined,
	);

	// The caption dates the table by its least recently checked figures.
	const oldestCheck = competitors
		.map((competitor) => competitor.checkedAt)
		.sort()[0];

	return (
		<PageLayout>
			<JsonLdScript schema={createBreadcrumbJsonLd("/compare")} />
			<JsonLdScript
				schema={createItemListJsonLd(
					VALID_COMPETITORS.flatMap((slug) => {
						const competitor = COMPETITORS[slug];
						return competitor
							? [
									{
										name: `TenantFlow vs ${competitor.name}`,
										path: `/compare/${slug}`,
									},
								]
							: [];
					}),
				)}
			/>

			<section className="section-spacing">
				<div className="max-w-7xl mx-auto px-6 lg:px-8">
					<BlurFade delay={0.1}>
						<header className="mb-12 max-w-3xl">
							<h1 className="text-4xl md:text-5xl font-bold tracking-tight">
								Property management software compared: TenantFlow vs Buildium,
								AppFolio and RentRedi
							</h1>
							<p className="mt-4 text-lg text-muted-foreground">
								Honest, side-by-side comparisons. Pick your current platform to
								see how TenantFlow compares on pricing, features, and the
								landlord-only model.
							</p>
						</header>
					</BlurFade>

					<BlurFade delay={0.12}>
						<div className="mb-12">
							<h2 className="mb-4 text-2xl font-semibold tracking-tight">
								At a glance
							</h2>
							{/* Wide on a phone: the table scrolls inside its own box,
							    which a keyboard can reach while it does. */}
							<ScrollRegion className="overflow-x-auto rounded-lg border bg-card">
								<table className="w-full min-w-5xl border-collapse text-left text-sm">
									<caption className="caption-bottom px-4 py-3 text-left text-xs text-muted-foreground">
										Competitor figures from each vendor&apos;s own pricing page
										{oldestCheck
											? `, as of ${formatCheckedMonth(oldestCheck)}`
											: ""}
										.
									</caption>
									<thead>
										<tr className="border-b">
											{/* The product column stays put while the table
											    scrolls sideways on a phone. */}
											<th
												scope="col"
												className="sticky left-0 z-10 px-4 py-3 font-semibold"
											>
												Product
											</th>
											{SUMMARY_COLUMNS.map((column) => (
												<th
													key={column.key}
													scope="col"
													className="px-4 py-3 font-semibold"
												>
													{column.label}
												</th>
											))}
										</tr>
									</thead>
									<tbody>
										{[
											{ name: "TenantFlow", summary: TENANTFLOW_SUMMARY },
											...competitors.map((competitor) => ({
												name: competitor.name,
												summary: competitor.summary,
											})),
										].map((row) => (
											<tr key={row.name} className="border-b last:border-b-0">
												<th
													scope="row"
													className="sticky left-0 z-10 px-4 py-3 align-top font-semibold text-foreground"
												>
													{row.name}
												</th>
												{SUMMARY_COLUMNS.map((column) => (
													<td
														key={column.key}
														className="px-4 py-3 align-top text-muted-foreground"
													>
														{row.summary[column.key]}
													</td>
												))}
											</tr>
										))}
									</tbody>
								</table>
							</ScrollRegion>
						</div>
					</BlurFade>

					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
						{competitors.map((competitor, index) => (
							<BlurFade key={competitor.slug} delay={0.15 + index * 0.05}>
								{/* The link is the heading, so its name is just "TenantFlow vs
								    X" (SEO audit C3); its ::after covers the card, so the
								    whole card stays clickable. */}
								<article className="group relative flex h-full flex-col rounded-lg border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring">
									<h2 className="text-lg font-semibold">
										<Link
											href={`/compare/${competitor.slug}`}
											{...clickTrackAttributes({
												name: "compare_card_click",
												props: { competitor: competitor.slug },
											})}
											className="text-foreground after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none group-hover:underline"
										>
											TenantFlow vs {competitor.name}
										</Link>
									</h2>
									<p className="mt-2 mb-0 text-sm text-muted-foreground">
										{competitor.tagline}
									</p>
									<p className="mt-4 mb-0 text-sm text-muted-foreground line-clamp-3">
										{competitor.description}
									</p>
									<p className="mt-2 mb-0 text-xs text-muted-foreground">
										Prices as of {formatCheckedMonth(competitor.checkedAt)}
									</p>
									<span
										className="mt-auto pt-4 inline-flex items-center text-sm font-medium text-primary-text"
										aria-hidden="true"
									>
										See comparison
										<ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
									</span>
								</article>
							</BlurFade>
						))}
					</div>
				</div>
			</section>
		</PageLayout>
	);
}
