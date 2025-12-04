'use client'

import Footer from '#components/ui/layout/footer'
import { Navbar } from '#components/ui/layout/navbar'
import { HeroSection } from '#components/sections/hero-section'
import { CustomerPortalButton } from '#components/pricing/customer-portal'
import { Button } from '#components/ui/button'
import { CardLayout } from '#components/ui/card-layout'
import { usePaymentVerification } from '#hooks/api/use-payment-verification'
import { CheckCircle, Home } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { toast } from 'sonner'

export default function CheckoutSuccessPage() {
	const searchParams = useSearchParams()
	const sessionId = searchParams?.get('session_id')

	// Use TanStack Query for payment verification
	const {
		data: verificationData,
		isLoading: isVerifying,
		error: verificationError,
		isSuccess
	} = usePaymentVerification(sessionId)

	const subscription = verificationData?.subscription

	// Handle success/error notifications
	useEffect(() => {
		if (isSuccess && subscription) {
			toast.success('Payment successful! Welcome to your new plan.')
		}
	}, [isSuccess, subscription])

	useEffect(() => {
		if (verificationError) {
			toast.error('Failed to verify payment')
		}
	}, [verificationError])

	useEffect(() => {
		if (!sessionId) {
			toast.error('No session ID found')
		}
	}, [sessionId])

	if (isVerifying) {
		return (
			<div className="min-h-screen bg-background flex flex-col">
				<Navbar />
				<main className="flex-1 page-offset-navbar flex-center">
					<div className="text-center">
						<div className="animate-spin rounded-full size-12 border-b-2 border-primary mx-auto mb-4"></div>
						<h2 className="text-xl font-semibold mb-2">
							Verifying your payment...
						</h2>
						<p className="text-muted-foreground">
							Please wait while we confirm your subscription.
						</p>
					</div>
				</main>
			</div>
		)
	}

	return (
		<div className="min-h-screen bg-primary flex flex-col">
			<Navbar />

			<main className="flex-1 page-offset-navbar">

			{/* Hero Section */}
			<HeroSection
				title="Payment Successful!"
				subtitle="Welcome to TenantFlow! Your subscription is now active and ready to use. Start managing your properties with enterprise-grade tools."
				primaryCta={{ label: 'Go to Dashboard', href: '/' }}
				secondaryCta={{ label: 'Contact Support', href: '/contact' }}
			/>

			<div className="section-content">
				<div className="max-w-2xl mx-auto px-6 lg:px-8">
					<CardLayout
						title="Payment Successful!"
						description="Welcome to TenantFlow! Your subscription is now active."
						className="text-center shadow-2xl border-2 border-border/50"
					>
						<div className="pb-8">
							<div className="size-16 bg-accent/10 rounded-full flex-center mx-auto mb-6">
								<CheckCircle className="size-8 text-accent" />
							</div>
							<p className="text-xl text-muted-foreground">
								Welcome to TenantFlow! Your subscription is now active.
							</p>
						</div>

						<div className="space-y-6">
							<div className="space-y-4">
								<h3 className="font-semibold">What&apos;s next?</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
									<Link href="/dashboard">
										<Button className="w-full justify-start" size="lg">
											<Home className="size-4 mr-2" />
											Go to Dashboard
										</Button>
									</Link>
									<CustomerPortalButton
										className="w-full justify-start"
										size="lg"
									/>
								</div>
							</div>

							<div className="pt-6 border-t">
								<p className="text-muted mb-4">
									A confirmation email has been sent to your email address with
									your receipt and subscription details.
								</p>
								<p className="text-muted">
									Need help?{' '}
									<Link
										href="/contact"
										className="text-primary hover:underline"
									>
										Contact our support team
									</Link>
								</p>
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
