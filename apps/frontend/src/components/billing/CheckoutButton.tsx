import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { PLAN_TYPE } from '@tenantflow/shared/types'
import { useCheckout } from '@/hooks/useCheckout'
import { CheckoutModal } from '@/components/stripe/CheckoutModal'

interface CheckoutButtonProps {
	planType: keyof typeof PLAN_TYPE
	billingInterval: 'monthly' | 'annual'
	className?: string
	children?: React.ReactNode
	mode?: 'embedded' | 'hosted'
}

export function CheckoutButton({ 
	planType, 
	billingInterval, 
	className,
	children = 'Subscribe',
	mode = 'embedded'
}: CheckoutButtonProps) {
	const { createCheckout, isLoading } = useCheckout()
	const [showModal, setShowModal] = useState(false)
	const [clientSecret, setClientSecret] = useState<string | null>(null)

	const handleCheckout = async () => {
		if (mode === 'hosted') {
			// Use hosted checkout (redirect)
			await createCheckout({
				planType,
				billingInterval,
				uiMode: 'hosted'
			})
		} else {
			// Use embedded checkout (modal)
			try {
				const result = await createCheckout({
					planType,
					billingInterval,
					uiMode: 'embedded'
				})
				
				if (result?.clientSecret) {
					setClientSecret(result.clientSecret)
					setShowModal(true)
				}
			} catch (error) {
				console.error('Failed to create embedded checkout:', error)
			}
		}
	}

	const handlePaymentSuccess = () => {
		setShowModal(false)
		setClientSecret(null)
		// Redirect to dashboard or show success message
		window.location.href = '/dashboard?subscription=success'
	}

	const handlePaymentError = (error: string) => {
		console.error('Payment error:', error)
		setShowModal(false)
		setClientSecret(null)
	}

	return (
		<>
			<Button
				onClick={handleCheckout}
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

			{/* Embedded Checkout Modal */}
			<CheckoutModal
				isOpen={showModal}
				onOpenChange={setShowModal}
				clientSecret={clientSecret}
				onSuccess={handlePaymentSuccess}
				onError={handlePaymentError}
			/>
		</>
	)
}