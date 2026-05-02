import { cn } from '#lib/utils'
import { BlurFade } from '#components/ui/blur-fade'
import { FaqsAccordion } from '#components/faq-accordion'
import { Button } from '#components/ui/button'
import { ArrowRight, MessageCircle } from 'lucide-react'
import Link from 'next/link'

interface HomeFaqProps {
	className?: string
}

const homeFaqs = [
	{
		question: 'How long does it take to get started?',
		answer:
			'Import your properties via CSV, add tenant records, and start tracking leases the same day. The 14-day free trial covers every feature so you can see the workflow before committing to a plan.'
	},
	{
		question: 'What if I have fewer than 10 units?',
		answer:
			'The Starter plan is built for owners managing up to 5 properties / 25 units. You get the document vault, maintenance tracking, and 10GB of document storage at $29/month. Move up to Growth when you outgrow it.'
	},
	{
		question: 'Is my data secure?',
		answer:
			"Yes. Postgres row-level security isolates every landlord's data, files are encrypted at rest, and you can export or delete your account at any time. Tenants are stored as records under your account — they never log in, so there are no extra access surfaces to manage."
	},
	{
		question: 'Where do I store lease PDFs and other documents?',
		answer:
			'In the document vault. Upload PDFs and images per property, lease, tenant, maintenance request, or inspection. Search across your whole portfolio, filter by category and date, and bulk-download a zip when tax season hits or your CPA asks for a folder.'
	},
	{
		question: 'Can I switch from my current software?',
		answer:
			'Yes. CSV import covers properties, units, tenants, and leases; existing lease PDFs and receipts upload directly into the document vault. Reach out to support if you want help validating an import for a non-trivial portfolio.'
	},
	{
		question: "What's included in the free trial?",
		answer:
			"Everything. You get full access to all features for 14 days with no credit card required. If you decide TenantFlow isn't right for you, there's no obligation — simply don't subscribe."
	}
]

export function HomeFaq({ className }: HomeFaqProps) {
	return (
		<section className={cn('section-spacing', className)}>
			<div className="max-w-4xl mx-auto px-6 lg:px-8">
				<BlurFade delay={0.1} inView>
					<div className="text-center mb-12">
						<h2 className="text-3xl lg:typography-h1 tracking-tight text-foreground mb-4">
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

				{/* Still have questions CTA */}
				<BlurFade delay={0.3} inView>
					<div className="mt-12 text-center p-8 rounded-2xl bg-muted/50 border border-border">
						<div className="icon-container-lg bg-primary/10 text-primary mx-auto mb-4">
							<MessageCircle className="size-6" />
						</div>
						<h3 className="typography-h4 text-foreground mb-2">
							Still have questions?
						</h3>
						<p className="text-muted-foreground mb-6">
							Our team is here to help you make the right decision for your
							properties.
						</p>
						<div className="flex flex-col sm:flex-row gap-4 justify-center">
							<Button asChild>
								<Link href="/contact">
									Contact Sales
									<ArrowRight className="size-4 ml-2" />
								</Link>
							</Button>
							<Button variant="outline" asChild>
								<Link href="/faq">View All FAQs</Link>
							</Button>
						</div>
					</div>
				</BlurFade>
			</div>
		</section>
	)
}

export default HomeFaq
