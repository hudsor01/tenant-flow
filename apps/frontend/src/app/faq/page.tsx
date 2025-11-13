'use client'

import { FaqsAccordion } from '#app/faq/faq-accordion'
import Footer from '#components/layout/footer'
import Navbar from '#components/layout/navbar'
import { HeroSection } from '#components/sections/hero-section'
import { Button } from '#components/ui/button'
import { GridPattern } from '#components/ui/grid-pattern'
import { faqData } from '../../data/faqs'
import { ArrowRight } from 'lucide-react'

export default function FAQPage() {
	const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://tenantflow.app'

	// Use static FAQ data
	const faqCategories = faqData

	// FAQ Schema for Google rich snippets - flatten all questions
	const allQuestions = faqCategories.flatMap(category =>
		category.questions
	)
	const faqSchema = {
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: allQuestions.map(q => ({
			'@type': 'Question',
			name: q.question,
			acceptedAnswer: {
				'@type': 'Answer',
				text: q.answer
			}
		}))
	}

	// Breadcrumb Schema
	const breadcrumbSchema = {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: [
			{
				'@type': 'ListItem',
				position: 1,
				name: 'Home',
				item: baseUrl
			},
			{
				'@type': 'ListItem',
				position: 2,
				name: 'FAQ'
			}
		]
	}

	return (
		<div className="relative min-h-screen flex flex-col">
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
			{/* Full page grid background */}
			<GridPattern className="fixed inset-0 -z-10" />

			{/* Navigation */}
			<Navbar />

			{/* Hero Section */}
			<HeroSection
				trustBadge="Real answers from real results"
				title="Your $30,000 annual savings"
				titleHighlight="questions answered"
				subtitle="Everything you need to know about how TenantFlow delivers guaranteed 40% NOI increase, saves 20+ hours weekly, and pays for itself in 60 days. Real answers from real results."
				primaryCta={{
					label: 'Calculate Your Savings Now',
					href: '/signup'
				}}
				secondaryCta={{ label: 'Talk to Success Manager', href: '/pricing' }}
				trustSignals="40% NOI increase • 20+ hours saved weekly • 60-day ROI"
				image={{
					src: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2069&auto=format&fit=crop',
					alt: 'Modern office workspace showcasing property management efficiency'
				}}
			/>

			{/* FAQ Section */}
			<section className="section-spacing">
				<div className="max-w-4xl mx-auto px-6 lg:px-8">
					{faqCategories.length === 0 && (
						<div className="py-8 text-center text-muted-foreground">
							No FAQs available at the moment. Please check back later.
						</div>
					)}
					{faqCategories.length > 0 &&
					faqCategories.map((category) => (
						<FaqsAccordion
							key={category.category}
								category={category.category}
								faqs={category.questions}
								defaultOpenIndex={null}
							/>
						))}
				</div>
			</section>

			{/* CTA Section */}
			<section className="section-spacing bg-primary">
				<div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
					<h2 className="text-4xl font-bold text-primary-foreground mb-4">
						Still have questions?
					</h2>
					<p className="text-xl text-primary-foreground/90 mb-8">
						Speak with a property management automation expert and get a custom
						ROI projection for your portfolio.
					</p>
					<div className="flex flex-col sm:flex-row gap-4 justify-center">
						<Button size="lg" variant="secondary" className="px-8">
							Schedule Expert Consultation
							<ArrowRight className="size-5 ml-2" />
						</Button>
						<Button
							size="lg"
							variant="outline"
							className="px-8 text-primary-foreground border-primary-foreground/50 hover:bg-primary-foreground hover:text-primary"
						>
							Get Custom ROI Report
						</Button>
					</div>
				</div>
			</section>

			<Footer />
		</div>
	)
}
