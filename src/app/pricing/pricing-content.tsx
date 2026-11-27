import {
	ArrowRight,
	CheckCircle2,
	Download,
	FolderLock,
	Home,
} from "lucide-react";
import Link from "next/link";
import { PricingFaqItem } from "#components/pricing/pricing-faq-item";
import { Button } from "#components/ui/button";
import { Card } from "#components/ui/card";
import { ctaTrackAttributes } from "#lib/analytics/cta-attributes";
import { TRIAL_FAQ } from "../../data/trial-faq";

const STATS = [
	{
		label: "Document Vault",
		value: "Per-entity",
		description: "Property, lease, tenant, maintenance, inspection",
		icon: FolderLock,
	},
	{
		label: "Bulk Download",
		value: "500/zip",
		description: "Streaming zip export for tax season",
		icon: Download,
	},
	{
		label: "Built For",
		value: "Landlords",
		description: "Tenants are records, never platform users",
		icon: Home,
	},
];

const FAQS = [
	// What the trial includes, before any plan question (it is the one the
	// "Start free" buttons raise).
	TRIAL_FAQ,
	{
		question: "Can I change plans later?",
		answer:
			"Yes. Upgrade or downgrade any time from Billing settings. The change takes effect immediately, and the price difference is prorated.",
	},
	{
		question: "What payment methods do you accept?",
		answer:
			"We accept all major credit and debit cards. Payments are processed securely through Stripe.",
	},
	{
		question: "Is sales tax included in the price?",
		answer:
			"No. Where TenantFlow is registered to collect sales tax, it's added at checkout based on your billing address, and you see the total before you pay.",
	},
	{
		question: "Is there a long-term contract?",
		answer:
			"No contracts required. All plans are month-to-month. Cancel anytime with no penalties or fees.",
	},
	{
		question: "What happens if I exceed my plan limits?",
		answer:
			"Adding a property or unit past your plan's limit is blocked, with a prompt to upgrade. Nothing you already have is removed, and you can upgrade any time.",
	},
	{
		question: "Can I cancel any time?",
		answer:
			"Yes. Every plan is month-to-month with no contract. Cancel from the billing settings whenever you want; you'll keep access through the end of the current billing period.",
	},
];

export function PricingStatsGrid() {
	return (
		<section className="section-spacing animate-in fade-in duration-700 delay-150">
			{/* The columns step on the section's own width, never the viewport's:
			    one until two cards are 11.5rem wide, each holding its label
			    (DOCUMENT VAULT, 130.41px) and figure (Per-entity, 130.03px at
			    30px) on one line, then Landlords under the first two, all three
			    in a row from where three are (66.2-39 fix round 4, Part 8d: three
			    at 640px wrapped Document Vault and set its figure 20px below the
			    other two). */}
			<div className="@container/pricing-stats mx-auto max-w-7xl px-6 lg:px-8">
				<div className="grid grid-cols-1 gap-8 text-left @min-[25rem]/pricing-stats:grid-cols-2 @min-[38.5rem]/pricing-stats:grid-cols-3">
					{STATS.map((stat, index) => (
						<Card
							key={stat.label}
							variant="stat"
							className={
								index === STATS.length - 1
									? "@min-[25rem]/pricing-stats:col-span-2 @min-[38.5rem]/pricing-stats:col-span-1"
									: undefined
							}
						>
							<div className="relative">
								<div className="mb-4 typography-h2 text-primary">
									<stat.icon className="h-8 w-8" />
								</div>
								<p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
									{stat.label}
								</p>
								<p className="mb-3 whitespace-nowrap typography-h1 tracking-tight text-foreground">
									{stat.value}
								</p>
								<p className="mb-0 text-sm leading-relaxed text-muted-foreground">
									{stat.description}
								</p>
							</div>
						</Card>
					))}
				</div>
			</div>
		</section>
	);
}

export function PricingFaqSection() {
	return (
		<section
			id="pricing-faq"
			className="scroll-mt-24 section-spacing animate-in fade-in duration-700 delay-300"
		>
			<div className="mx-auto max-w-6xl px-6 lg:px-8">
				<div className="rounded-3xl border border-border/60 bg-card/60 p-10 shadow-sm backdrop-blur sm:p-14">
					<div className="mx-auto mb-14 max-w-3xl text-center">
						<h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
							Frequently asked questions
						</h2>
						<p className="mt-4 text-base text-muted-foreground sm:text-lg">
							Details on trials, billing, and switching plans. Tenants are
							records, not users — they never log in.
						</p>
					</div>
					<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
						{FAQS.map((faq) => (
							<PricingFaqItem
								key={faq.question}
								question={faq.question}
								answer={faq.answer}
							/>
						))}
					</div>
					<div className="mt-14 flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
						<div>
							<p className="text-base font-medium text-foreground">
								Still unsure which plan fits best?
							</p>
							<p className="mb-0 text-sm text-muted-foreground sm:text-base">
								Tell us about your portfolio and we&apos;ll recommend a plan.
							</p>
						</div>
						<div className="flex flex-col items-center gap-3 sm:flex-row">
							<Link
								href="/faq"
								className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
							>
								View all FAQs
								<ArrowRight className="size-3.5" aria-hidden="true" />
							</Link>
							<Button size="lg" className="px-7" asChild>
								{/* No sales team (SEO audit P10): support answers by email. */}
								<Link href="/contact">
									Ask which plan fits
									<ArrowRight className="ml-2 h-4 w-4" />
								</Link>
							</Button>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

export function PricingCtaSection() {
	return (
		<section className="section-spacing animate-in fade-in duration-700 delay-400">
			<div className="mx-auto max-w-6xl px-6 lg:px-8">
				<div className="grid grid-cols-1 gap-10 overflow-hidden rounded-3xl border border-border/60 bg-card/70 p-10 shadow-sm backdrop-blur md:grid-cols-[1.3fr_1fr] md:p-12">
					<div className="space-y-6 text-left">
						<h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
							Ready to centralize your portfolio?
						</h2>
						<p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
							Start with the records and document vault built for self-managing
							owners, then move up for more e-sign volume and storage as your
							portfolio grows.
						</p>
						<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
							<Button size="lg" className="px-8" asChild>
								<Link href="#plans" {...ctaTrackAttributes("pricing-bottom")}>
									Start free — no card
									<ArrowRight className="ml-2 h-4 w-4" />
								</Link>
							</Button>
							<Button size="lg" variant="outline" className="px-8" asChild>
								<Link href="/contact">Ask which plan fits</Link>
							</Button>
						</div>
					</div>
					<div className="flex flex-col justify-center gap-5 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-6 text-left">
						{[
							{
								title: "14-day free trial",
								desc: "Add a property and up to five units, upload documents and build leases. Lease e-sign starts when you choose Growth or Max, and you keep everything when you subscribe.",
							},
							{
								title: "Billing that flexes with you",
								desc: "Switch plans whenever you want. Monthly and annual billing are available on every tier.",
							},
							{
								title: "Import what you have",
								desc: "CSV import covers properties, units, tenants, and leases. Existing PDFs and receipts upload directly into the document vault.",
							},
						].map((item) => (
							<div key={item.title} className="flex items-start gap-3">
								<CheckCircle2 className="mt-1 h-5 w-5 text-success" />
								<div>
									<p className="font-medium text-foreground">{item.title}</p>
									<p className="mb-0 text-muted-foreground text-sm">
										{item.desc}
									</p>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}

export { FAQS as pricingFaqs };
