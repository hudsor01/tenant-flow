import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
	Loader2,
	ExternalLink,
	CreditCard,
	Calendar,
	DollarSign,
	Settings
} from 'lucide-react'
import { useCreatePortalSession } from '@/hooks/useSubscription'
import { formatDistanceToNow } from 'date-fns'

interface CustomerPortalProps {
	customerId?: string
	subscription?: {
		id: string
		status:
			| 'active'
			| 'trialing'
			| 'past_due'
			| 'canceled'
			| 'incomplete'
			| 'incomplete_expired'
			| 'unpaid'
		plan: string
		currentPeriodEnd: string
		cancelAtPeriodEnd: boolean
		amount: number
		interval: 'month' | 'year'
		trialEnd?: string | null
	}
}

export default function CustomerPortal({
	customerId,
	subscription
}: CustomerPortalProps) {
	const createPortalSession = useCreatePortalSession()

	const handlePortalAccess = () => {
		if (!customerId) {
			// This will be handled by the mutation's error handler
			return
		}

		// Use React Query mutation to create portal session
		createPortalSession.mutate({
			customerId,
			returnUrl: window.location.href // Return to current page after portal session
		})
	}

	const getStatusBadge = (status: string) => {
		switch (status) {
			case 'active':
				return (
					<Badge
						variant="default"
						className="bg-success text-success-foreground"
					>
						Active
					</Badge>
				)
			case 'trialing':
				return <Badge variant="secondary">Free Trial</Badge>
			case 'canceled':
				return <Badge variant="destructive">Canceled</Badge>
			case 'past_due':
				return <Badge variant="destructive">Past Due</Badge>
			case 'incomplete':
			case 'incomplete_expired':
				return <Badge variant="outline">Incomplete</Badge>
			case 'unpaid':
				return <Badge variant="destructive">Unpaid</Badge>
			default:
				return <Badge variant="outline">{status}</Badge>
		}
	}

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		})
	}

	const formatAmount = (amount: number, interval: string) => {
		const price = (amount / 100).toFixed(2)
		return `$${price}/${interval}`
	}

	return (
		<div className="space-y-6">
			{subscription && (
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<CardTitle className="flex items-center gap-2">
								<CreditCard className="h-5 w-5" />
								Current Subscription
							</CardTitle>
							{getStatusBadge(subscription.status)}
						</div>
						<CardDescription>
							Manage your TenantFlow subscription and billing
							information
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
							<div className="flex items-center gap-3">
								<div className="bg-primary/10 rounded-lg p-2">
									<DollarSign className="text-primary h-4 w-4" />
								</div>
								<div>
									<p className="text-sm font-medium">
										{subscription.plan} Plan
									</p>
									<p className="text-muted-foreground text-sm">
										{formatAmount(
											subscription.amount,
											subscription.interval
										)}
									</p>
								</div>
							</div>

							<div className="flex items-center gap-3">
								<div className="bg-primary/10 rounded-lg p-2">
									<Calendar className="text-primary h-4 w-4" />
								</div>
								<div>
									<p className="text-sm font-medium">
										{subscription.cancelAtPeriodEnd
											? 'Cancels on'
											: 'Renews on'}
									</p>
									<p className="text-muted-foreground text-sm">
										{formatDate(
											subscription.currentPeriodEnd
										)}
									</p>
								</div>
							</div>

							<div className="flex items-center gap-3">
								<div className="bg-primary/10 rounded-lg p-2">
									<CreditCard className="text-primary h-4 w-4" />
								</div>
								<div>
									<p className="text-sm font-medium">
										Billing Status
									</p>
									<p className="text-muted-foreground text-sm">
										{subscription.status === 'active'
											? 'Up to date'
											: subscription.status === 'trialing'
												? 'Free trial'
												: 'Needs attention'}
									</p>
								</div>
							</div>
						</div>

						{subscription.trialEnd &&
							subscription.status === 'trialing' && (
								<Alert>
									<AlertDescription>
										Your free trial ends{' '}
										{formatDistanceToNow(
											new Date(subscription.trialEnd),
											{ addSuffix: true }
										)}
										. Add a payment method to continue after
										your trial.
									</AlertDescription>
								</Alert>
							)}

						{subscription.cancelAtPeriodEnd && (
							<Alert>
								<AlertDescription>
									Your subscription will be canceled on{' '}
									{formatDate(subscription.currentPeriodEnd)}.
									You can reactivate it anytime before then.
								</AlertDescription>
							</Alert>
						)}

						{subscription.status === 'past_due' && (
							<Alert variant="destructive">
								<AlertDescription>
									Your payment is past due. Please update your
									payment method to continue using TenantFlow.
								</AlertDescription>
							</Alert>
						)}
					</CardContent>
				</Card>
			)}

			<Card>
				<CardHeader>
					<CardTitle>Billing Management</CardTitle>
					<CardDescription>
						Access your Stripe Customer Portal to manage billing
						details, view invoices, and update payment methods.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<div className="text-muted-foreground text-sm">
							In the Customer Portal, you can:
						</div>
						<ul className="ml-4 space-y-1 text-sm">
							<li>
								• Update payment methods and billing information
							</li>
							<li>• Download invoices and receipts</li>
							<li>• View complete billing history</li>
							<li>
								• Update billing address and tax information
							</li>
							<li>• Change or cancel your subscription</li>
							<li>• Apply promotion codes</li>
						</ul>

						{createPortalSession.error && (
							<Alert variant="destructive">
								<AlertDescription>
									{createPortalSession.error instanceof Error
										? createPortalSession.error.message
										: 'Failed to open customer portal'}
								</AlertDescription>
							</Alert>
						)}

						<Button
							onClick={handlePortalAccess}
							disabled={
								createPortalSession.isPending || !customerId
							}
							className="w-full md:w-auto"
							size="lg"
						>
							{createPortalSession.isPending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Opening Portal...
								</>
							) : (
								<>
									<Settings className="mr-2 h-4 w-4" />
									Open Customer Portal
									<ExternalLink className="ml-2 h-4 w-4" />
								</>
							)}
						</Button>

						{!customerId && (
							<Alert>
								<AlertDescription>
									No billing information found. You may need
									to complete your subscription setup first.
								</AlertDescription>
							</Alert>
						)}

						<div className="text-muted-foreground bg-muted/50 rounded-lg p-3 text-xs">
							<p className="mb-1 font-medium">🔒 Secure Portal</p>
							<p>
								You'll be redirected to Stripe's secure customer
								portal where you can safely manage your billing
								information. You'll return to TenantFlow when
								finished.
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
