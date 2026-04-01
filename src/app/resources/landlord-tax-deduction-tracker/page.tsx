import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PageLayout } from '#components/layout/page-layout'
import { Button } from '#components/ui/button'
import { PrintButton } from '#components/shared/print-button'

export const metadata: Metadata = {
	title: 'Landlord Tax Deduction Tracker | TenantFlow',
	description:
		'Free printable tax deduction tracker for landlords. Categorized by IRS Schedule E with common deductions, examples, and space to track amounts year-round.',
}

interface DeductionCategory {
	category: string
	scheduleRef: string
	color: string
	headerColor: string
	items: Array<{
		deduction: string
		description: string
		example: string
	}>
}

const deductionCategories: DeductionCategory[] = [
	{
		category: 'Mortgage & Financing',
		scheduleRef: 'Schedule E, Line 12-13',
		color: 'bg-blue-50 border-blue-200',
		headerColor: 'bg-blue-100 text-blue-900',
		items: [
			{
				deduction: 'Mortgage Interest',
				description: 'Interest paid on loans used to acquire or improve rental property',
				example: 'Monthly mortgage interest portion from Form 1098',
			},
			{
				deduction: 'Points & Loan Origination Fees',
				description: 'Points paid to obtain a mortgage (amortized over loan term for refinances)',
				example: '$3,000 in points on a 30-year loan = $100/year',
			},
			{
				deduction: 'Loan Interest (Other)',
				description: 'Interest on other loans used for rental property purposes',
				example: 'HELOC used for rental property renovations',
			},
		],
	},
	{
		category: 'Property Expenses',
		scheduleRef: 'Schedule E, Lines 5-19',
		color: 'bg-green-50 border-green-200',
		headerColor: 'bg-green-100 text-green-900',
		items: [
			{
				deduction: 'Property Taxes',
				description: 'State and local property taxes on rental property',
				example: 'Annual property tax bill from county assessor',
			},
			{
				deduction: 'Insurance Premiums',
				description: 'Landlord insurance, liability, flood, umbrella policies',
				example: 'Annual landlord policy: $1,200-$2,400/year per property',
			},
			{
				deduction: 'HOA / Condo Fees',
				description: 'Monthly association fees for rental units in managed communities',
				example: 'Monthly HOA fee of $350 = $4,200/year',
			},
			{
				deduction: 'Utilities',
				description: 'Utilities paid by landlord (water, electric, gas, trash, internet)',
				example: 'Water bill paid by landlord: $80/month per unit',
			},
		],
	},
	{
		category: 'Repairs & Maintenance',
		scheduleRef: 'Schedule E, Line 14',
		color: 'bg-amber-50 border-amber-200',
		headerColor: 'bg-amber-100 text-amber-900',
		items: [
			{
				deduction: 'Routine Repairs',
				description: 'Fixing broken items to restore property to working condition',
				example: 'Fixing a leaky faucet ($150), replacing a broken window ($300)',
			},
			{
				deduction: 'Maintenance Services',
				description: 'Ongoing maintenance: lawn care, snow removal, pest control, cleaning',
				example: 'Monthly lawn service: $120/month = $1,440/year',
			},
			{
				deduction: 'Appliance Repairs',
				description: 'Repairing (not replacing) appliances: HVAC service, dishwasher fix',
				example: 'HVAC tune-up: $150/visit, dishwasher repair: $200',
			},
			{
				deduction: 'Painting & Flooring',
				description: 'Repainting between tenants, minor flooring repairs',
				example: 'Interior repaint: $1,500-$3,000 per unit',
			},
		],
	},
	{
		category: 'Depreciation',
		scheduleRef: 'Schedule E, Line 18 / Form 4562',
		color: 'bg-purple-50 border-purple-200',
		headerColor: 'bg-purple-100 text-purple-900',
		items: [
			{
				deduction: 'Building Depreciation',
				description: 'Residential rental property depreciated over 27.5 years (straight-line)',
				example: '$275,000 building value / 27.5 = $10,000/year deduction',
			},
			{
				deduction: 'Appliance / Equipment',
				description: 'Major appliances and equipment depreciated over 5-7 years',
				example: 'New $2,500 HVAC unit: $357-$500/year for 5-7 years',
			},
			{
				deduction: 'Improvements (Section 179)',
				description: 'Qualifying improvements can be expensed immediately up to annual limit',
				example: 'New roof ($15,000) may qualify under safe harbor rules',
			},
			{
				deduction: 'Land Improvements',
				description: 'Fencing, parking lots, landscaping depreciated over 15 years',
				example: 'New fence ($6,000) = $400/year for 15 years',
			},
		],
	},
	{
		category: 'Professional Services',
		scheduleRef: 'Schedule E, Lines 10-11, 17',
		color: 'bg-rose-50 border-rose-200',
		headerColor: 'bg-rose-100 text-rose-900',
		items: [
			{
				deduction: 'Property Management Fees',
				description: 'Fees paid to property management company (typically 8-12% of rent)',
				example: '$1,500/month rent x 10% = $150/month = $1,800/year',
			},
			{
				deduction: 'Legal Fees',
				description: 'Attorney fees for lease review, evictions, entity formation',
				example: 'Eviction attorney: $500-$2,000 per case',
			},
			{
				deduction: 'Accounting / Tax Prep',
				description: 'CPA fees for rental property tax preparation and advice',
				example: 'Annual tax prep with Schedule E: $300-$800',
			},
			{
				deduction: 'Tenant Screening',
				description: 'Background check and credit report fees (if paid by landlord)',
				example: '$30-$50 per applicant screened',
			},
		],
	},
	{
		category: 'Travel & Auto',
		scheduleRef: 'Schedule E / Form 4562',
		color: 'bg-teal-50 border-teal-200',
		headerColor: 'bg-teal-100 text-teal-900',
		items: [
			{
				deduction: 'Mileage (Standard Rate)',
				description: 'IRS standard mileage rate for rental property trips (2025: 70 cents/mile)',
				example: '500 miles/year for showings, repairs, inspections = $350 deduction',
			},
			{
				deduction: 'Travel to Distant Properties',
				description: 'Airfare, hotel, and meals for managing out-of-area rental property',
				example: 'Quarterly trips to out-of-state rental: flights + hotel',
			},
		],
	},
	{
		category: 'Other Deductions',
		scheduleRef: 'Schedule E, Line 19',
		color: 'bg-gray-50 border-gray-200',
		headerColor: 'bg-gray-100 text-gray-900',
		items: [
			{
				deduction: 'Advertising',
				description: 'Listing fees, signage, online advertising for vacancies',
				example: 'Zillow listing: $10-$30/week, yard sign: $25',
			},
			{
				deduction: 'Software & Tools',
				description: 'Property management software subscriptions',
				example: 'TenantFlow subscription: $29-$199/month',
			},
			{
				deduction: 'Office Supplies',
				description: 'Printer ink, paper, envelopes, stamps for rental correspondence',
				example: '$100-$300/year in supplies',
			},
			{
				deduction: 'Education',
				description: 'Landlord courses, books, membership dues for real estate associations',
				example: 'Local landlord association membership: $100-$300/year',
			},
		],
	},
]

export default function TaxDeductionTrackerPage() {
	return (
		<PageLayout>
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
