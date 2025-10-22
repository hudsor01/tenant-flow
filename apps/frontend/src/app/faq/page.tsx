'use client'
import { GridPattern } from '@/components/magicui/grid-pattern'

import { FaqsAccordion } from '@/app/faq/faq-accordion'
import Footer from '@/components/layout/footer'
import { HeroSection } from '@/components/sections/hero-section'
import { Button } from '@/components/ui/button'

import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

const faqs = [
	{
		category: 'Getting Started',
		questions: [
			{
				question: 'How quickly can TenantFlow increase my NOI?',
				answer:
					'Most property managers see a 40% increase in NOI within 90 days. Our portfolio optimization tools, reduced vacancy periods (65% faster filling), and 32% maintenance cost reduction deliver immediate results. We guarantee ROI within the first 90 days or your money back.'
			},
			{
				question:
					'What makes TenantFlow different from other property management software?',
				answer:
					'TenantFlow is the only platform that guarantees a 40% NOI increase. While others focus on basic tasks, we provide enterprise-grade automation that handles 80% of your daily work automatically. Our clients save 20+ hours per week and reduce operational costs by 32% on average.'
			},
			{
				question: 'How much money will I save with TenantFlow?',
				answer:
					'The average property manager saves $2,400+ per property per year with TenantFlow. This comes from reduced vacancy time (65% faster), lower maintenance costs (32% reduction), streamlined operations, and eliminated manual tasks. Most clients see full ROI within 2.3 months.'
			}
		]
	},
	{
		category: 'Features & Benefits',
		questions: [
			{
				question: 'How does TenantFlow automate 80% of daily tasks?',
				answer:
					'Our smart workflows handle maintenance tracking, lease renewals, maintenance requests, tenant communications, and financial reporting automatically. AI-powered tenant screening, automated notifications, and smart vendor dispatch save you 20+ hours per week.'
			},
			{
				question: 'What specific results can I expect?',
				answer:
					'Based on 10,000+ properties managed: 40% average NOI increase, 65% faster vacancy filling, 32% maintenance cost reduction, 80% task automation, and 90% reduction in bad tenants through advanced screening. All results are tracked and guaranteed.'
			},
			{
				question: 'Is TenantFlow suitable for my portfolio size?',
				answer:
					'Yes! TenantFlow scales from 1 property to unlimited portfolios. Starter plan handles 1-5 properties, Growth plan manages up to 100 units, and TenantFlow Max supports unlimited properties with white-label options and dedicated account management.'
			}
		]
	},
	{
		category: 'Implementation & Support',
		questions: [
			{
				question: 'How long does setup take?',
				answer:
					'Most property managers are fully operational within 24-48 hours. Our onboarding specialists handle data migration, system configuration, and team training. You can start seeing results immediately with our automated workflows going live on day one.'
			},
			{
				question: 'What kind of support do you provide?',
				answer:
					'All plans include priority email support with 4-hour response times. Growth and Max plans get phone support and dedicated account managers. Our team includes property management experts who understand your challenges and provide strategic guidance.'
			},
			{
				question: 'Do you integrate with my existing systems?',
				answer:
					'TenantFlow integrates with all major accounting software, payment processors, and maintenance platforms. Our API connects with 500+ business tools. Custom integrations are available for TenantFlow Max customers with dedicated development support.'
			}
		]
	},
	{
		category: 'Security & Compliance',
		questions: [
			{
				question: 'How secure is my data?',
				answer:
					'TenantFlow uses bank-level security with 256-bit SSL encryption, SOC 2 Type II compliance, and regular security audits. Your data is backed up across multiple secure data centers with 99.9% uptime SLA and enterprise-grade protection.'
			},
			{
				question: 'Do you comply with rental regulations?',
				answer:
					'Yes, TenantFlow automatically handles compliance for all 50 states including fair housing laws, rent control regulations, eviction procedures, and tenant rights. Our legal team updates the system continuously as regulations change.'
			}
		]
	},
	{
		category: 'Pricing & ROI',
		questions: [
			{
				question: "What if TenantFlow doesn't deliver the promised results?",
				answer:
					"We guarantee 40% NOI increase within 90 days or your money back. If you don't see measurable improvements in operational efficiency, cost reduction, and revenue optimization, we'll refund your subscription completely."
			},
			{
				question: 'Are there any hidden fees?',
				answer:
					'No hidden fees ever. Our transparent pricing includes all features, unlimited support, regular updates, and data migration. The only additional cost is if you choose premium add-ons like custom integrations or dedicated training sessions.'
			},
			{
				question: 'Can I try TenantFlow risk-free?',
				answer:
					"Yes! Start with our 14-day transformation trial - no credit card required. Experience the full platform, see real results, and if you're not completely satisfied, there's no obligation to continue."
			}
		]
	}
]

export default function FAQPage() {
	return (
		<div className="relative min-h-screen flex flex-col">
			{/* Full page grid background */}
			<GridPattern className="fixed inset-0 -z-10" />

			{/* Navigation */}
			<nav className="fixed top-6 left-1/2 z-50 w-auto -translate-x-1/2 transform rounded-full px-8 py-4 backdrop-blur-xl border border-border shadow-lg bg-background/90">
				<div className="flex items-center justify-between gap-12">
					<Link
						href="/"
						className="flex items-center space-x-3 hover:opacity-80 transition-opacity duration-200"
					>
						<div className="w-8 h-8 rounded-lg overflow-hidden bg-primary border border-border flex items-center justify-center">
							<svg
								viewBox="0 0 24 24"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
								className="w-5 h-5 text-primary-foreground"
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
							<ArrowRight className="ml-2 h-4 w-4" />
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
					{faqs.map((category, categoryIndex) => (
						<FaqsAccordion
							key={categoryIndex}
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
							<ArrowRight className="w-5 h-5 ml-2" />
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
