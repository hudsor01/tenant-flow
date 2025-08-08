import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import { CreditCard } from 'lucide-react'
import { StyledCheckoutForm } from '../stripe/styled-checkout-form'

interface CheckoutModalProps {
	isOpen: boolean
	onOpenChange: (open: boolean) => void
	clientSecret: string | null
	onSuccess: () => void
	onError: (error: string) => void
	title?: string
	description?: string
	returnUrl?: string
}

export function CheckoutModal({
	isOpen,
	onOpenChange,
	clientSecret,
	onSuccess,
	onError,
	title = 'Complete Your Subscription',
	description = 'Secure payment powered by Stripe',
	returnUrl = `${window.location.origin}/dashboard?subscription=success`
}: CheckoutModalProps) {
	if (!clientSecret) {
		return null
	}

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="border-0 bg-card shadow-2xl sm:max-w-[600px] overflow-hidden">
				<div className="absolute inset-0 bg-gradient-steel-subtle opacity-30" />
				<div className="relative">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-3 text-2xl font-bold text-gradient-steel">
							<div className="p-2 bg-primary/10 rounded-lg">
								<CreditCard className="h-6 w-6 text-primary" />
							</div>
							{title}
						</DialogTitle>
						<DialogDescription className="text-muted-foreground text-base">
							{description}
						</DialogDescription>
					</DialogHeader>
					
					<div className="mt-6">
						<StyledCheckoutForm
							clientSecret={clientSecret}
							onSuccess={onSuccess}
							onError={onError}
							returnUrl={returnUrl}
						/>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}