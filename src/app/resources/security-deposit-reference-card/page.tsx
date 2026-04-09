import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PageLayout } from '#components/layout/page-layout'
import { Button } from '#components/ui/button'
import { PrintButton } from '#components/shared/print-button'
import { JsonLdScript } from '#components/seo/json-ld-script'
import { createBreadcrumbJsonLd } from '#lib/seo/breadcrumbs'

export const metadata: Metadata = {
	title: 'Security Deposit Laws by State - Quick Reference Card | TenantFlow',
	description:
		'Free printable security deposit reference card with deposit limits, return deadlines, and required documentation for all 50 states plus DC.',
}

interface StateDeposit {
	state: string
	abbr: string
	maxDeposit: string
	returnDeadline: string
	itemizedRequired: boolean
	interestRequired: boolean
	notes: string
}

const stateData: StateDeposit[] = [
	{ state: 'Alabama', abbr: 'AL', maxDeposit: 'No limit', returnDeadline: '60 days', itemizedRequired: false, interestRequired: false, notes: 'After 35 days if no forwarding address' },
	{ state: 'Alaska', abbr: 'AK', maxDeposit: '2 months', returnDeadline: '14 days (30 if longer term)', itemizedRequired: true, interestRequired: false, notes: '' },
	{ state: 'Arizona', abbr: 'AZ', maxDeposit: '1.5 months', returnDeadline: '14 days', itemizedRequired: true, interestRequired: false, notes: '' },
	{ state: 'Arkansas', abbr: 'AR', maxDeposit: '2 months', returnDeadline: '60 days', itemizedRequired: false, interestRequired: false, notes: '' },
	{ state: 'California', abbr: 'CA', maxDeposit: '1 month (unfurn) / 2 months (furn)', returnDeadline: '21 days', itemizedRequired: true, interestRequired: false, notes: 'Effective 7/1/2024 cap applies' },
	{ state: 'Colorado', abbr: 'CO', maxDeposit: 'No limit', returnDeadline: '30 days (60 with lease)', itemizedRequired: true, interestRequired: false, notes: '' },
	{ state: 'Connecticut', abbr: 'CT', maxDeposit: '2 months', returnDeadline: '30 days (15 after termination)', itemizedRequired: true, interestRequired: true, notes: 'Interest must be paid annually' },
	{ state: 'Delaware', abbr: 'DE', maxDeposit: '1 month (after 1st yr)', returnDeadline: '20 days', itemizedRequired: true, interestRequired: false, notes: '' },
	{ state: 'DC', abbr: 'DC', maxDeposit: '1 month', returnDeadline: '45 days', itemizedRequired: true, interestRequired: true, notes: '' },
	{ state: 'Florida', abbr: 'FL', maxDeposit: 'No limit', returnDeadline: '15-30 days', itemizedRequired: true, interestRequired: false, notes: '15 if no deductions; 30 with deductions' },
	{ state: 'Georgia', abbr: 'GA', maxDeposit: 'No limit', returnDeadline: '30 days', itemizedRequired: true, interestRequired: false, notes: '' },
	{ state: 'Hawaii', abbr: 'HI', maxDeposit: '1 month', returnDeadline: '14 days', itemizedRequired: true, interestRequired: false, notes: '' },
	{ state: 'Idaho', abbr: 'ID', maxDeposit: 'No limit', returnDeadline: '21 days (30 w/lease term)', itemizedRequired: false, interestRequired: false, notes: '' },
	{ state: 'Illinois', abbr: 'IL', maxDeposit: 'No limit', returnDeadline: '30-45 days', itemizedRequired: true, interestRequired: true, notes: 'Interest req. if 25+ units (Chicago local rules differ)' },
	{ state: 'Indiana', abbr: 'IN', maxDeposit: 'No limit', returnDeadline: '45 days', itemizedRequired: true, interestRequired: false, notes: '' },
	{ state: 'Iowa', abbr: 'IA', maxDeposit: '2 months', returnDeadline: '30 days', itemizedRequired: true, interestRequired: false, notes: '' },
	{ state: 'Kansas', abbr: 'KS', maxDeposit: '1 month (unfurn) / 1.5 (furn)', returnDeadline: '30 days', itemizedRequired: true, interestRequired: false, notes: '' },
	{ state: 'Kentucky', abbr: 'KY', maxDeposit: 'No limit', returnDeadline: '30-60 days', itemizedRequired: true, interestRequired: false, notes: 'Must hold in separate account' },
	{ state: 'Louisiana', abbr: 'LA', maxDeposit: 'No limit', returnDeadline: '30 days', itemizedRequired: true, interestRequired: false, notes: '' },
	{ state: 'Maine', abbr: 'ME', maxDeposit: '2 months', returnDeadline: '30 days (21 if no forwarding)', itemizedRequired: true, interestRequired: false, notes: '' },
	{ state: 'Maryland', abbr: 'MD', maxDeposit: '2 months', returnDeadline: '45 days', itemizedRequired: true, interestRequired: true, notes: 'Interest if held 50+ units' },
	{ state: 'Massachusetts', abbr: 'MA', maxDeposit: '1 month', returnDeadline: '30 days', itemizedRequired: true, interestRequired: true, notes: '5% annual interest or actual rate' },
	{ state: 'Michigan', abbr: 'MI', maxDeposit: '1.5 months', returnDeadline: '30 days', itemizedRequired: true, interestRequired: false, notes: 'Detailed move-in checklist required' },
	{ state: 'Minnesota', abbr: 'MN', maxDeposit: 'No limit', returnDeadline: '21 days (5 for old/sick)', itemizedRequired: true, interestRequired: true, notes: '1% simple interest' },
	{ state: 'Mississippi', abbr: 'MS', maxDeposit: 'No limit', returnDeadline: '45 days', itemizedRequired: false, interestRequired: false, notes: '' },
	{ state: 'Missouri', abbr: 'MO', maxDeposit: '2 months', returnDeadline: '30 days', itemizedRequired: true, interestRequired: false, notes: '' },
	{ state: 'Montana', abbr: 'MT', maxDeposit: 'No limit', returnDeadline: '30 days (10 if no deductions)', itemizedRequired: true, interestRequired: false, notes: '' },
	{ state: 'Nebraska', abbr: 'NE', maxDeposit: '1 month (no pets) / 1.25 (pets)', returnDeadline: '14 days', itemizedRequired: true, interestRequired: false, notes: '' },
	{ state: 'Nevada', abbr: 'NV', maxDeposit: '3 months', returnDeadline: '30 days', itemizedRequired: true, interestRequired: false, notes: '' },
	{ state: 'New Hampshire', abbr: 'NH', maxDeposit: '1 month or $100', returnDeadline: '30 days', itemizedRequired: true, interestRequired: false, notes: 'Whichever is greater' },
	{ state: 'New Jersey', abbr: 'NJ', maxDeposit: '1.5 months', returnDeadline: '30 days', itemizedRequired: true, interestRequired: true, notes: 'Must be in interest-bearing account' },
	{ state: 'New Mexico', abbr: 'NM', maxDeposit: '1 month (< 1yr lease)', returnDeadline: '30 days', itemizedRequired: true, interestRequired: false, notes: '' },
	{ state: 'New York', abbr: 'NY', maxDeposit: '1 month', returnDeadline: '14 days', itemizedRequired: true, interestRequired: true, notes: 'HSTPA 2019 reforms; must hold in interest-bearing account' },
	{ state: 'North Carolina', abbr: 'NC', maxDeposit: '2 months (or 1.5 for mo-to-mo)', returnDeadline: '30 days', itemizedRequired: true, interestRequired: false, notes: 'Must hold in trust account' },
	{ state: 'North Dakota', abbr: 'ND', maxDeposit: '1 month (2 for pet damage history)', returnDeadline: '30 days', itemizedRequired: true, interestRequired: false, notes: '' },
	{ state: 'Ohio', abbr: 'OH', maxDeposit: 'No limit', returnDeadline: '30 days', itemizedRequired: true, interestRequired: true, notes: 'Interest if over $50 and lease > 6 months' },
	{ state: 'Oklahoma', abbr: 'OK', maxDeposit: 'No limit', returnDeadline: '45 days', itemizedRequired: true, interestRequired: false, notes: '' },
	{ state: 'Oregon', abbr: 'OR', maxDeposit: 'No limit', returnDeadline: '31 days', itemizedRequired: true, interestRequired: false, notes: '' },
	{ state: 'Pennsylvania', abbr: 'PA', maxDeposit: '2 months (1 after 1st yr)', returnDeadline: '30 days', itemizedRequired: true, interestRequired: true, notes: 'Interest after 25 months in escrow' },
	{ state: 'Rhode Island', abbr: 'RI', maxDeposit: '1 month', returnDeadline: '20 days', itemizedRequired: true, interestRequired: false, notes: '' },
	{ state: 'South Carolina', abbr: 'SC', maxDeposit: 'No limit', returnDeadline: '30 days', itemizedRequired: true, interestRequired: false, notes: '' },
	{ state: 'South Dakota', abbr: 'SD', maxDeposit: '1 month (2 for special circumstances)', returnDeadline: '14 days (45 after lease end)', itemizedRequired: true, interestRequired: false, notes: '' },
	{ state: 'Tennessee', abbr: 'TN', maxDeposit: 'No limit', returnDeadline: '30 days', itemizedRequired: true, interestRequired: false, notes: '' },
	{ state: 'Texas', abbr: 'TX', maxDeposit: 'No limit', returnDeadline: '30 days', itemizedRequired: true, interestRequired: false, notes: 'Must provide forwarding address' },
	{ state: 'Utah', abbr: 'UT', maxDeposit: 'No limit', returnDeadline: '30 days', itemizedRequired: true, interestRequired: false, notes: '' },
	{ state: 'Vermont', abbr: 'VT', maxDeposit: 'No limit', returnDeadline: '14 days', itemizedRequired: true, interestRequired: false, notes: '' },
	{ state: 'Virginia', abbr: 'VA', maxDeposit: '2 months', returnDeadline: '45 days', itemizedRequired: true, interestRequired: false, notes: '' },
	{ state: 'Washington', abbr: 'WA', maxDeposit: 'No limit', returnDeadline: '21 days', itemizedRequired: true, interestRequired: false, notes: 'Must provide written checklist at move-in' },
	{ state: 'West Virginia', abbr: 'WV', maxDeposit: 'No limit', returnDeadline: '60 days', itemizedRequired: false, interestRequired: false, notes: '' },
	{ state: 'Wisconsin', abbr: 'WI', maxDeposit: 'No limit', returnDeadline: '21 days', itemizedRequired: true, interestRequired: false, notes: 'Move-in/move-out checklist required' },
	{ state: 'Wyoming', abbr: 'WY', maxDeposit: 'No limit', returnDeadline: '30 days (15 if no deductions)', itemizedRequired: false, interestRequired: false, notes: '' },
]

export default function SecurityDepositReferenceCardPage() {
	return (
		<PageLayout>
			<JsonLdScript schema={createBreadcrumbJsonLd('/resources/security-deposit-reference-card', { 'security-deposit-reference-card': 'Security Deposit Laws by State' })} />
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

			<div className="max-w-5xl mx-auto px-6 lg:px-8 page-content pb-16">
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
						Security Deposit Laws by State
					</h1>
					<p className="text-lg text-muted-foreground max-w-2xl mx-auto">
						Quick reference card with deposit limits, return deadlines, and documentation
						requirements for all 50 states plus Washington DC.
					</p>
				</header>

				{/* Legend */}
				<div className="flex flex-wrap gap-6 mb-8 p-4 rounded-xl border border-border bg-muted/30">
					<div className="flex items-center gap-2 text-sm">
						<span className="size-3 rounded-full bg-green-500" />
						<span className="text-muted-foreground">
							Itemized statement required
						</span>
					</div>
					<div className="flex items-center gap-2 text-sm">
						<span className="size-3 rounded-full bg-blue-500" />
						<span className="text-muted-foreground">
							Interest payment required
						</span>
					</div>
					<div className="flex items-center gap-2 text-sm">
						<span className="size-3 rounded-full bg-muted-foreground/30" />
						<span className="text-muted-foreground">Not required</span>
					</div>
				</div>

				{/* Table */}
				<div className="overflow-x-auto rounded-xl border border-border">
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
									Notes
								</th>
							</tr>
						</thead>
						<tbody>
							{stateData.map((s, i) => (
								<tr
									key={s.abbr}
									className={
										i % 2 === 0
											? 'bg-background'
											: 'bg-muted/20'
									}
								>
									<td className="p-3 font-medium text-foreground sticky left-0 bg-inherit">
										{s.state}
									</td>
									<td className="p-3 text-muted-foreground">
										{s.maxDeposit}
									</td>
									<td className="p-3 text-muted-foreground">
										{s.returnDeadline}
									</td>
									<td className="p-3 text-center">
										<span
											className={`inline-block size-3 rounded-full ${
												s.itemizedRequired
													? 'bg-green-500'
													: 'bg-muted-foreground/30'
											}`}
										/>
									</td>
									<td className="p-3 text-center">
										<span
											className={`inline-block size-3 rounded-full ${
												s.interestRequired
													? 'bg-blue-500'
													: 'bg-muted-foreground/30'
											}`}
										/>
									</td>
									<td className="p-3 text-xs text-muted-foreground">
										{s.notes}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				{/* Disclaimer */}
				<div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-6">
					<p className="text-sm text-amber-900">
						<strong>Disclaimer:</strong> This reference card provides a general overview of
						state security deposit laws as of 2025. Laws change frequently and local
						jurisdictions may have additional requirements. Always verify current regulations
						with your state landlord-tenant statute or a local attorney before relying on
						this information.
					</p>
				</div>

				{/* Key tips */}
				<section className="mt-12">
					<h2 className="text-2xl font-bold text-foreground mb-6">
						Security Deposit Best Practices
					</h2>
					<div className="grid md:grid-cols-2 gap-6">
						<div className="rounded-xl border border-border p-6">
							<h3 className="font-semibold text-foreground mb-2">
								Document Everything
							</h3>
							<p className="text-sm text-muted-foreground">
								Take timestamped photos at move-in and move-out. Use a written checklist
								signed by both parties. This is your strongest protection against
								disputes.
							</p>
						</div>
						<div className="rounded-xl border border-border p-6">
							<h3 className="font-semibold text-foreground mb-2">
								Separate Trust Account
							</h3>
							<p className="text-sm text-muted-foreground">
								Many states require deposits held in a separate account. Even where not
								required, it protects you from commingling claims and simplifies
								accounting.
							</p>
						</div>
						<div className="rounded-xl border border-border p-6">
							<h3 className="font-semibold text-foreground mb-2">
								Return Early When Possible
							</h3>
							<p className="text-sm text-muted-foreground">
								Returning deposits quickly builds goodwill and reduces dispute risk. Many
								states impose penalties (2-3x the deposit) for late returns.
							</p>
						</div>
						<div className="rounded-xl border border-border p-6">
							<h3 className="font-semibold text-foreground mb-2">
								Normal Wear vs Damage
							</h3>
							<p className="text-sm text-muted-foreground">
								Faded paint, worn carpet, and minor scuffs are normal wear. Holes in
								walls, stained carpets, and broken fixtures are damage. Know the
								difference — courts do.
							</p>
						</div>
					</div>
				</section>

				{/* Footer CTA */}
				<div className="mt-12 text-center print:hidden">
					<p className="text-muted-foreground mb-4">
						Track security deposits and generate move-in/move-out reports with TenantFlow
					</p>
					<Button asChild>
						<Link href="/pricing">Start Free Trial</Link>
					</Button>
				</div>
			</div>
		</PageLayout>
	)
}
