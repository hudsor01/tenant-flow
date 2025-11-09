'use client'
import { GridPattern } from '#components/ui/grid-pattern'
import { FaqsAccordion } from '#app/faq/faq-accordion'
import Footer from '#components/layout/footer'
import { HeroSection } from '#components/sections/hero-section'
import { Button } from '#components/ui/button'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useFAQs } from '#hooks/api/use-faq'
import type { FAQQuestion } from '@repo/shared/types/faq'

export default function FAQPage() {
	const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://tenantflow.app'
	const { data: faqs, isLoading, error, refetch } = useFAQs()

	// Show loading state
	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
					<p className="text-muted-foreground">Loading FAQs...</p>
				</div>
			</div>
		)
	}

	// Show error state
	if (error) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-center space-y-4">
					<h1 className="text-2xl font-bold text-destructive mb-4">
						Failed to load FAQs
					</h1>
					<p className="text-muted-foreground">
						Unable to load FAQ content. Please try again.
					</p>
					<Button onClick={() => refetch()} variant="outline">
						Retry
					</Button>
				</div>
			</div>
		)
	}

	// Transform API data to match the expected format for the accordion
	const faqCategories =
		faqs?.map(category => ({
			category: category.name,
			questions: category.questions.map((q: FAQQuestion) => ({
				question: q.question,
				answer: q.answer
			}))
		})) || []

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
			<nav className="fixed top-6 left-1/2 z-50 w-auto translate-x-[-50%] transform rounded-full px-8 py-4 backdrop-blur-xl border border-border shadow-lg bg-background/90">
				<div className="flex items-center justify-between gap-12">
					<Link
						href="/"
						className="flex items-center space-x-3 hover:opacity-80 transition-opacity duration-200"
					>
						<div className="size-11 rounded-lg overflow-hidden bg-primary border border-border flex items-center justify-center">
							<svg
								viewBox="0 0 24 24"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
								className="size-5 text-primary-foreground"
							>
								<path
									d="M3 21L21 21M5 21V7L12 3L19 7V21M9 12H15M9 16H15"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
						</div>
						<span className="text-xl font-bold text-foreground tracking-tight">
							TenantFlow
						</span>
					</Link>

					<div className="hidden md:flex items-center space-x-1">
						<Link
							href="/features"
							className="px-4 py-2 text-muted-foreground hover:text-foreground font-medium text-sm rounded-xl hover:bg-accent transition-all duration-200"
						>
							Features
						</Link>
						<Link
							href="/pricing"
							className="px-4 py-2 text-muted-foreground hover:text-foreground font-medium text-sm rounded-xl hover:bg-accent transition-all duration-200"
						>
							Pricing
						</Link>
						<Link
							href="/about"
							className="px-4 py-2 text-muted-foreground hover:text-foreground font-medium text-sm rounded-xl hover:bg-accent transition-all duration-200"
						>
							About
						</Link>
						<Link
							href="/blog"
							className="px-4 py-2 text-muted-foreground hover:text-foreground font-medium text-sm rounded-xl hover:bg-accent transition-all duration-200"
						>
							Blog
						</Link>
						<Link
							href="/faq"
							className="px-4 py-2 text-muted-foreground hover:text-foreground font-medium text-sm rounded-xl hover:bg-accent transition-all duration-200"
						>
							FAQ
						</Link>
						<Link
							href="/contact"
							className="px-4 py-2 text-muted-foreground hover:text-foreground font-medium text-sm rounded-xl hover:bg-accent transition-all duration-200"
						>
							Contact
						</Link>
					</div>

					<div className="flex items-center space-x-3">
						<Link
							href="/login"
							className="hidden sm:flex px-4 py-2 text-foreground rounded-xl hover:bg-accent transition-all duration-300 font-medium"
						>
							Sign In
						</Link>
						<Link
							href="/signup"
							className="flex items-center px-6 py-2.5 bg-primary text-primary-foreground font-medium text-sm rounded-xl hover:bg-primary/90 transition-all duration-200 shadow-lg hover:shadow-xl"
						>
							Get Started
							<ArrowRight className="ml-2 size-4" />
						</Link>
					</div>
				</div>
			</nav>

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
			<section className="section-hero">
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
			<section className="section-content bg-primary">
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
