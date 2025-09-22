'use client'

import { Navbar } from '@/components/layout/navbar'
import { HeroAuthority } from '@/components/marketing/hero-authority'
import Footer from '@/components/layout/footer'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Home, MessageCircle, XCircle } from 'lucide-react'
import Link from 'next/link'

export default function CheckoutCancelPage() {
	return (
		<main className="min-h-screen gradient-authority">
			<Navbar />

			{/* Hero Authority Section */}
			<HeroAuthority
				title={<>Payment Cancelled</>}
				subtitle={
					<>
						No worries! Your payment was cancelled and you haven't been charged.
						You can try again anytime or contact our support team for
						assistance.
					</>
				}
				primaryCta={{ label: 'Back to Pricing', href: '/pricing' }}
				secondaryCta={{ label: 'Contact Support', href: '/contact' }}
			/>

			<div className="pt-20">
				<div className="container mx-auto px-4 section-content max-w-2xl">
					<Card className="text-center card-elevated-authority">
						<CardHeader className="pb-8">
							<div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-6">
								<XCircle className="w-8 h-8 text-muted-foreground" />
							</div>
							<CardTitle className="text-3xl font-bold mb-4">
								Payment Cancelled
							</CardTitle>
							<p className="text-xl text-muted-foreground">
								No worries! Your payment was cancelled and you haven't been
								charged.
							</p>
						</CardHeader>

						<CardContent className="space-y-6">
							<div className="bg-muted/50 rounded-lg p-6 text-left">
								<h3 className="font-semibold mb-4">What happened?</h3>
								<ul className="space-y-2 text-sm text-muted-foreground">
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
											<ArrowLeft className="w-4 h-4 mr-2" />
											Back to Pricing
										</Button>
									</Link>
									<Link href="/dashboard">
										<Button variant="outline" className="w-full" size="lg">
											<Home className="w-4 h-4 mr-2" />
											Go to Dashboard
										</Button>
									</Link>
								</div>
							</div>

							<div className="pt-6 border-t">
								<p className="text-sm text-muted-foreground mb-4">
									Still have questions about our pricing or need help choosing
									the right plan?
								</p>
								<div className="flex flex-col sm:flex-row items-center justify-center gap-4">
									<Link href="/contact">
										<Button variant="outline" size="sm">
											<MessageCircle className="w-4 h-4 mr-2" />
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
						</CardContent>
					</Card>
				</div>
			</div>
			<Footer />
		</main>
	)
}
