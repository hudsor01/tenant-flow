import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageLayout } from "#components/layout/page-layout";
import { JsonLdScript } from "#components/seo/json-ld-script";
import { PrintButton } from "#components/shared/print-button";
import { Button } from "#components/ui/button";
import { ScrollRegion } from "#components/ui/scroll-region";
import { ctaTrackAttributes } from "#lib/analytics/cta-attributes";
import { DiagnosticError } from "#lib/diagnostic-error";
import { parseLocalYmd } from "#lib/formatters/date";
import { createBreadcrumbJsonLd } from "#lib/seo/breadcrumbs";
import { createPageMetadata } from "#lib/seo/page-metadata";
import { DEPOSIT_RULES_CHECKED_AT, stateData } from "./deposit-data";

/** "November 25, 2026" for the date the rows were checked. */
function formatCheckedDate(ymd: string): string {
	const date = parseLocalYmd(ymd);
	if (!date) throw new DiagnosticError(`deposit-data: bad date "${ymd}"`);
	return new Intl.DateTimeFormat("en-US", {
		month: "long",
		day: "numeric",
		year: "numeric",
	}).format(date);
}

export const metadata: Metadata = createPageMetadata({
	title: `Security Deposit Laws by State (${DEPOSIT_RULES_CHECKED_AT.slice(0, 4)} Chart)`,
	description:
		"Free printable security deposit reference card with deposit limits, return deadlines, and required documentation for all 50 states plus DC.",
	path: "/resources/security-deposit-reference-card",
	ogCard: "security-deposit-reference-card",
});

export default function SecurityDepositReferenceCardPage() {
	const breadcrumbSchema = createBreadcrumbJsonLd(
		"/resources/security-deposit-reference-card",
		{ "security-deposit-reference-card": "Security Deposit Laws by State" },
	);

	return (
		<PageLayout>
			<JsonLdScript schema={breadcrumbSchema} />
			<style
				dangerouslySetInnerHTML={{
					__html: `
						@media print {
							nav, footer, .print\\:hidden { display: none !important; }
							body { font-size: 9px; }
							table { page-break-inside: auto; }
							tr { page-break-inside: avoid; }
						}
					`,
				}}
			/>

			<div className="max-w-5xl mx-auto px-6 lg:px-8 section-spacing">
				<div className="flex items-center justify-between mb-8 print:hidden">
					<Link
						href="/resources"
						className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
					>
						<ArrowLeft className="size-4 mr-2" />
						Back to Resources
					</Link>
					<PrintButton resource="security-deposit-card" />
				</div>

				<header className="mb-12 text-center">
					<p className="text-sm font-semibold uppercase tracking-wider text-primary-text mb-3">
						Free Resource
					</p>
					<h1 className="text-4xl font-bold text-foreground mb-4">
						Security Deposit Laws by State
					</h1>
					<p className="text-lg text-muted-foreground max-w-2xl mx-auto">
						Quick reference card with deposit limits, return deadlines, and
						documentation requirements for all 50 states plus Washington DC.
					</p>
				</header>

				{/* Legend */}
				<div className="flex flex-wrap gap-6 mb-8 p-4 rounded-xl border border-border bg-muted/30">
					<div className="flex items-center gap-2 text-sm">
						<span
							className="size-3 rounded-full bg-success-text"
							aria-hidden="true"
						/>
						<span className="text-muted-foreground">
							Itemized statement required
						</span>
					</div>
					<div className="flex items-center gap-2 text-sm">
						<span
							className="size-3 rounded-full bg-info-text"
							aria-hidden="true"
						/>
						<span className="text-muted-foreground">
							Interest required in some or all cases (see notes)
						</span>
					</div>
					<div className="flex items-center gap-2 text-sm">
						<span
							className="size-3 rounded-full border-2 border-muted-foreground"
							aria-hidden="true"
						/>
						<span className="text-muted-foreground">Not required</span>
					</div>
				</div>

				{/* Table */}
				<ScrollRegion className="overflow-x-auto rounded-xl border border-border">
					<table className="w-full text-sm">
						<thead>
							<tr className="bg-muted/50 border-b border-border">
								<th className="p-3 text-left font-semibold text-foreground sticky left-0 bg-muted/50">
									State
								</th>
								<th className="p-3 text-left font-semibold text-foreground">
									Max Deposit
								</th>
								<th className="p-3 text-left font-semibold text-foreground">
									Return Deadline
								</th>
								<th className="p-3 text-center font-semibold text-foreground w-24">
									Itemized
								</th>
								<th className="p-3 text-center font-semibold text-foreground w-24">
									Interest
								</th>
								<th className="p-3 text-left font-semibold text-foreground">
									Notes and Statute
								</th>
							</tr>
						</thead>
						<tbody>
							{stateData.map((s, i) => (
								<tr
									key={s.abbr}
									className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}
								>
									<td className="p-3 font-medium text-foreground sticky left-0 bg-inherit">
										{s.state}
									</td>
									<td className="p-3 text-muted-foreground">{s.maxDeposit}</td>
									<td className="p-3 text-muted-foreground">
										{s.returnDeadline}
									</td>
									<td className="p-3 text-center">
										<span className="inline-flex items-center gap-2">
											<span
												aria-hidden="true"
												className={`inline-block size-3 rounded-full ${
													s.itemizedRequired
														? "bg-success-text"
														: "border-2 border-muted-foreground"
												}`}
											/>
											<span className="text-xs text-muted-foreground">
												{s.itemizedRequired ? "Yes" : "No"}
											</span>
										</span>
									</td>
									<td className="p-3 text-center">
										<span className="inline-flex items-center gap-2">
											<span
												aria-hidden="true"
												className={`inline-block size-3 rounded-full ${
													s.interestRequired
														? "bg-info-text"
														: "border-2 border-muted-foreground"
												}`}
											/>
											<span className="text-xs text-muted-foreground">
												{s.interestRequired ? "Yes" : "No"}
											</span>
										</span>
									</td>
									<td className="p-3 text-xs text-muted-foreground">
										{s.notes ? <p className="mb-1">{s.notes}</p> : null}
										<p className="mb-0">
											{s.citationUrl ? (
												<a
													href={s.citationUrl}
													className="text-primary-text underline-offset-2 hover:underline"
												>
													{s.citation}
												</a>
											) : (
												s.citation
											)}
										</p>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</ScrollRegion>

				{/* Disclaimer */}
				<div className="mt-8 rounded-xl border border-warning/20 bg-warning/10 p-6">
					<p className="mb-0 text-sm text-warning-text">
						<strong>Disclaimer:</strong> This reference card provides a general
						overview of state security deposit laws, each row checked against
						the statute cited on {formatCheckedDate(DEPOSIT_RULES_CHECKED_AT)}.
						Laws change frequently and cities and counties may have additional
						requirements. Always verify current regulations with your state
						landlord-tenant statute or a local attorney before relying on this
						information.
					</p>
				</div>

				{/* Key tips */}
				<section className="mt-12">
					<h2 className="text-2xl font-bold text-foreground mb-6">
						Security Deposit Best Practices
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div className="rounded-xl border border-border p-6">
							<h3 className="font-semibold text-foreground mb-2">
								Document Everything
							</h3>
							<p className="mb-0 text-sm text-muted-foreground">
								Take timestamped photos at move-in and move-out. Use a written
								checklist signed by both parties. This is your strongest
								protection against disputes.
							</p>
						</div>
						<div className="rounded-xl border border-border p-6">
							<h3 className="font-semibold text-foreground mb-2">
								Separate Trust Account
							</h3>
							<p className="mb-0 text-sm text-muted-foreground">
								Many states require deposits held in a separate account. Even
								where not required, it protects you from commingling claims and
								simplifies accounting.
							</p>
						</div>
						<div className="rounded-xl border border-border p-6">
							<h3 className="font-semibold text-foreground mb-2">
								Return Early When Possible
							</h3>
							<p className="mb-0 text-sm text-muted-foreground">
								Returning deposits quickly builds goodwill and reduces dispute
								risk. Many states impose penalties (2-3x the deposit) for late
								returns.
							</p>
						</div>
						<div className="rounded-xl border border-border p-6">
							<h3 className="font-semibold text-foreground mb-2">
								Normal Wear vs Damage
							</h3>
							<p className="mb-0 text-sm text-muted-foreground">
								Faded paint, worn carpet, and minor scuffs are normal wear.
								Holes in walls, stained carpets, and broken fixtures are damage.
								Know the difference — courts do.
							</p>
						</div>
					</div>
				</section>

				{/* Footer CTA */}
				<div className="mt-12 text-center print:hidden">
					<p className="text-muted-foreground mb-4">
						Record each lease's security deposit and document move-in and
						move-out inspections with TenantFlow
					</p>
					<Button asChild>
						<Link
							href="/pricing"
							{...ctaTrackAttributes("resource-deposit-card")}
						>
							Start free — no card
						</Link>
					</Button>
				</div>
			</div>
		</PageLayout>
	);
}
