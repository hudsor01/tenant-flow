'use client'

import { useState } from 'react'
import { Button } from '#components/ui/button'
import { PaymentOptionCard } from '#components/settings/payment-option-card'
import { PaymentMethodsTab } from './payment-methods-tab'
import { StripeConnectTab } from './stripe-connect-tab'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle
} from '#components/ui/dialog'
import { AddPaymentMethod } from '#app/(owner)/payments/methods/add-payment-method.client'
import { usePaymentMethods } from '#hooks/api/use-payment-methods'

export default function SettingsPage() {
	const [showAddPaymentDialog, setShowAddPaymentDialog] = useState(false)
	const [showStripeConnectDialog, setShowStripeConnectDialog] = useState(false)
	const { refetch } = usePaymentMethods()

	return (
		<div className="container mx-auto py-8">
			<div className="mb-8">
				<h1 className="typography-h2 tracking-tight flex items-center gap-2">
					<span className="size-8" />
					Settings
				</h1>
				<p className="text-muted-foreground mt-2">
					Manage your account settings, payment methods, and integrations
				</p>
			</div>

			{/* Payment Options Comparison */}
			<div className="space-y-6">
				<div>
					<h2 className="typography-h3 mb-2">Payment Options</h2>
					<p className="text-muted-foreground">
						Choose how you want to pay rent. Both options are secure and easy to
						use.
					</p>
				</div>

				<div className="grid gap-6 md:grid-cols-2" data-tour="payment-options">
					{/* Add Payment Method Option */}
					<PaymentOptionCard
						title="Add Payment Method"
						description="Save a card or bank account for one-time payments or autopay"
						pros={[
							'Convenient autopay setup',
							'Earn card rewards on rent payments',
							'Instant payment processing',
							'Easy to manage multiple payment methods'
						]}
						cons={[
							'Processing fees may apply (2.9% + $0.30 for cards)',
							'Card limits may apply for large payments'
						]}
						recommended={true}
						tourId="payment-options"
					>
						<Button
							onClick={() => setShowAddPaymentDialog(true)}
							className="w-full"
						>
							Add Payment Method
						</Button>
					</PaymentOptionCard>

					{/* Stripe Connect Option */}
					<PaymentOptionCard
						title="Stripe Connect"
						description="Direct bank connection for ACH transfers"
						pros={[
							'Lower fees (0.8% capped at $5)',
							'Direct bank-to-bank transfers',
							'No card limits',
							'Secure bank verification'
						]}
						cons={[
							'Requires bank account verification',
							'ACH transfers take 3-5 business days',
							'More setup steps required'
						]}
					>
						<Button
							onClick={() => setShowStripeConnectDialog(true)}
							variant="outline"
							className="w-full"
						>
							Connect Bank Account
						</Button>
					</PaymentOptionCard>
				</div>

				{/* Existing Payment Methods Section */}
				<div className="mt-12">
					<h2 className="typography-h3 mb-6">Your Payment Methods</h2>
					<PaymentMethodsTab />
				</div>

				{/* Stripe Connect Status Section */}
				<div className="mt-12">
					<h2 className="typography-h3 mb-6">
						Bank Connection Status
					</h2>
					<StripeConnectTab />
				</div>
			</div>

			{/* Add Payment Method Dialog */}
			<Dialog
				open={showAddPaymentDialog}
				onOpenChange={setShowAddPaymentDialog}
			>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Add Payment Method</DialogTitle>
						<DialogDescription>
							Add a new card or bank account for rent payments.
						</DialogDescription>
					</DialogHeader>
					<AddPaymentMethod
						onSuccess={() => {
							refetch()
							setShowAddPaymentDialog(false)
						}}
					/>
				</DialogContent>
			</Dialog>

			{/* Stripe Connect Dialog */}
			<Dialog
				open={showStripeConnectDialog}
				onOpenChange={setShowStripeConnectDialog}
			>
				<DialogContent className="max-w-3xl">
					<DialogHeader>
						<DialogTitle>Connect Your Bank Account</DialogTitle>
						<DialogDescription>
							Set up direct bank transfers with Stripe Connect.
						</DialogDescription>
					</DialogHeader>
					<StripeConnectTab />
				</DialogContent>
			</Dialog>
		</div>
	)
}
