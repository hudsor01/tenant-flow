/**
 * Modern Pricing Page - Clean Implementation
 * Replaces the previous 25+ component architecture with 5 simple components
 */

import type { Metadata } from 'next/types'
import { PricingHero } from '@/components/pricing/pricing-hero'
import { PricingCards } from '@/components/pricing/pricing-cards'
import { PricingFAQ } from '@/components/pricing/pricing-faq'
import { PricingComparison } from '@/components/pricing/pricing-comparison'
import { PricingCTA } from '@/components/pricing/pricing-cta'

export const metadata: Metadata = {
	title: 'Pricing Plans - TenantFlow Property Management',
	description:
		'Simple, transparent pricing for property management software. Start with a free trial, then scale as your portfolio grows. No hidden fees.',
	keywords: [
		'property management pricing',
		'rental software cost',
		'property management software plans',
		'landlord tools pricing',
		'tenant management pricing'
	],
	openGraph: {
		title: 'TenantFlow Pricing - Property Management Software',
		description:
			'Professional property management starting at $29/month. Free trial included.',
		type: 'website',
		images: [
			{
				url: '/og-pricing.jpg',
				width: 1200,
				height: 630,
				alt: 'TenantFlow Pricing Plans'
			}
		]
	},
	twitter: {
		card: 'summary_large_image',
		title: 'TenantFlow Pricing Plans',
		description: 'Professional property management starting at $29/month',
		images: ['/og-pricing.jpg']
	},
	alternates: {
		canonical: 'https://tenantflow.app/pricing'
	}
}

export default function PricingPage() {
	return (
		<div className="min-h-screen bg-white">
			{/* Hero Section */}
			<PricingHero />

			{/* Pricing Cards */}
			<PricingCards />

			{/* Feature Comparison */}
			<PricingComparison />

			{/* FAQ Section */}
			<PricingFAQ />

			{/* Final CTA */}
			<PricingCTA />

			{/* Schema.org structured data for SEO */}
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify({
						'@context': 'https://schema.org',
						'@type': 'Product',
						name: 'TenantFlow Property Management Software',
						description:
							'Professional property management software for landlords and property managers',
						offers: [
							{
								'@type': 'Offer',
								name: 'Starter',
								description:
									'Perfect for small property managers',
								price: 29,
								priceCurrency: 'USD',
								priceSpecification: {
									'@type': 'UnitPriceSpecification',
									price: 29,
									priceCurrency: 'USD',
									unitCode: 'MON'
								},
								availability: 'https://schema.org/InStock',
								url: 'https://tenantflow.app/signup?plan=STARTER'
							},
							{
								'@type': 'Offer',
								name: 'Growth',
								description:
									'Ideal for growing property portfolios',
								price: 89,
								priceCurrency: 'USD',
								priceSpecification: {
									'@type': 'UnitPriceSpecification',
									price: 89,
									priceCurrency: 'USD',
									unitCode: 'MON'
								},
								availability: 'https://schema.org/InStock',
								url: 'https://tenantflow.app/signup?plan=GROWTH'
							},
							{
								'@type': 'Offer',
								name: 'TenantFlow Max',
								description:
									'Enterprise-grade property management',
								price: 199,
								priceCurrency: 'USD',
								priceSpecification: {
									'@type': 'UnitPriceSpecification',
									price: 199,
									priceCurrency: 'USD',
									unitCode: 'MON'
								},
								availability: 'https://schema.org/InStock',
								url: 'https://tenantflow.app/signup?plan=TENANTFLOW_MAX'
							}
						],
						aggregateRating: {
							'@type': 'AggregateRating',
							ratingValue: '4.9',
							reviewCount: '500+'
						},
						brand: {
							'@type': 'Brand',
							name: 'TenantFlow'
						}
					})
				}}
			/>
		</div>
	)
}

// Enable ISR for better performance
export const revalidate = 3600 // Revalidate every hour
