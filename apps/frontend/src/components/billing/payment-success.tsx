'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface SubscriptionDetails {
	planName: string
	billingInterval: 'monthly' | 'annual'
	amount: number
	currency: string
	nextBillingDate: string
	features: string[]
}

interface PaymentSuccessProps {
	subscriptionData?: SubscriptionDetails | null
	sessionId?: string | null
	isLoading?: boolean
	error?: string | null
}

/**
 * Client Component - PaymentSuccess
 * Handles success state, animations, and user interactions
 */
export function PaymentSuccess({
	subscriptionData,
	sessionId,
	isLoading = false,
	error
}: PaymentSuccessProps) {
	// unused variable for function signature compatibility
	void sessionId
	const [showConfetti, setShowConfetti] = useState(false)

	useEffect(() => {
		if (subscriptionData && !isLoading) {
			// Show success message and trigger confetti animation
			toast.success('🎉 Subscription activated successfully!')
			setShowConfetti(true)

			// Hide confetti after animation
			const timer = setTimeout(() => setShowConfetti(false), 3000)
			return () => clearTimeout(timer)
		}
		return undefined
	}, [subscriptionData, isLoading])

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-16">
				<div className="text-center">
					<i className="i-lucide-loader-2 inline-block text-primary mx-auto mb-4 h-12 w-12 animate-spin"  />
					<p className="text-muted-foreground text-lg">
						Activating your subscription...
					</p>
				</div>
			</div>
		)
	}

	return (
		<div className="space-y-8">
			{/* Success Header with Animation */}
			<div className="relative text-center">
				<div
					className={`transition-all duration-1000 ${showConfetti ? 'animate-bounce' : ''}`}
				>
					<i className="i-lucide-checkcircle2 inline-block mx-auto mb-4 h-16 w-16 text-green-500"  />
				</div>
				<h1 className="from-primary to-primary/70 mb-2 bg-gradient-to-r bg-clip-text text-4xl font-bold text-transparent">
					Welcome to TenantFlow!
				</h1>
				<p className="text-muted-foreground text-xl">
					Your subscription is now active and ready to use.
				</p>
			</div>

			{/* Subscription Details Card */}
			{subscriptionData && (
				<Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
					<CardHeader>
						<div className="flex items-center justify-between">
							<CardTitle className="text-green-700 dark:text-green-400">
								Your Subscription
							</CardTitle>
							<Badge
								variant="default"
								className="bg-green-100 text-green-700 hover:bg-green-200"
							>
								Active
							</Badge>
						</div>
						<CardDescription className="text-green-600 dark:text-green-300">
							{subscriptionData.planName} Plan - Billed{' '}
							{subscriptionData.billingInterval === 'annual'
								? 'Annually'
								: 'Monthly'}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<div className="rounded-lg border bg-white p-3 dark:bg-gray-800">
								<div className="text-muted-foreground text-sm">
									Amount
								</div>
								<div className="text-lg font-semibold">
									$
									{(subscriptionData.amount / 100).toFixed(2)}{' '}
									{subscriptionData.currency.toUpperCase()}
								</div>
								<div className="text-muted-foreground text-xs">
									per{' '}
									{subscriptionData.billingInterval ===
									'annual'
										? 'year'
										: 'month'}
								</div>
							</div>

							<div className="rounded-lg border bg-white p-3 dark:bg-gray-800">
								<div className="text-muted-foreground text-sm">
									Next billing
								</div>
								<div className="text-lg font-semibold">
									{new Date(
										subscriptionData.nextBillingDate
									).toLocaleDateString()}
								</div>
							</div>
						</div>

						{subscriptionData.features &&
							subscriptionData.features.length > 0 && (
								<div className="mt-4">
									<p className="mb-3 text-sm font-medium">
										Included features:
									</p>
									<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
										{subscriptionData.features.map(
											(feature, index) => (
												<div
													key={index}
													className="flex items-center gap-2 text-sm"
												>
													<i className="i-lucide-checkcircle2 inline-block h-4 w-4 shrink-0 text-green-500"  />
													<span>{feature}</span>
												</div>
											)
										)}
									</div>
								</div>
							)}
					</CardContent>
				</Card>
			)}

			{/* Quick Actions */}
			<QuickActions />

			{/* Error Display */}
			{error && <ErrorDisplay error={error} />}
		</div>
	)
}

/**
 * Quick Actions Component - Next Steps
 */
function QuickActions() {
	const router = useRouter()

	const actions = [
		{
			icon: Home,
			title: 'Add your first property',
			description: 'Start by adding property details and units',
			action: () => router.push('/properties?action=add'),
			primary: true
		},
		{
			icon: Users,
			title: 'Invite tenants',
			description: 'Send invitations to your tenants to join the portal',
			action: () => router.push('/tenants?action=invite')
		},
		{
			icon: FileText,
			title: 'Create a lease',
			description: 'Set up lease agreements and track important dates',
			action: () => router.push('/leases?action=create')
		}
	]

	return (
		<Card>
			<CardHeader>
				<CardTitle>Get Started with TenantFlow</CardTitle>
				<CardDescription>
					Here are some recommended next steps to get the most out of
					your subscription
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3">
				{actions.map((action, index) => (
					<button
						key={index}
						onClick={action.action}
						className={`group flex w-full items-center justify-between rounded-lg border p-4 text-left transition-all duration-200 ${
							action.primary
								? 'border-primary bg-primary/5 hover:bg-primary/10 ring-primary/20 ring-1'
								: 'hover:bg-muted/50 hover:border-primary/30'
						}`}
					>
						<div className="flex items-center gap-3">
							<div
								className={`rounded-md p-2 ${
									action.primary
										? 'bg-primary/10'
										: 'bg-muted'
								}`}
							>
								<action.icon
									className={`h-5 w-5 ${
										action.primary
											? 'text-primary'
											: 'text-muted-foreground'
									}`}
								/>
							</div>
							<div>
								<p className="group-hover:text-primary font-medium transition-colors">
									{action.title}
								</p>
								<p className="text-muted-foreground text-sm">
									{action.description}
								</p>
							</div>
						</div>
						<i className="i-lucide-arrow-right inline-block text-muted-foreground group-hover:text-primary h-5 w-5 transition-all group-hover:translate-x-1"  />
					</button>
				))}

				{/* Primary Actions */}
				<div className="flex gap-3 pt-4">
					<Button
						onClick={() => router.push('/dashboard')}
						className="flex-1"
						size="lg"
					>
						Go to Dashboard
					</Button>
					<Button
						onClick={() => router.push('/settings/billing')}
						variant="outline"
						className="flex-1"
						size="lg"
					>
						Manage Billing
					</Button>
				</div>
			</CardContent>
		</Card>
	)
}

/**
 * Error Display Component
 */
function ErrorDisplay({ error }: { error: string }) {
	const router = useRouter()

	return (
		<Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
			<CardHeader>
				<CardTitle className="text-orange-600 dark:text-orange-400">
					Subscription Verification Issue
				</CardTitle>
			</CardHeader>
			<CardContent>
				<p className="text-muted-foreground mb-4 text-sm">{error}</p>
				<p className="text-muted-foreground mb-4 text-sm">
					Don't worry - your payment was processed successfully.
					Please contact our support team if you need assistance.
				</p>
				<div className="flex gap-3">
					<Button
						onClick={() => router.push('/support')}
						variant="outline"
					>
						Contact Support
					</Button>
					<Button
						onClick={() => window.location.reload()}
						variant="outline"
					>
						Retry Verification
					</Button>
				</div>
			</CardContent>
		</Card>
	)
}
