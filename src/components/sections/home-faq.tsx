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
			'Most property owners are up and running within an hour. Import your properties via CSV, add tenant records, and start tracking leases the same day. Our intuitive interface requires no training.'
	},
	{
		question: 'What if I have fewer than 10 units?',
		answer:
			'TenantFlow is perfect for portfolios of any size. Our Starter plan is designed for owners managing up to 25 units, giving you all the core features without enterprise complexity or pricing.'
	},
	{
		question: 'Is my data secure?',
		answer:
			'Absolutely. We use bank-level encryption (AES-256), are SOC 2 compliant, and host on enterprise-grade infrastructure. Your data is backed up daily and you own it completely - export anytime.'
	},
	{
		question: 'How does rent tracking work?',
		answer:
			'You record rent as you receive it — by cash, check, ACH, or any method you already use. TenantFlow keeps the ledger, flags late balances, and produces the reports you need for taxes and bookkeeping.'
	},
	{
		question: 'Can I switch from my current software?',
		answer:
			'Yes! We offer free migration assistance. Our team will help import your properties, tenants, and lease data. Most migrations are completed within 48 hours with zero downtime.'
	},
	{
		question: "What's included in the free trial?",
		answer:
			"Everything. You get full access to all features for 14 days with no credit card required. If you decide TenantFlow isn't right for you, there's no obligation - simply don't subscribe."
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
