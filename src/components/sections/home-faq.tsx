import { FaqsAccordion } from "#components/faq-accordion";
import { BlurFade } from "#components/ui/blur-fade";
import { cn } from "#lib/utils";

interface HomeFaqProps {
	className?: string;
}

export const homeFaqs = [
	{
		question: "How long does it take to get started?",
		answer:
			"Import your properties via CSV, add tenant records, and start tracking leases the same day. The 14-day free trial covers every feature of the plan you pick, so you can see the workflow before committing.",
	},
	{
		question: "What if I have fewer than 10 units?",
		answer:
			"The Starter plan is built for landlords with 1–5 rentals / 25 units. You get the document vault, maintenance tracking, and 10GB of document storage at $19/month. Move up to Growth when you outgrow it.",
	},
	{
		question: "Where do I store lease PDFs and other documents?",
		answer:
			"In the document vault. Upload PDFs and images per property, lease, tenant, maintenance request, or inspection. Search across your whole portfolio, filter by category and date, and bulk-download a zip when tax season hits or your CPA asks for a folder.",
	},
	{
		question: "Can I switch from my current software?",
		answer:
			"Yes. CSV import covers properties, units, tenants, and leases; existing lease PDFs and receipts upload directly into the document vault. Reach out to support if you want help validating an import for a non-trivial portfolio.",
	},
	{
		question: "What's included in the free trial?",
		answer:
			"Full access to every feature of the plan you choose, for 14 days, with no credit card required. Lease e-sign is included on Growth and Max. If you decide TenantFlow isn't right for you, there's no obligation — simply don't subscribe.",
	},
];

export function HomeFaq({ className }: HomeFaqProps) {
	return (
		<section className={cn("section-spacing", className)}>
			<div className="max-w-5xl mx-auto px-6 lg:px-8">
				<BlurFade delay={0.1} inView>
					<div className="text-center mb-16">
						<h2 className="text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tight text-foreground mb-4">
							Frequently Asked Questions
						</h2>
						<p className="text-muted-foreground text-lg">
							Everything you need to know about TenantFlow
						</p>
					</div>
				</BlurFade>

				<BlurFade delay={0.2} inView>
					<FaqsAccordion faqs={homeFaqs} defaultOpenIndex={0} />
				</BlurFade>
			</div>
		</section>
	);
}

export default HomeFaq;
