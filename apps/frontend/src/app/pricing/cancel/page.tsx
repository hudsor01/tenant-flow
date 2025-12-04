'use client'

import Footer from '#components/ui/layout/footer'
import { Navbar } from '#components/ui/layout/navbar'
import { HeroSection } from '#components/sections/hero-section'

import { Button } from '#components/ui/button'
import { CardLayout } from '#components/ui/card-layout'
import { ArrowLeft, Home, MessageCircle, XCircle } from 'lucide-react'
import Link from 'next/link'

export default function CheckoutCancelPage() {
	return (
		<div className="min-h-screen bg-primary flex flex-col">
			<Navbar />

			<main className="flex-1 page-offset-navbar">
				{/* Hero Section */}
				<HeroSection
				title="Payment Cancelled"
				subtitle="No worries! Your payment was cancelled and you haven&apos;t been charged. You can try again anytime or contact our support team for assistance."
				primaryCta={{ label: 'Back to Pricing', href: '/pricing' }}
				secondaryCta={{ label: 'Contact Support', href: '/contact' }}
			/>

			<div className="section-content">
				<div className="container mx-auto px-4 section-content max-w-2xl">
					<CardLayout
						title="Payment Cancelled"
						description="No worries! Your payment was cancelled and you haven&apos;t been charged."
						className="text-center"
					>
						<div className="pb-8">
							<div className="size-16 bg-muted/30 rounded-full flex-center mx-auto mb-6">
								<XCircle className="size-8 text-muted-foreground" />
							</div>
							<p className="text-xl text-muted-foreground">
								No worries! Your payment was cancelled and you haven&apos;t been
								charged.
							</p>
						</div>

						<div className="space-y-6">
							<div className="bg-muted/50 rounded-lg p-6 text-left">
								<h3 className="font-semibold mb-4">What happened?</h3>
								<ul className="space-y-2 text-muted">
									<li>• You cancelled the checkout process</li>
									<li>• No payment was processed</li>
									<li>• Your account remains unchanged</li>
									<li>• You can try again anytime</li>
								</ul>
							</div>

							<div className="space-y-4">
								<h3 className="font-semibold">Ready to get started?</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<Link href="/pricing">
										<Button className="w-full" size="lg">
											<ArrowLeft className="size-4 mr-2" />
											Back to Pricing
										</Button>
									</Link>
									<Link href="/dashboard">
										<Button variant="outline" className="w-full" size="lg">
											<Home className="size-4 mr-2" />
											Go to Dashboard
										</Button>
									</Link>
								</div>
							</div>

							<div className="pt-6 border-t">
								<p className="text-muted mb-4">
									Still have questions about our pricing or need help choosing
									the right plan?
								</p>
								<div className="flex flex-col sm:flex-row items-center justify-center gap-4">
									<Link href="/contact">
										<Button variant="outline" size="sm">
											<MessageCircle className="size-4 mr-2" />
											Contact Support
										</Button>
									</Link>
									<Link href="/features">
										<Button variant="ghost" size="sm">
											View Features
										</Button>
									</Link>
								</div>
							</div>
						</div>
					</CardLayout>
				</div>
			</div>
		</main>
			<Footer />
		</div>
	)
}
