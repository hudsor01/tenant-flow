import { useState } from 'react'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle } from 'lucide-react'
import type { PlanType } from '@repo/shared'
import { toast } from 'sonner'

interface SubscriptionModalProps {
	isOpen: boolean
	onOpenChange: (open: boolean) => void
	planId: PlanType
	billingPeriod: 'MONTHLY' | 'ANNUAL'
	stripePriceId: string | undefined
}

export default function SubscriptionModal({
	isOpen,
	onOpenChange,
	planId,
	billingPeriod,
	stripePriceId: _stripePriceId
}: SubscriptionModalProps) {
	const [isLoading, setIsLoading] = useState(false)

	const handleSubscribe = async () => {
		setIsLoading(true)
		try {
			// TODO: Implement subscription logic
			toast.success('Subscription feature coming soon!')
			onOpenChange(false)
		} catch {
			toast.error('Failed to start subscription')
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-3 text-2xl">
						<CheckCircle className="h-6 w-6 text-blue-600" />
						Subscribe to {planId}
					</DialogTitle>
					<DialogDescription>
						Start your subscription with TenantFlow
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-6 mt-6">
					<div className="rounded-xl bg-blue-50 p-5 border">
						<div className="mb-3 flex items-center justify-between">
							<h3 className="font-bold text-gray-900 text-lg">
								{planId}
							</h3>
							<Badge variant="default">
								{billingPeriod === 'MONTHLY' ? 'Monthly' : 'Annual'}
							</Badge>
						</div>
						<p className="text-gray-600">
							Subscription management features are coming soon.
						</p>
					</div>

					<Button
						onClick={handleSubscribe}
						disabled={isLoading}
						className="w-full"
						size="lg"
					>
						{isLoading ? 'Processing...' : 'Subscribe (Coming Soon)'}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	)
}