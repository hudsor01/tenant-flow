import type { Metadata } from 'next'

import { PageLayout } from '#components/layout/page-layout'
import { JsonLdScript } from '#components/seo/json-ld-script'
import { Badge } from '#components/ui/badge'
import { CheckCircle2 } from 'lucide-react'
import { TestimonialsSection } from '#components/sections/testimonials-section'
import { SOCIAL_PROOF } from '#config/social-proof'
import { createBreadcrumbJsonLd } from '#lib/seo/breadcrumbs'
import { createFaqJsonLd } from '#lib/seo/faq-schema'
import { createPageMetadata } from '#lib/seo/page-metadata'
import { createProductJsonLd } from '#lib/seo/product-schema'
import { PricingSection } from './_components/pricing-section'
import {
	PricingCtaSection,
	PricingFaqSection,
	PricingStatsGrid,
	pricingFaqs
} from './pricing-content'

export const metadata: Metadata = createPageMetadata({
	title: 'Property Management Software Pricing — Plans from $29/mo',
	description:
		'Affordable property management software. Starter ($29/mo, 5 properties), Growth ($79/mo, 20 properties), MAX ($199/mo, unlimited). 14-day free trial, no credit card required. Compare plans and features.',
	path: '/pricing'
})

export default async function PricingPage() {
	const faqJsonLd = createFaqJsonLd(
		pricingFaqs.map(faq => ({ question: faq.question, answer: faq.answer }))
	)
	const breadcrumbJsonLd = createBreadcrumbJsonLd('/pricing')
	const productJsonLd = createProductJsonLd({
		name: 'TenantFlow Property Management Software',
		description:
			'Professional property management software with lease tracking, maintenance management, and financial reporting. Plans starting at $29/month.',
		offers: [
			{ name: 'Starter', price: '29.00' },
			{ name: 'Growth', price: '79.00' },
			{ name: 'MAX', price: '199.00' }
		]
	})

	return (
		<PageLayout>
			<JsonLdScript schema={faqJsonLd} />
			<JsonLdScript schema={breadcrumbJsonLd} />
			<JsonLdScript schema={productJsonLd} />
			{/* Minimal Hero with Pricing Above the Fold */}
			<section className="relative overflow-hidden section-spacing animate-in fade-in duration-700">
				<div className="relative mx-auto flex max-w-7xl flex-col gap-12 px-6 text-center lg:px-8">
					<div className="flex flex-col items-center gap-6">
						<Badge variant="trustIndicator" size="trust">
							<div
								className="h-2 w-2 rounded-full bg-primary animate-pulse"
								aria-hidden="true"
							/>
							{`Trusted by ${SOCIAL_PROOF.managerCount} property professionals`}
						</Badge>
						<h1 className="text-balance typography-h1 tracking-tight text-foreground sm:text-5xl lg:text-6xl">
							Simple, transparent pricing for{' '}
							<span className="hero-highlight">every portfolio</span>
						</h1>
						<p className="mx-auto max-w-2xl text-balance text-lg text-muted-foreground text-sm-foreground">
							Choose your plan and start your 14-day free trial. Upgrade anytime
							as your portfolio grows.
						</p>
					</div>
					<div id="plans">
						<PricingSection />
					</div>
					<div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground text-sm-foreground">
						<div className="flex items-center gap-2">
							<CheckCircle2 className="h-4 w-4 text-success" />
							No credit card required
						</div>
						<div className="flex items-center gap-2">
							<CheckCircle2 className="h-4 w-4 text-success" />
							14-day free trial
						</div>
						<div className="flex items-center gap-2">
							<CheckCircle2 className="h-4 w-4 text-success" />
							Cancel anytime
						</div>
					</div>
				</div>
			</section>
			<PricingStatsGrid />
			<TestimonialsSection className="animate-in fade-in duration-700 delay-200" />
			<PricingFaqSection />
			<PricingCtaSection />
		</PageLayout>
	)
}
