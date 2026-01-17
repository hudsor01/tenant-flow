'use client'

import { useState } from 'react'
import { Settings, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '#components/ui/button'
import { PlanCard, type Plan } from '#components/billing/plan-card'
import { UpgradeDialog } from '#components/billing/upgrade-dialog'
import {
	createCheckoutSession,
	createCustomerPortalSession
} from '#lib/stripe/stripe-client'
import { cn } from '#lib/utils'

// Static plans definition - these would typically come from an API or configuration
const PLANS: Plan[] = [
	{
		id: 'free',
		name: 'Free',
		description: 'Perfect for getting started',
		price: 0,
		priceId: null,
		tier: 0,
		features: [
			{ name: 'Up to 1 property', included: true },
			{ name: 'Basic tenant management', included: true },
			{ name: 'Email support', included: true },
			{ name: 'Rent collection', included: false },
			{ name: 'Financial reports', included: false },
			{ name: 'Maintenance tracking', included: false }
		]
	},
	{
		id: 'starter',
		name: 'Starter',
		description: 'For small landlords',
		price: 29,
		priceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID ?? null,
		tier: 1,
		features: [
			{ name: 'Up to 5 properties', included: true },
			{ name: 'Full tenant management', included: true },
			{ name: 'Priority email support', included: true },
			{ name: 'Rent collection', included: true },
			{ name: 'Basic financial reports', included: true },
			{ name: 'Maintenance tracking', included: false }
		]
	},
	{
		id: 'professional',
		name: 'Professional',
		description: 'For growing portfolios',
		price: 79,
		priceId: process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID ?? null,
		tier: 2,
		features: [
			{ name: 'Up to 25 properties', included: true },
			{ name: 'Advanced tenant management', included: true },
			{ name: 'Phone & email support', included: true },
			{ name: 'Automated rent collection', included: true },
			{ name: 'Advanced financial reports', included: true },
			{ name: 'Full maintenance tracking', included: true }
		]
	},
	{
		id: 'enterprise',
		name: 'Enterprise',
		description: 'For large operations',
		price: 199,
		priceId: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID ?? null,
		tier: 3,
		features: [
			{ name: 'Unlimited properties', included: true },
			{ name: 'Enterprise tenant management', included: true },
			{ name: 'Dedicated account manager', included: true },
			{ name: 'Advanced rent collection', included: true },
			{ name: 'Custom financial reports', included: true },
			{ name: 'Priority maintenance tracking', included: true }
		]
	}
]

// Simulated current subscription - in production, this would come from an API/context
const CURRENT_PLAN_ID: string | null = null // null means no subscription

export default function BillingPlansPage() {
	const [isLoading, setIsLoading] = useState(false)
	const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null)
	const [dialogOpen, setDialogOpen] = useState(false)
	const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)

	const currentPlan = PLANS.find(p => p.id === CURRENT_PLAN_ID) ?? null
	const hasSubscription = currentPlan !== null

	const handlePlanSelect = (plan: Plan) => {
		// Open confirmation dialog
		setSelectedPlan(plan)
		setDialogOpen(true)
	}

	const handleConfirmPlanChange = async (plan: Plan) => {
		setLoadingPlanId(plan.id)
		setIsLoading(true)

		try {
			if (hasSubscription) {
				// Existing subscriber - redirect to Customer Portal for plan changes
				const returnUrl = `${window.location.origin}/billing/plans`
				const { url } = await createCustomerPortalSession(returnUrl)
				window.location.href = url
			} else {
				// New subscriber - create checkout session
				if (!plan.priceId) {
					toast.error('This plan is not available for purchase')
					setDialogOpen(false)
					return
				}

				toast.loading('Creating checkout session...', { id: 'checkout' })

				const { url } = await createCheckoutSession({
					priceId: plan.priceId,
					planName: plan.name,
					description: plan.description
				})

				toast.dismiss('checkout')

				if (url) {
					window.location.href = url
				} else {
					throw new Error('No checkout URL returned')
				}
			}
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'An error occurred'
			toast.error(message)
			setDialogOpen(false)
		} finally {
			setIsLoading(false)
			setLoadingPlanId(null)
		}
	}

	const handleManageSubscription = async () => {
		setIsLoading(true)

		try {
			const returnUrl = `${window.location.origin}/billing/plans`
			const { url } = await createCustomerPortalSession(returnUrl)
			window.location.href = url
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Failed to open billing portal'
			toast.error(message)
		} finally {
			setIsLoading(false)
		}
	}

	const handleDialogClose = () => {
		if (!isLoading) {
			setDialogOpen(false)
			setSelectedPlan(null)
		}
	}

	return (
		<div className="container max-w-7xl py-8">
			{/* Header */}
			<div className="mb-8">
				<Link
					href="/dashboard"
					className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 min-h-11"
				>
					<ArrowLeft className="size-4" />
					Back to Dashboard
				</Link>

				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
					<div>
						<h1 className="text-2xl font-bold text-foreground">
							Subscription Plans
						</h1>
						<p className="text-muted-foreground mt-1">
							{hasSubscription
								? `You are currently on the ${currentPlan?.name} plan`
								: 'Choose a plan that fits your needs'}
						</p>
					</div>

					{hasSubscription && (
						<Button
							variant="outline"
							size="lg"
							className="min-h-11"
							onClick={handleManageSubscription}
							disabled={isLoading}
						>
							<Settings className="mr-2 size-4" />
							Manage Subscription
						</Button>
					)}
				</div>
			</div>

			{/* Current Plan Info */}
			{hasSubscription && currentPlan && (
				<div className="mb-8 p-4 rounded-lg border border-primary/20 bg-primary/5">
					<div className="flex items-center gap-3">
						<div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
							<Settings className="size-5 text-primary" />
						</div>
						<div>
							<p className="font-medium text-foreground">
								Current Plan: {currentPlan.name}
							</p>
							<p className="text-sm text-muted-foreground">
								{currentPlan.price === 0
									? 'Free'
									: `$${currentPlan.price}/month`}
							</p>
						</div>
					</div>
				</div>
			)}

			{/* Plan Cards Grid */}
			<div
				className={cn(
					'grid gap-6',
					'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
				)}
			>
				{PLANS.map(plan => (
					<PlanCard
						key={plan.id}
						plan={plan}
						isCurrentPlan={plan.id === CURRENT_PLAN_ID}
						isMostPopular={plan.id === 'professional'}
						currentTier={currentPlan?.tier ?? null}
						onSelect={handlePlanSelect}
						isLoading={loadingPlanId === plan.id}
					/>
				))}
			</div>

			{/* Help Text */}
			<div className="mt-12 text-center">
				<p className="text-sm text-muted-foreground">
					Need help choosing a plan?{' '}
					<Link
						href="/contact"
						className="text-primary hover:underline underline-offset-4"
					>
						Contact our sales team
					</Link>
				</p>
				<p className="text-xs text-muted-foreground mt-2">
					All plans include a 14-day free trial. Cancel anytime.
				</p>
			</div>

			{/* Upgrade/Downgrade Confirmation Dialog */}
			<UpgradeDialog
				targetPlan={selectedPlan}
				currentPlan={currentPlan}
				isOpen={dialogOpen}
				onClose={handleDialogClose}
				onConfirm={handleConfirmPlanChange}
			/>
		</div>
	)
}
