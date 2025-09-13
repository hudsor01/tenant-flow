'use client'

import { useState } from 'react'
import { CheckoutForm } from '@/components/pricing/checkout-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PageLayout } from '@/components/layout/page-layout'
import { StripeProvider } from '@/providers/stripe-provider'

export default function CheckoutPage() {
	const router = useRouter()
	const [amount, setAmount] = useState<number>(1000) // $10.00 in cents
	const [showCheckout, setShowCheckout] = useState(false)

	const handleSuccess = (_paymentIntent: unknown) => {
		// Payment successful - navigate to success page
		router.push('/pricing/success')
	}

	const handleError = (_error: unknown) => {
		// Payment failed - handle error appropriately
	}

	const formatCurrency = (cents: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(cents / 100)
	}

	if (showCheckout) {
		return (
			<PageLayout className="gradient-authority" containerClass="max-w-md py-12">
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
			</PageLayout>
		)
	}

	return (
		<PageLayout className="gradient-authority" containerClass="max-w-md py-12">
			<Card>
				<CardHeader>
					<CardTitle>Test Stripe Payment</CardTitle>
					<div className="flex items-center gap-2 text-sm text-gray-600">
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
							onChange={(e) => setAmount(Number(e.target.value))}
							placeholder="Amount in cents (minimum 50)"
							min={50}
						/>
						<p className="text-sm text-gray-600">
							Enter amount in cents (e.g., 1000 = {formatCurrency(1000)})
						</p>
					</div>

					<div className="bg-blue-50 p-4 rounded-lg">
						<h3 className="font-semibold text-blue-900 mb-2">Test Payment Details</h3>
						<div className="text-sm text-blue-800 space-y-1">
							<p><strong>Amount:</strong> {formatCurrency(amount)}</p>
							<p><strong>Currency:</strong> USD</p>
							<p><strong>Test Mode:</strong> Yes</p>
						</div>
					</div>

					<div className="bg-yellow-50 p-4 rounded-lg">
						<h3 className="font-semibold text-yellow-900 mb-2">Test Card Numbers</h3>
						<div className="text-sm text-yellow-800 space-y-1">
							<p><strong>Success:</strong> 4242 4242 4242 4242</p>
							<p><strong>Decline:</strong> 4000 0000 0000 0002</p>
							<p><strong>CVV:</strong> Any 3 digits</p>
							<p><strong>Expiry:</strong> Any future date</p>
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
		</PageLayout>
	)
}
