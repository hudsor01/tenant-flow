import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import type { PLAN_TYPE } from '@repo/shared'
import { SubscriptionCheckoutWrapper } from './SubscriptionCheckoutWrapper'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface CheckoutButtonProps {
	planType: keyof typeof PLAN_TYPE
	billingInterval: 'monthly' | 'annual'
	className?: string
	children?: React.ReactNode
	onSuccess?: (subscriptionId: string) => void
}

export function CheckoutButton({ 
	planType, 
	billingInterval, 
	className,
	children = 'Subscribe',
	onSuccess
}: CheckoutButtonProps) {
	const [showModal, setShowModal] = useState(false)
	const [isLoading, setIsLoading] = useState(false)

	const handleSuccess = (subscriptionId: string) => {
		setShowModal(false)
		setIsLoading(false)
		onSuccess?.(subscriptionId)
	}

	const handleCancel = () => {
		setShowModal(false)
		setIsLoading(false)
	}

	const openCheckout = () => {
		setIsLoading(true)
		setShowModal(true)
	}

	return (
		<>
			<Button
				onClick={openCheckout}
				disabled={isLoading}
				className={className}
			>
				{isLoading ? (
					<>
						<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						Loading...
					</>
				) : (
					children
				)}
			</Button>

			{/* Integrated Subscription Checkout Modal */}
			<Dialog open={showModal} onOpenChange={setShowModal}>
				<DialogContent className="max-w-lg">
					<DialogHeader>
						<DialogTitle>Complete Your Subscription</DialogTitle>
						<DialogDescription>
							Enter your payment details to activate your subscription.
						</DialogDescription>
					</DialogHeader>
					
					<SubscriptionCheckoutWrapper
						planType={planType}
						billingInterval={billingInterval}
						onSuccess={handleSuccess}
						onCancel={handleCancel}
					/>
				</DialogContent>
			</Dialog>
		</>
	)
}
