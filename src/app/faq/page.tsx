import type { Metadata } from 'next'

import { FaqsAccordion } from '#app/faq/faq-accordion'
import { PageLayout } from '#components/layout/page-layout'
import { HeroSection } from '#components/sections/hero-section'
import { JsonLdScript } from '#components/seo/json-ld-script'
import { Button } from '#components/ui/button'

import { faqData } from '../../data/faqs'
import { ArrowRight } from 'lucide-react'
import { createBreadcrumbJsonLd } from '#lib/seo/breadcrumbs'
import { createFaqJsonLd } from '#lib/seo/faq-schema'
import { createPageMetadata } from '#lib/seo/page-metadata'
import { StickyConversionCta } from '#components/marketing/sticky-conversion-cta'
import Link from 'next/link'

// ISR — faq content is static; 1h revalidate covers copy edits.
export const revalidate = 3600

export const metadata: Metadata = createPageMetadata({
	title: 'Property Management FAQ | Questions About Leases, Maintenance & More',
	description:
		'Answers to common landlord questions about lease management, the document vault, lease e-signing, maintenance tracking, and property administration. Get started with TenantFlow.',
	path: '/faq'
})

export default function FAQPage() {
	const faqCategories = faqData

	const allQuestions = faqCategories.flatMap(category => category.questions)

	return (
		<PageLayout>
			<JsonLdScript schema={createFaqJsonLd(allQuestions.map(q => ({ question: q.question, answer: q.answer })))} />
			<JsonLdScript schema={createBreadcrumbJsonLd('/faq')} />
			<HeroSection
				trustBadge="Built for landlords"
				title="Frequently asked"
				titleHighlight="questions"
				subtitle="How TenantFlow handles documents, e-signing, tenant records, security, and billing. If anything is missing, talk to our team."
				primaryCta={{
					label: 'See Pricing',
					href: '/pricing'
				}}
				secondaryCta={{ label: 'Contact Sales', href: '/contact' }}
				trustSignals="Document vault • Lease e-sign on Growth+ • 14-day free trial"
				image={{
					src: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2069&auto=format&fit=crop',
					alt: 'Modern office workspace showcasing property management efficiency'
				}}
			/>
			<section className="section-spacing">
				<div className="max-w-4xl mx-auto px-6 lg:px-8">
					{faqCategories.length === 0 && (
						<div className="py-8 text-center text-muted-foreground">
							No FAQs available at the moment. Please check back later.
						</div>
					)}
					{faqCategories.length > 0 &&
						faqCategories.map(category => (
							<FaqsAccordion
								key={category.category}
								category={category.category}
								faqs={category.questions}
								defaultOpenIndex={null}
							/>
						))}
				</div>
			</section>
			<section className="section-spacing bg-primary">
				<div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
					<h2 className="typography-h1 text-primary-foreground mb-4">
						Still have questions?
					</h2>
					<p className="text-xl text-primary-foreground/90 mb-8">
						Talk to our team about your portfolio, the document vault, and which plan tier fits.
					</p>
					<div className="flex flex-col sm:flex-row gap-4 justify-center">
						<Button asChild size="lg" variant="secondary" className="px-8">
							<Link href="/contact">
								Contact Sales
								<ArrowRight className="size-5 ml-2" />
							</Link>
						</Button>
						<Button
							asChild
							size="lg"
							variant="outline"
							className="px-8 text-primary-foreground border-primary-foreground/50 hover:bg-primary-foreground hover:text-primary"
						>
							<Link href="/pricing">View Pricing</Link>
						</Button>
					</div>
				</div>
			</section>
			<StickyConversionCta />
		</PageLayout>
	)
}
