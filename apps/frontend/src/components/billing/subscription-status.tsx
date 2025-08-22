'use client'

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
	Building,
	Calendar,
	CreditCard,
	CheckCircle2,
	AlertTriangle,
	AlertCircle,
	XCircle,
	Clock
} from 'lucide-react'
import Link from 'next/link'
import {
	useSubscription,
	useCanAccessPremiumFeatures
} from '@/hooks/useSubscription'
import { CustomerPortalButton } from './customer-portal-button'

/**
 * Subscription Status Component
 * Simple display of current subscription with portal access
 */
export function SubscriptionStatus() {
	const { data: subscription, isLoading } = useSubscription()
	const premiumAccess = useCanAccessPremiumFeatures()

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<Skeleton className="h-6 w-32" />
					<Skeleton className="mt-2 h-4 w-48" />
				</CardHeader>
				<CardContent>
					<Skeleton className="h-20 w-full" />
				</CardContent>
			</Card>
		)
	}

	if (!subscription) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>No Active Subscription</CardTitle>
					<CardDescription>
						Start with our free plan or upgrade for more features
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Button asChild>
						<Link href="/pricing">View Plans</Link>
					</Button>
				</CardContent>
			</Card>
		)
	}

	// Enhanced status configuration with icons and colors
	const statusConfig = {
		ACTIVE: {
			variant: 'default' as const,
			icon: CheckCircle2,
			bgClass: 'bg-green-50 border-green-200 dark:bg-green-950/20',
			textClass: 'text-green-700 dark:text-green-400',
			label: 'Active'
		},
		TRIALING: {
			variant: 'secondary' as const,
			icon: Clock,
			bgClass: 'bg-blue-50 border-blue-200 dark:bg-blue-950/20',
			textClass: 'text-blue-700 dark:text-blue-400',
			label: 'Trial'
		},
		PAST_DUE: {
			variant: 'destructive' as const,
			icon: AlertCircle,
			bgClass: 'bg-red-50 border-red-200 dark:bg-red-950/20',
			textClass: 'text-red-700 dark:text-red-400',
			label: 'Past Due'
		},
		CANCELED: {
			variant: 'secondary' as const,
			icon: XCircle,
			bgClass: 'bg-gray-50 border-gray-200 dark:bg-gray-950/20',
			textClass: 'text-gray-700 dark:text-gray-400',
			label: 'Cancelled'
		},
		UNPAID: {
			variant: 'destructive' as const,
			icon: AlertTriangle,
			bgClass: 'bg-amber-50 border-amber-200 dark:bg-amber-950/20',
			textClass: 'text-amber-700 dark:text-amber-400',
			label: 'Unpaid'
		}
	} as const

	const config =
		statusConfig[subscription?.subscription?.status as keyof typeof statusConfig] ||
		statusConfig.ACTIVE
	const StatusIcon = config.icon

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle>
								{subscription?.planType || 'Unknown'} Plan
							</CardTitle>
							<CardDescription>
								Active subscription
							</CardDescription>
						</div>
						<Badge
							variant={config.variant}
							className="flex items-center gap-1"
						>
							<StatusIcon className="h-3 w-3" />
							{config.label}
						</Badge>
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid gap-4 md:grid-cols-3">
						<div className="flex items-center space-x-2">
							<Building className="text-muted-foreground h-4 w-4" />
							<div className="text-sm">
								<p className="font-medium">Properties</p>
								<p className="text-muted-foreground">
									{premiumAccess ? 'Unlimited' : 'Limited'}
								</p>
							</div>
						</div>

						<div className="flex items-center space-x-2">
							<Calendar className="text-muted-foreground h-4 w-4" />
							<div className="text-sm">
								<p className="font-medium">Current Period</p>
								<p className="text-muted-foreground">
									{subscription?.subscriptionEndsAt
										? `Ends ${subscription.subscriptionEndsAt.toLocaleDateString()}`
										: 'No end date'}
								</p>
							</div>
						</div>

						<div className="flex items-center space-x-2">
							<CreditCard className="text-muted-foreground h-4 w-4" />
							<div className="text-sm">
								<p className="font-medium">Billing</p>
								<p className="text-muted-foreground">
									{subscription?.isCanceled
										? 'Cancels at period end'
										: 'Auto-renews'}
								</p>
							</div>
						</div>
					</div>

					{/* Status-specific alerts */}
					{subscription?.isPastDue && (
						<div className={`rounded-lg p-3 ${config.bgClass}`}>
							<div className="flex items-start gap-2">
								<StatusIcon className="mt-0.5 h-4 w-4 shrink-0" />
								<div>
									<p
										className={`text-sm font-medium ${config.textClass}`}
									>
										Payment Required
									</p>
									<p className="text-muted-foreground mt-1 text-xs">
										Please update your payment method to
										continue service.
									</p>
								</div>
							</div>
						</div>
					)}

					{subscription?.isCanceled && (
						<div className={`rounded-lg p-3 ${config.bgClass}`}>
							<div className="flex items-start gap-2">
								<StatusIcon className="mt-0.5 h-4 w-4 shrink-0" />
								<div>
									<p
										className={`text-sm font-medium ${config.textClass}`}
									>
										Subscription Cancelled
									</p>
									<p className="text-muted-foreground mt-1 text-xs">
										Access continues until{' '}
										{subscription.subscriptionEndsAt
											? subscription.subscriptionEndsAt.toLocaleDateString()
											: 'end of period'}
									</p>
								</div>
							</div>
						</div>
					)}

					{subscription?.isTrialing && (
						<div className={`rounded-lg p-3 ${config.bgClass}`}>
							<div className="flex items-start gap-2">
								<StatusIcon className="mt-0.5 h-4 w-4 shrink-0" />
								<div>
									<p
										className={`text-sm font-medium ${config.textClass}`}
									>
										Free Trial Active
									</p>
									<p className="text-muted-foreground mt-1 text-xs">
										Trial ends{' '}
										{subscription.trialEndsAt
											? subscription.trialEndsAt.toLocaleDateString()
											: 'soon'}
									</p>
								</div>
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			<CustomerPortalButton variant="outline" className="w-full" />
		</div>
	)
}
