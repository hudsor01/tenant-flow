import { Button } from '@/components/ui/button'
import { useCreateCheckoutSession } from '@/hooks/api/use-billing'
import type { PlanType } from '@repo/shared'

interface HostedCheckoutButtonProps {
	planType: PlanType
	billingInterval: 'monthly' | 'annual'
	className?: string
	children?: React.ReactNode
	successUrl?: string
	cancelUrl?: string
	couponId?: string
}

/**
 * Checkout button that redirects to Stripe's hosted checkout page
 * This is the simplest and most secure way to handle payments
 */
export function HostedCheckoutButton({
	planType,
	billingInterval,
	className,
	children = 'Subscribe',
	successUrl: _successUrl,
	cancelUrl: _cancelUrl,
	couponId: _couponId
}: HostedCheckoutButtonProps) {
	const _createCheckoutMutation = useCreateCheckoutSession()

	const handleClick = async () => {
		_createCheckoutMutation.mutate({
			planId: planType,
			interval: billingInterval === 'annual' ? 'annual' : 'monthly',
			successUrl:
				_successUrl || `${window.location.origin}/billing/success`,
			cancelUrl: _cancelUrl || `${window.location.origin}/pricing`
		})
	}

	return (
		<Button
			onClick={() => void handleClick()}
			disabled={_createCheckoutMutation.isPending}
			className={className}
		>
			{_createCheckoutMutation.isPending ? (
				<>
					<i className="i-lucide-loader-2 inline-block mr-2 h-4 w-4 animate-spin"  />
					Loading checkout...
				</>
			) : (
				children
			)}
		</Button>
	)
}
