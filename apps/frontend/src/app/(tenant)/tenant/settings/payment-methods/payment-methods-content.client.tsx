'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, CreditCard, Plus } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { createLogger } from '@repo/shared/lib/frontend-logger'

import { Button } from '#components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger
} from '#components/ui/collapsible'
import { PaymentMethodSetupForm } from '#app/(tenant)/tenant/payments/methods/payment-method-setup-form'
import { PaymentMethodsList } from '#components/billing/payment-methods-list'
import {
	paymentMethodsKeys,
	usePaymentMethods
} from '#hooks/api/use-payment-methods'

const logger = createLogger({ component: 'PaymentMethodsContent' })

export function PaymentMethodsContent() {
	const [isAddOpen, setIsAddOpen] = useState(false)
	const queryClient = useQueryClient()
	const { data: paymentMethods } = usePaymentMethods()

	const handleAddSuccess = () => {
		queryClient.invalidateQueries({ queryKey: paymentMethodsKeys.list() })
		setIsAddOpen(false)
	}

	const hasPaymentMethods =
		Array.isArray(paymentMethods) && paymentMethods.length > 0

	return (
		<div className="container mx-auto py-8 space-y-6">
			<div className="mb-8">
				<h1 className="typography-h1">Payment Methods</h1>
				<p className="text-muted-foreground mt-2">
					Manage your payment methods for rent and fees
				</p>
			</div>

			{/* Payment Methods List */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle>Saved Payment Methods</CardTitle>
							<CardDescription>
								Manage your cards and bank accounts for rent payments
							</CardDescription>
						</div>
						{hasPaymentMethods && (
							<Button
								variant="outline"
								size="sm"
								onClick={() => setIsAddOpen(!isAddOpen)}
							>
								<Plus className="mr-2 size-4" />
								Add Payment Method
							</Button>
						)}
					</div>
				</CardHeader>
				<CardContent>
					<PaymentMethodsList onAddClick={() => setIsAddOpen(true)} />
				</CardContent>
			</Card>

			{/* Add Payment Method Section */}
			<Collapsible open={isAddOpen} onOpenChange={setIsAddOpen}>
				<Card>
					<CardHeader className="pb-0">
						<CollapsibleTrigger asChild>
							<button className="flex w-full items-center justify-between text-left">
								<div>
									<CardTitle className="flex items-center gap-2">
										<CreditCard className="size-5 text-primary" />
										Add Payment Method
									</CardTitle>
									<CardDescription>
										Add a new card or bank account for payments
									</CardDescription>
								</div>
								<div className="flex size-8 items-center justify-center rounded-md hover:bg-muted">
									{isAddOpen ? (
										<ChevronUp className="size-4 text-muted-foreground" />
									) : (
										<ChevronDown className="size-4 text-muted-foreground" />
									)}
								</div>
							</button>
						</CollapsibleTrigger>
					</CardHeader>
					<CollapsibleContent>
						<CardContent className="pt-6">
							<PaymentMethodSetupForm
								onSuccess={handleAddSuccess}
								onError={error => {
									logger.error('Payment method setup failed', { error })
								}}
							/>
							<div className="mt-6 rounded-lg border border-muted-foreground/20 bg-muted/50 p-4 text-sm text-muted-foreground">
								Powered by Stripe — your payment details are encrypted and never
								stored on TenantFlow servers.
							</div>
						</CardContent>
					</CollapsibleContent>
				</Card>
			</Collapsible>
		</div>
	)
}
