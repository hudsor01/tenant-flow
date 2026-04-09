import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PageLayout } from '#components/layout/page-layout'
import { Button } from '#components/ui/button'
import { PrintButton } from '#components/shared/print-button'
import { JsonLdScript } from '#components/seo/json-ld-script'
import { createBreadcrumbJsonLd } from '#lib/seo/breadcrumbs'
import { deductionCategories } from './tax-deduction-data'

export const metadata: Metadata = {
	title: 'Landlord Tax Deduction Tracker | TenantFlow',
	description:
		'Free printable tax deduction tracker for landlords. Categorized by IRS Schedule E with common deductions, examples, and space to track amounts year-round.',
}

export default function TaxDeductionTrackerPage() {
	return (
		<PageLayout>
			<JsonLdScript schema={createBreadcrumbJsonLd('/resources/landlord-tax-deduction-tracker', { 'landlord-tax-deduction-tracker': 'Landlord Tax Deduction Tracker' })} />
			<style
				dangerouslySetInnerHTML={{
					__html: `
						@media print {
							nav, footer, .print\\:hidden { display: none !important; }
							body { font-size: 10px; }
							.page-break { page-break-before: always; }
							table { page-break-inside: avoid; }
						}
					`,
				}}
			/>

			<div className="max-w-4xl mx-auto px-6 lg:px-8 page-content pb-16">
				<div className="flex items-center justify-between mb-8 print:hidden">
					<Link
						href="/resources"
						className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
					>
						<ArrowLeft className="size-4 mr-2" />
						Back to Resources
					</Link>
					<PrintButton />
				</div>

				<header className="mb-12 text-center">
					<p className="text-sm font-semibold uppercase tracking-wider text-primary mb-3">
						Free Resource
					</p>
					<h1 className="text-4xl font-bold text-foreground mb-4">
						Landlord Tax Deduction Tracker
					</h1>
					<p className="text-lg text-muted-foreground max-w-2xl mx-auto">
						Track every deductible expense year-round. Organized by IRS Schedule E
						categories with common deductions, examples, and space to record your amounts.
					</p>
				</header>

				{/* Important notice */}
				<div className="rounded-xl border border-amber-200 bg-amber-50 p-6 mb-12">
					<p className="text-sm text-amber-900">
						<strong>Disclaimer:</strong> This tracker is for informational purposes only and
						does not constitute tax advice. Consult a qualified tax professional for advice
						specific to your situation. Tax laws change annually — verify current rules with
						the IRS or your CPA.
					</p>
				</div>

				{/* Property info section */}
				<section className="mb-12">
					<h2 className="text-xl font-bold text-foreground mb-4">
						Property Information
					</h2>
					<div className="grid grid-cols-2 gap-4 rounded-xl border border-border p-6">
						<div>
							<p className="text-sm text-muted-foreground mb-1">Property Address</p>
							<div className="border-b border-dashed border-muted-foreground/30 pb-2 min-h-8" />
						</div>
						<div>
							<p className="text-sm text-muted-foreground mb-1">Tax Year</p>
							<div className="border-b border-dashed border-muted-foreground/30 pb-2 min-h-8" />
						</div>
						<div>
							<p className="text-sm text-muted-foreground mb-1">Date Placed in Service</p>
							<div className="border-b border-dashed border-muted-foreground/30 pb-2 min-h-8" />
						</div>
						<div>
							<p className="text-sm text-muted-foreground mb-1">
								Building Value (for depreciation)
							</p>
							<div className="border-b border-dashed border-muted-foreground/30 pb-2 min-h-8" />
						</div>
					</div>
				</section>

				{/* Deduction categories */}
				<div className="space-y-12">
					{deductionCategories.map((cat, ci) => (
						<section
							key={cat.category}
							className={ci > 0 && ci % 2 === 0 ? 'page-break' : undefined}
						>
							<div className="flex items-baseline justify-between mb-4">
								<h2 className="text-xl font-bold text-foreground">
									{cat.category}
								</h2>
								<span className="text-sm text-muted-foreground">
									{cat.scheduleRef}
								</span>
							</div>
							<div className={`rounded-xl border ${cat.color} overflow-hidden`}>
								<table className="w-full">
									<thead>
										<tr className={cat.headerColor}>
											<th className="p-3 text-left text-sm font-semibold w-44">
												Deduction
											</th>
											<th className="p-3 text-left text-sm font-semibold">
												Description
											</th>
											<th className="p-3 text-right text-sm font-semibold w-28">
												Amount
											</th>
										</tr>
									</thead>
									<tbody>
										{cat.items.map((item, i) => (
											<tr
												key={i}
												className={
													i % 2 === 0
														? 'bg-background/50'
														: 'bg-background/80'
												}
											>
												<td className="p-3 text-sm font-medium text-foreground align-top">
													{item.deduction}
												</td>
												<td className="p-3 text-sm text-muted-foreground align-top">
													<p>{item.description}</p>
													<p className="text-xs mt-1 italic">
														e.g. {item.example}
													</p>
												</td>
												<td className="p-3 text-right align-top">
													<span className="text-sm text-muted-foreground/50">
														$
													</span>
													<span className="inline-block w-20 border-b border-dashed border-muted-foreground/30" />
												</td>
											</tr>
										))}
										<tr className={cat.headerColor}>
											<td
												colSpan={2}
												className="p-3 text-sm font-bold text-right"
											>
												Category Total:
											</td>
											<td className="p-3 text-right">
												<span className="text-sm font-bold">$</span>
												<span className="inline-block w-20 border-b-2 border-current" />
											</td>
										</tr>
									</tbody>
								</table>
							</div>
						</section>
					))}
				</div>

				{/* Grand total */}
				<section className="mt-12 page-break">
					<div className="rounded-xl border-2 border-primary bg-primary/5 p-8">
						<div className="flex items-center justify-between">
							<h2 className="text-2xl font-bold text-foreground">
								Total Deductions
							</h2>
							<div className="text-right">
								<span className="text-2xl font-bold text-primary">$</span>
								<span className="inline-block w-32 border-b-2 border-primary ml-1" />
							</div>
						</div>
						<p className="text-sm text-muted-foreground mt-4">
							Transfer this total to IRS Schedule E. Keep all receipts and documentation
							for at least 3 years (7 years if claiming depreciation).
						</p>
					</div>
				</section>

				{/* Footer CTA */}
				<div className="mt-12 text-center print:hidden">
					<p className="text-muted-foreground mb-4">
						Track expenses automatically with TenantFlow financial reporting
					</p>
					<Button asChild>
						<Link href="/pricing">Start Free Trial</Link>
					</Button>
				</div>
			</div>
		</PageLayout>
	)
}
