'use client'

import { useState } from 'react'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { useCreateCheckoutSession, useUpdateSubscription } from '../../hooks/api/use-billing'
import { LoadingSpinner } from '../ui/loading-spinner'
import type { PlanType } from '@repo/shared'

interface SubscriptionUpgradeModalProps {
	isOpen: boolean
	onClose: () => void
	currentPlan: PlanType
	userId: string
	onUpgradeSuccess?: () => void
}

interface PlanOption {
	type: PlanType
	name: string
	monthlyPrice: number
	annualPrice: number
	features: string[]
	recommended?: boolean
	description: string
}

const PLAN_OPTIONS: PlanOption[] = [
	{
		type: 'STARTER',
		name: 'Starter',
		monthlyPrice: 29,
		annualPrice: 290,
		description: 'Perfect for small property managers',
		features: [
			'Up to 10 properties',
			'Basic tenant management',
			'Maintenance requests',
			'Email support'
		]
	},
	{
		type: 'GROWTH',
		name: 'Growth',
		monthlyPrice: 79,
		annualPrice: 790,
		description: 'Ideal for growing property portfolios',
		recommended: true,
		features: [
			'Up to 50 properties',
			'Advanced tenant management',
			'Maintenance workflows',
			'Financial reporting',
			'Priority support'
		]
	},
	{
		type: 'TENANTFLOW_MAX',
		name: 'TenantFlow Max',
		monthlyPrice: 149,
		annualPrice: 1490,
		description: 'For large property management companies',
		features: [
			'Unlimited properties',
			'Advanced analytics',
			'Custom integrations',
			'White-label options',
			'Dedicated support'
		]
	}
]

export function SubscriptionUpgradeModal({
	isOpen,
	onClose,
	currentPlan,
	userId: _userId,
	onUpgradeSuccess
}: SubscriptionUpgradeModalProps) {
	const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null)
	const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>(
		'monthly'
	)
	const [showConfirmation, setShowConfirmation] = useState(false)

	const { mutateAsync: _createCheckout, isPending: isUpgrading, error: upgradeError } =
		useCreateCheckoutSession()
		
	const { mutateAsync: updateSubscription } = useUpdateSubscription()

	// Filter plans to only show upgrades
	const availablePlans = PLAN_OPTIONS.filter(plan => {
		const planHierarchy = [
			'FREETRIAL',
			'STARTER',
			'GROWTH',
			'TENANTFLOW_MAX'
		]
		const currentIndex = planHierarchy.indexOf(currentPlan)
		const planIndex = planHierarchy.indexOf(plan.type)
		return planIndex > currentIndex
	})

	const handleUpgrade = async () => {
		if (!selectedPlan) return

		try {
			const _result = await updateSubscription({
				newPriceId: selectedPlan,
				userId: 'current', // Will be handled by backend auth
				prorationBehavior: 'create_prorations'
			})

			setShowConfirmation(true)
			setTimeout(() => {
				onUpgradeSuccess?.()
				onClose()
				setShowConfirmation(false)
				setSelectedPlan(null)
			}, 2000)
		} catch (error) {
			console.error('Upgrade failed:', error)
		}
	}

	const selectedPlanOption = selectedPlan
		? PLAN_OPTIONS.find(p => p.type === selectedPlan)
		: null
	const _currentPrice = selectedPlanOption
		? billingCycle === 'monthly'
			? selectedPlanOption.monthlyPrice
			: selectedPlanOption.annualPrice
		: 0
	const savings = selectedPlanOption
		? Math.round(
				selectedPlanOption.monthlyPrice * 12 -
					selectedPlanOption.annualPrice
			)
		: 0

	if (showConfirmation) {
		return (
			<Dialog open={isOpen} onOpenChange={onClose}>
				<DialogContent className="sm:max-w-md">
					<div className="flex flex-col items-center py-6 text-center">
						<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-1">
							<i className="i-lucide-check h-6 w-6 text-green-6"  />
						</div>
						<h3 className="mb-2 text-lg font-semibold">
							Upgrade Successful!
						</h3>
						<p className="mb-4 text-gray-6">
							Your subscription has been upgraded to{' '}
							{selectedPlanOption?.name}.
						</p>
						<p className="text-sm text-gray-5">
							Redirecting to your dashboard...
						</p>
					</div>
				</DialogContent>
			</Dialog>
		)
	}

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<i className="i-lucide-arrowupicon h-5 w-5"  />
						Upgrade Your Subscription
					</DialogTitle>
				</DialogHeader>

				<div className="space-y-6">
					{/* Billing Toggle */}
					<div className="flex items-center justify-center">
						<div className="flex rounded-lg bg-gray-1 p-1">
							<button
								className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
									billingCycle === 'monthly'
										? 'bg-white text-gray-9 shadow-sm'
										: 'text-gray-6 hover:text-gray-9'
								}`}
								onClick={() => setBillingCycle('monthly')}
							>
								Monthly
							</button>
							<button
								className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
									billingCycle === 'annual'
										? 'bg-white text-gray-9 shadow-sm'
										: 'text-gray-6 hover:text-gray-9'
								}`}
								onClick={() => setBillingCycle('annual')}
							>
								Annual
								<Badge variant="secondary" className="ml-2">
									Save 20%
								</Badge>
							</button>
						</div>
					</div>

					{/* Plan Cards */}
					<div className="grid gap-4 md:grid-cols-3">
						{availablePlans.map(plan => {
							const isSelected = selectedPlan === plan.type
							const price =
								billingCycle === 'monthly'
									? plan.monthlyPrice
									: plan.annualPrice
							const monthlyEquivalent =
								billingCycle === 'annual'
									? Math.round(plan.annualPrice / 12)
									: plan.monthlyPrice

							return (
								<div
									key={plan.type}
									className={`relative cursor-pointer rounded-lg border p-6 transition-all ${
										isSelected
											? 'border-primary bg-blue-50 ring-2 ring-blue-2'
											: 'border-gray-2 hover:border-gray-3'
									} ${plan.recommended ? 'ring-2 ring-blue-1' : ''}`}
									onClick={() => setSelectedPlan(plan.type)}
								>
									{plan.recommended && (
										<Badge className="bg-primary absolute -top-3 left-1/2 -translate-x-1/2 transform">
											Recommended
										</Badge>
									)}

									<div className="mb-4 text-center">
										<h3 className="text-lg font-semibold">
											{plan.name}
										</h3>
										<p className="mt-1 text-sm text-gray-6">
											{plan.description}
										</p>
									</div>

									<div className="mb-6 text-center">
										<div className="text-3xl font-bold">
											${price}
										</div>
										<div className="text-sm text-gray-6">
											{billingCycle === 'annual' ? (
												<>
													per year
													<div className="text-xs text-gray-5">
														(${monthlyEquivalent}
														/month)
													</div>
												</>
											) : (
												'per month'
											)}
										</div>
									</div>

									<ul className="mb-6 space-y-3">
										{plan.features.map((feature, index) => (
											<li
												key={index}
												className="flex items-start gap-2"
											>
												<i className="i-lucide-check mt-0.5 h-4 w-4 flex-shrink-0 text-green-6"  />
												<span className="text-sm">
													{feature}
												</span>
											</li>
										))}
									</ul>

									<Button
										variant={
											isSelected ? 'default' : 'outline'
										}
										className="w-full"
										onClick={() =>
											setSelectedPlan(plan.type)
										}
									>
										{isSelected
											? 'Selected'
											: 'Select Plan'}
									</Button>
								</div>
							)
						})}
					</div>

					{/* Current Plan Info */}
					<div className="rounded-lg bg-gray-50 p-4">
						<h4 className="mb-2 font-medium">
							Current Plan: {currentPlan}
						</h4>
						<p className="text-sm text-gray-6">
							You'll be upgraded immediately and charged a
							prorated amount for the remainder of your billing
							period.
						</p>
					</div>

					{/* Error Display */}
					{upgradeError && (
						<div className="rounded-lg border border-red-2 bg-red-50 p-4">
							<div className="flex items-center gap-2">
								<i className="i-lucide-x h-4 w-4 text-red-6"  />
								<span className="text-sm text-red-6">
									{upgradeError.message ||
										'Upgrade failed. Please try again.'}
								</span>
							</div>
						</div>
					)}
				</div>

				<DialogFooter className="flex-col gap-2 sm:flex-row">
					<Button
						variant="outline"
						onClick={onClose}
						disabled={isUpgrading}
					>
						Cancel
					</Button>
					<Button
						onClick={handleUpgrade}
						disabled={!selectedPlan || isUpgrading}
						className="flex items-center gap-2"
					>
						{isUpgrading ? (
							<>
								<LoadingSpinner size="sm" />
								Processing...
							</>
						) : (
							<>
								<i className="i-lucide-creditcardicon h-4 w-4"  />
								Upgrade Now
								{selectedPlanOption && (
									<span className="ml-2">
										$
										{billingCycle === 'monthly'
											? selectedPlanOption.monthlyPrice
											: selectedPlanOption.annualPrice}
										{billingCycle === 'annual' && (
											<span className="ml-1 text-xs">
												(Save ${savings})
											</span>
										)}
									</span>
								)}
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
