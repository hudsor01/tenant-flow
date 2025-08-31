'use client'

import { useRouter } from 'next/navigation'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MessageCircleIcon, HelpCircle, XCircle, ArrowLeft, ExternalLink } from 'lucide-react'

/**
 * Client Component - PaymentCancelled
 * Handles cancellation state and user interactions
 */
export function PaymentCancelled() {
	const router = useRouter()

	return (
		<div className="space-y-8">
			{/* Cancel Header */}
			<div className="text-center">
				<XCircle className="text-muted-foreground mx-auto mb-4 h-16 w-16 opacity-60" />
				<h1 className="mb-2 text-4xl font-bold">Checkout Cancelled</h1>
				<p className="text-muted-foreground text-xl">
					Your subscription setup was cancelled. No charges were made.
				</p>
			</div>

			{/* Primary Actions */}
			<Card className="border-primary/20">
				<CardHeader>
					<CardTitle>What would you like to do?</CardTitle>
					<CardDescription>
						We're here to help if you have any questions about our
						plans
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<Button
							onClick={() => router.push('/pricing')}
							className="w-full"
							size="lg"
						>
							<ArrowLeft className="mr-2 h-5 w-5" />
							Return to Pricing
						</Button>

						<Button
							onClick={() => router.push('/dashboard')}
							variant="outline"
							className="w-full"
							size="lg"
						>
							Go to Dashboard
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Help Options */}
			<Card>
				<CardHeader>
					<CardTitle>Need Help Choosing a Plan?</CardTitle>
					<CardDescription>
						We understand selecting the right plan can be
						challenging. Here's how we can help:
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<HelpOption
							icon={MessageCircleIcon}
							title="Chat with Sales"
							description="Get personalized recommendations for your portfolio"
							action={() =>
								window.open('/support/chat', '_blank')
							}
						/>

						<HelpOption
							icon={HelpCircle}
							title="View FAQs"
							description="Find answers to common questions about our plans"
							action={() => router.push('/pricing#faq')}
						/>
					</div>
				</CardContent>
			</Card>

			{/* Common Questions */}
			<div>
				<h3 className="mb-4 text-lg font-semibold">Common Questions</h3>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<FAQCard
						question="Can I start with a free trial?"
						answer="Yes! We offer a 14-day free trial with no credit card required. You can explore all features before committing."
					/>

					<FAQCard
						question="Can I change plans later?"
						answer="Absolutely. You can upgrade or downgrade your plan at any time, and we'll prorate the difference."
					/>

					<FAQCard
						question="What if I need help getting started?"
						answer="All paid plans include onboarding support. Our team will help you import your data and get set up quickly."
					/>

					<FAQCard
						question="Is my data secure?"
						answer="Yes, we use enterprise-grade security with 256-bit SSL encryption and SOC 2 compliance to protect your data."
					/>
				</div>
			</div>

			{/* Contact Support */}
			<Card className="from-primary/5 to-primary/10 border-primary/20 bg-gradient-to-r">
				<CardContent className="pt-6">
					<div className="text-center">
						<h4 className="mb-2 font-semibold">
							Still have questions?
						</h4>
						<p className="text-muted-foreground mb-6">
							Our team is here to help you find the perfect
							solution for your property management needs.
						</p>
						<div className="flex flex-wrap justify-center gap-4">
							<Button
								variant="outline"
								onClick={() =>
									(window.location.href =
										'mailto:support@tenantflow.app')
								}
								className="group"
							>
								Email Support
								<ExternalLink className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
							</Button>
							<Button
								onClick={() =>
									window.open('/book-demo', '_blank')
								}
								className="group"
							>
								Book a Demo
								<ExternalLink className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}

/**
 * Help Option Component
 */
function HelpOption({
	icon: Icon,
	title,
	description,
	action
}: {
	icon: React.ComponentType<{ className?: string }>
	title: string
	description: string
	action: () => void
}) {
	return (
		<button
			onClick={action}
			className="hover:bg-muted/50 hover:border-primary/30 group w-full rounded-lg border p-4 text-left transition-all duration-200"
		>
			<div className="flex items-start gap-3">
				<div className="bg-primary/10 group-hover:bg-primary/15 rounded-md p-2 transition-colors">
					<Icon className="text-primary h-5 w-5" />
				</div>
				<div className="flex-1">
					<p className="group-hover:text-primary font-medium transition-colors">
						{title}
					</p>
					<p className="text-muted-foreground mt-1 text-sm">
						{description}
					</p>
				</div>
				<ExternalLink className="text-muted-foreground group-hover:text-primary h-4 w-4 opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100" />
			</div>
		</button>
	)
}

/**
 * FAQ Card Component
 */
function FAQCard({ question, answer }: { question: string; answer: string }) {
	return (
		<Card className="h-full">
			<CardContent className="p-4">
				<h4 className="text-foreground mb-2 font-medium">{question}</h4>
				<p className="text-muted-foreground text-sm leading-relaxed">
					{answer}
				</p>
			</CardContent>
		</Card>
	)
}
