import { PageLayout } from '#components/layout/page-layout'
import { Badge } from '#components/ui/badge'
import { CheckCircle2 } from 'lucide-react'
import { TestimonialsSection } from '#components/sections/testimonials-section'
import { PricingSection } from './_components/pricing-section'
import {
	PricingCtaSection,
	PricingFaqSection,
	PricingStatsGrid,
	pricingFaqs
} from './pricing-content'

export default async function PricingPage() {
	const baseUrl =
		process.env.NEXT_PUBLIC_APP_URL ||
		(process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000')

	const faqSchema = {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: pricingFaqs.map(faq => ({
			'@type': 'Question',
			name: faq.question,
			acceptedAnswer: {
				'@type': 'Answer',
				text: faq.answer
			}
		}))
	}

	const breadcrumbSchema = {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: [
			{ '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
			{ '@type': 'ListItem', position: 2, name: 'Pricing' }
		]
	}

	const offerSchema = {
		'@context': 'https://schema.org',
		'@type': 'Product',
		name: 'TenantFlow Property Management Software',
		description:
			'Professional property management software with automated rent collection, maintenance tracking, and financial reporting. Plans starting at $29/month.',
		image: [
			`${baseUrl}/images/property-management-og.jpg`,
			`${baseUrl}/tenant-flow-logo.png`
		],
		brand: { '@type': 'Brand', name: 'TenantFlow' },
		offers: [
			{
				'@type': 'Offer',
				name: 'Starter',
				price: '29.00',
				priceCurrency: 'USD',
				priceValidUntil: '2025-12-31',
				availability: 'https://schema.org/InStock',
				url: `${baseUrl}/pricing`,
				description: 'Ideal for small owners managing a few properties'
			},
			{
				'@type': 'Offer',
				name: 'Growth',
				price: '79.00',
				priceCurrency: 'USD',
				priceValidUntil: '2025-12-31',
				availability: 'https://schema.org/InStock',
				url: `${baseUrl}/pricing`,
				description: 'Perfect for growing property management portfolios'
			},
			{
				'@type': 'Offer',
				name: 'MAX',
				price: '199.00',
				priceCurrency: 'USD',
				priceValidUntil: '2025-12-31',
				availability: 'https://schema.org/InStock',
				url: `${baseUrl}/pricing`,
				description: 'Unlimited power for professional property managers'
			}
		],
		aggregateRating: {
			'@type': 'AggregateRating',
			ratingValue: '4.8',
			reviewCount: '1250',
			bestRating: '5'
		}
	}

	return (
		<PageLayout>
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(faqSchema).replace(/</g, '\\u003c')
				}}
			/>
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(breadcrumbSchema).replace(/</g, '\\u003c')
				}}
			/>
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(offerSchema).replace(/</g, '\\u003c')
				}}
			/>
			{/* Minimal Hero with Pricing Above the Fold */}
			<section className="relative overflow-hidden section-spacing animate-in fade-in duration-700">
				<div className="relative mx-auto flex max-w-7xl flex-col gap-12 px-6 text-center lg:px-8">
					<div className="flex flex-col items-center gap-6">
						<Badge variant="trustIndicator" size="trust">
							<div
								className="h-2 w-2 rounded-full bg-primary animate-pulse"
								aria-hidden="true"
							/>
							Trusted by 35,000+ property professionals
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
