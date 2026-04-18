import type { Metadata } from 'next'

import { FaqsAccordion } from '#app/faq/faq-accordion'
import { PageLayout } from '#components/layout/page-layout'
import { HeroSection } from '#components/sections/hero-section'
import { JsonLdScript } from '#components/seo/json-ld-script'
import { Button } from '#components/ui/button'

import { faqData } from '../../data/faqs'
import { ArrowRight } from 'lucide-react'
import { SOCIAL_PROOF } from '#config/social-proof'
import { createBreadcrumbJsonLd } from '#lib/seo/breadcrumbs'
import { createFaqJsonLd } from '#lib/seo/faq-schema'
import { createPageMetadata } from '#lib/seo/page-metadata'
import Link from 'next/link'

export const metadata: Metadata = createPageMetadata({
	title: 'Property Management FAQ — Questions About Leases, Maintenance & More',
	description:
		'Answers to common landlord questions about lease management, maintenance tracking, tenant screening, and property administration software. Get started with TenantFlow.',
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
				trustBadge="Real answers from real results"
				title="Your $30,000 annual savings"
				titleHighlight="questions answered"
				subtitle={`Everything you need to know about how TenantFlow delivers guaranteed ${SOCIAL_PROOF.noiIncrease} NOI increase, saves ${SOCIAL_PROOF.hoursSavedWeekly} hours weekly, and pays for itself in ${SOCIAL_PROOF.roiTimeline.replace('-', ' ')}. Real answers from real results.`}
				primaryCta={{
					label: 'Calculate Your Savings Now',
					href: '/pricing'
				}}
				secondaryCta={{ label: 'Talk to Success Manager', href: '/pricing' }}
				trustSignals={`${SOCIAL_PROOF.noiIncrease} NOI increase • ${SOCIAL_PROOF.hoursSavedWeekly} hours saved weekly • ${SOCIAL_PROOF.roiTimeline} ROI`}
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
						Speak with a property management automation expert and get a custom
						ROI projection for your portfolio.
					</p>
					<div className="flex flex-col sm:flex-row gap-4 justify-center">
						<Button asChild size="lg" variant="secondary" className="px-8">
							<Link href="/contact">
								Schedule Expert Consultation
								<ArrowRight className="size-5 ml-2" />
							</Link>
						</Button>
						<Button
							asChild
							size="lg"
							variant="outline"
							className="px-8 text-primary-foreground border-primary-foreground/50 hover:bg-primary-foreground hover:text-primary"
						>
							<Link href="/pricing">Get Custom ROI Report</Link>
						</Button>
					</div>
				</div>
			</section>
		</PageLayout>
	)
}
