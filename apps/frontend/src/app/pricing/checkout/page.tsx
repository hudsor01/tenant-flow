'use client'

import Footer from '@/components/layout/footer'
import { Navbar } from '@/components/layout/navbar'
import { HeroAuthority } from '@/components/marketing/hero-authority'

import { CheckoutForm } from '@/components/pricing/checkout-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StripeProvider } from '@/providers/stripe-provider'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

export default function CheckoutPage() {
	const router = useRouter()
	const [amount, setAmount] = useState<number>(1000) // $10.00 in cents
	const [showCheckout, setShowCheckout] = useState(false)

	const handleSuccess = () => {
		// Payment successful - navigate to success page
		router.push('/pricing/success')
	}

	const handleError = (error: unknown) => {
		console.error('Payment failed:', error)
		toast.error('Payment failed. Please try again.')
		router.push('/pricing')
	}

	const formatCurrency = (cents: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(cents / 100)
	}

	if (showCheckout) {
		return (
			<main className="min-h-screen gradient-authority">
				<Navbar />

				{/* Hero Authority Section */}
				<HeroAuthority
					title={<>Complete Your Payment</>}
					subtitle={
						<>
							Secure checkout powered by Stripe. Your payment information is
							encrypted and protected with industry-leading security.
						</>
					}
					primaryCta={{ label: 'Need Help?', href: '/contact' }}
					secondaryCta={{ label: 'Back to Pricing', href: '/pricing' }}
				/>

				<div className="container mx-auto px-4 py-12 max-w-md">
					<div className="mb-6">
						<Button
							variant="ghost"
							onClick={() => setShowCheckout(false)}
							className="mb-4"
						>
							<ArrowLeft className="w-4 h-4 mr-2" />
							Back
						</Button>
					</div>

					<StripeProvider>
						<CheckoutForm
							amount={amount}
							currency="usd"
							metadata={{ testPayment: 'true' }}
							onSuccess={handleSuccess}
							onError={handleError}
						/>
					</StripeProvider>
				</div>
				<Footer />
			</main>
		)
	}

	return (
		<main className="min-h-screen gradient-authority">
			<Navbar />

			{/* Hero Authority Section */}
			<HeroAuthority
				title={<>Test Stripe Payment</>}
				subtitle={
					<>
						Try our secure payment system with test cards. This is a safe
						testing environment where no real charges will be made.
					</>
				}
				primaryCta={{ label: 'View Pricing Plans', href: '/pricing' }}
				secondaryCta={{ label: 'Contact Support', href: '/contact' }}
			/>

			<div className="container mx-auto px-4 py-12 max-w-md">
				<Card>
					<CardHeader>
						<CardTitle>Test Stripe Payment</CardTitle>
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<Link href="/pricing" className="hover:underline">
								← Back to Pricing
							</Link>
						</div>
					</CardHeader>
					<CardContent className="space-y-6">
						<div className="space-y-2">
							<Label htmlFor="amount">Payment Amount</Label>
							<Input
								id="amount"
								type="number"
								value={amount}
								onChange={e => setAmount(Number(e.target.value))}
								placeholder="Amount in cents (minimum 50)"
								min={50}
							/>
							<p className="text-sm text-muted-foreground">
								Enter amount in cents (e.g., 1000 = {formatCurrency(1000)})
							</p>
						</div>

						<div className="bg-primary/10 p-4 rounded-lg">
							<h3 className="font-semibold text-primary mb-2">
								Test Payment Details
							</h3>
							<div className="text-sm text-primary/80 space-y-1">
								<p>
									<strong>Amount:</strong> {formatCurrency(amount)}
								</p>
								<p>
									<strong>Currency:</strong> USD
								</p>
								<p>
									<strong>Test Mode:</strong> Yes
								</p>
							</div>
						</div>

						<div className="bg-accent/10 p-4 rounded-lg">
							<h3 className="font-semibold text-accent mb-2">
								Test Card Numbers
							</h3>
							<div className="text-sm text-accent/80 space-y-1">
								<p>
									<strong>Success:</strong> 4242 4242 4242 4242
								</p>
								<p>
									<strong>Decline:</strong> 4000 0000 0000 0002
								</p>
								<p>
									<strong>CVV:</strong> Any 3 digits
								</p>
								<p>
									<strong>Expiry:</strong> Any future date
								</p>
							</div>
						</div>

						<Button
							onClick={() => setShowCheckout(true)}
							className="w-full"
							size="lg"
							disabled={amount < 50}
						>
							Proceed to Payment ({formatCurrency(amount)})
						</Button>
					</CardContent>
				</Card>
			</div>
			<Footer />
		</main>
	)
}
