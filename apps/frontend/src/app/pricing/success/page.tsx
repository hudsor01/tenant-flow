'use client'

import { API_BASE_URL } from '@/lib/api-client'
import type { SubscriptionData } from '@/types/stripe'
import { CheckCircle, Home } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'



export default function CheckoutSuccessPage() {
	const searchParams = useSearchParams()
	const sessionId = searchParams?.get('session_id')
	const [isVerifying, setIsVerifying] = useState(true)
	const [subscription, setSubscription] = useState<SubscriptionData | null>(
		null
	)

	useEffect(() => {
		const verifyPayment = async () => {
			if (!sessionId) {
				toast.error('No session ID found')
				setIsVerifying(false)
				return
			}

			try {
				// Verify the checkout session with your backend
				const response = await fetch(`${API_BASE_URL}/stripe/verify-session`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${localStorage.getItem('auth-token') || ''}`
					},
					body: JSON.stringify({ sessionId })
				})

				if (response.ok) {
					const data = await response.json()
					setSubscription(data.subscription)
					toast.success('Payment successful! Welcome to your new plan.')
				} else {
					toast.error('Failed to verify payment')
				}
			} catch (error) {
				console.error('Verification error:', error)
				toast.error('Failed to verify payment')
			} finally {
				setIsVerifying(false)
			}
		}

		verifyPayment()
	}, [sessionId])

	if (isVerifying) {
		return (
			<main className="min-h-screen bg-background">
				<Navbar />
				<div className="pt-20 flex items-center justify-center min-h-[60vh]">
					<div className="text-center">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
						<h2 className="text-xl font-semibold mb-2">
							Verifying your payment...
						</h2>
						<p className="text-muted-foreground">
							Please wait while we confirm your subscription.
						</p>
					</div>
				</div>
			</main>
		)
	}

	return (
		<main className="min-h-screen gradient-authority">
			<Navbar />
			<div className="pt-20">
				<div className="container mx-auto px-4 section-content max-w-2xl">
					<Card className="text-center card-elevated-authority">
						<CardHeader className="pb-8">
							<div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
								<CheckCircle className="w-8 h-8 text-accent" />
							</div>
							<CardTitle className="text-3xl font-bold mb-4">
								Payment Successful!
							</CardTitle>
							<p className="text-xl text-muted-foreground">
								Welcome to TenantFlow! Your subscription is now active.
							</p>
						</CardHeader>

						<CardContent className="space-y-6">
							{subscription && (
								<div className="bg-muted/50 rounded-lg p-6 text-left">
									<h3 className="font-semibold mb-4">Subscription Details</h3>
									<div className="space-y-2 text-sm">
										<div className="flex justify-between">
											<span className="text-muted-foreground">Plan:</span>
											<Badge variant="secondary">{subscription.planName}</Badge>
										</div>
										<div className="flex justify-between">
											<span className="text-muted-foreground">Billing:</span>
											<span>
												{subscription.interval === 'annual'
													? 'Annual'
													: 'Monthly'}
											</span>
										</div>
										<div className="flex justify-between">
											<span className="text-muted-foreground">Status:</span>
											<Badge
												variant="default"
												className="bg-accent/10 text-accent"
											>
												Active
											</Badge>
										</div>
									</div>
								</div>
							)}

							<div className="space-y-4">
								<h3 className="font-semibold">What's next?</h3>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
									<Link href="/dashboard">
										<Button className="w-full justify-start" size="lg">
											<Home className="w-4 h-4 mr-2" />
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
								<p className="text-sm text-muted-foreground mb-4">
									A confirmation email has been sent to your email address with
									your receipt and subscription details.
								</p>
								<p className="text-sm text-muted-foreground">
									Need help?{' '}
									<Link
										href="/contact"
										className="text-primary hover:underline"
									>
										Contact our support team
									</Link>
								</p>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</main>
	)
}
