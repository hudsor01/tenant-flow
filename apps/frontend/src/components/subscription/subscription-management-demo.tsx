'use client'

import { useState } from 'react'
import { Button } from '../ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '../ui/card'
import { Badge } from '../ui/badge'
import { ArrowUpIcon, ArrowDownIcon, XIcon, CreditCardIcon } from 'lucide-react'
import { SubscriptionUpgradeModal } from './subscription-upgrade-modal'
import { SubscriptionCancelModal } from './subscription-cancel-modal'
import { useSubscriptionSync } from '../../hooks/use-subscription-sync'
import { useSubscriptionManagement } from '../../hooks/use-subscription-management'
import { LoadingSpinner } from '../ui/loading-spinner'
import type { PlanType } from '@repo/shared'

interface SubscriptionManagementDemoProps {
	userId: string
}

/**
 * Demo component showcasing the complete subscription management system
 *
 * Features demonstrated:
 * - Real-time subscription state
 * - Plan upgrade flow
 * - Plan downgrade flow
 * - Subscription cancellation
 * - Usage metrics display
 * - Error handling
 * - Loading states
 */
export function SubscriptionManagementDemo({
	userId
}: SubscriptionManagementDemoProps) {
	const [showUpgradeModal, setShowUpgradeModal] = useState(false)
	const [showCancelModal, setShowCancelModal] = useState(false)

	// Real-time subscription state
	const {
		subscription,
		plan: _plan,
		usage,
		isLoading,
		isSyncing,
		lastSyncAt,
		syncError,
		isInSync,
		discrepancies,
		syncNow,
		refreshSubscription,
		forceFullSync
	} = useSubscriptionSync(userId, {
		enableAutoSync: true,
		enableRealTimeUpdates: true,
		syncIntervalMs: 5 * 60 * 1000 // 5 minutes
	})

	// Subscription management actions
	const {
		downgradePlan,
		createCheckout,
		isDowngrading,
		isCreatingCheckout,
		downgradeError,
		checkoutError,
		lastResult
	} = useSubscriptionManagement(userId)

	const currentPlan = subscription?.planType || 'FREETRIAL'
	const isActive =
		subscription?.status === 'ACTIVE' || subscription?.status === 'TRIALING'

	const planInfo = {
		FREETRIAL: { name: 'Free Trial', color: 'gray', price: 0 },
		STARTER: { name: 'Starter', color: 'blue', price: 29 },
		GROWTH: { name: 'Growth', color: 'green', price: 79 },
		TENANTFLOW_MAX: { name: 'TenantFlow Max', color: 'purple', price: 149 }
	}

	const currentPlanInfo = planInfo[currentPlan as keyof typeof planInfo]

	const handleQuickUpgrade = async (targetPlan: PlanType) => {
		try {
			await createCheckout({
				planType: targetPlan,
				billingCycle: 'monthly',
				successUrl: `${window.location.origin}/dashboard?upgraded=true`,
				cancelUrl: `${window.location.origin}/dashboard`
			})
		} catch (error) {
			console.error('Quick upgrade failed:', error)
		}
	}

	const handleDowngrade = async () => {
		const targetPlan =
			currentPlan === 'TENANTFLOW_MAX'
				? 'GROWTH'
				: currentPlan === 'GROWTH'
					? 'STARTER'
					: 'FREETRIAL'

		try {
			await downgradePlan({
				targetPlan: targetPlan as PlanType,
				billingCycle: 'monthly',
				effectiveDate: 'end_of_period',
				reason: 'Cost optimization'
			})
		} catch (error) {
			console.error('Downgrade failed:', error)
		}
	}

	if (isLoading) {
		return (
			<Card className="w-full max-w-4xl">
				<CardContent className="flex items-center justify-center py-8">
					<LoadingSpinner size="lg" />
					<span className="ml-2">
						Loading subscription details...
					</span>
				</CardContent>
			</Card>
		)
	}

	return (
		<div className="w-full max-w-4xl space-y-6">
			{/* Current Subscription Status */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center justify-between">
						<span>Current Subscription</span>
						<div className="flex items-center gap-2">
							{isSyncing && <LoadingSpinner size="sm" />}
							<Badge variant={isActive ? 'default' : 'secondary'}>
								{subscription?.status || 'Unknown'}
							</Badge>
							{!isInSync && (
								<Badge variant="destructive">Out of Sync</Badge>
							)}
						</div>
					</CardTitle>
					<CardDescription>
						Manage your TenantFlow subscription and billing
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* Plan Information */}
					<div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
						<div>
							<h3 className="text-lg font-semibold">
								{currentPlanInfo.name}
							</h3>
							<p className="text-gray-600">
								${currentPlanInfo.price}/month
							</p>
							{subscription?.currentPeriodEnd && (
								<p className="text-sm text-gray-500">
									Next billing:{' '}
									{new Date(
										subscription.currentPeriodEnd
									).toLocaleDateString()}
								</p>
							)}
						</div>
						<Badge
							variant="outline"
							className={`bg-${currentPlanInfo.color}-100 text-${currentPlanInfo.color}-800`}
						>
							{currentPlanInfo.name}
						</Badge>
					</div>

					{/* Usage Information */}
					{usage && (
						<div className="grid grid-cols-3 gap-4">
							<div className="rounded-lg bg-blue-50 p-3 text-center">
								<div className="text-primary text-2xl font-bold">
									{usage.properties}
								</div>
								<div className="text-sm text-blue-800">
									Properties
								</div>
								<div className="text-xs text-gray-600">
									of {usage.limits?.properties || '∞'}
								</div>
							</div>
							<div className="rounded-lg bg-green-50 p-3 text-center">
								<div className="text-2xl font-bold text-green-600">
									{usage.tenants}
								</div>
								<div className="text-sm text-green-800">
									Tenants
								</div>
								<div className="text-xs text-gray-600">
									of {usage.limits?.tenants || '∞'}
								</div>
							</div>
							<div className="rounded-lg bg-purple-50 p-3 text-center">
								<div className="text-2xl font-bold text-purple-600">
									{usage.maintenanceRequests}
								</div>
								<div className="text-sm text-purple-800">
									Requests
								</div>
								<div className="text-xs text-gray-600">
									this month
								</div>
							</div>
						</div>
					)}

					{/* Sync Status */}
					<div className="flex items-center justify-between text-sm text-gray-600">
						<span>
							Last synced:{' '}
							{lastSyncAt
								? lastSyncAt.toLocaleTimeString()
								: 'Never'}
						</span>
						<Button
							variant="outline"
							size="sm"
							onClick={syncNow}
							disabled={isSyncing}
						>
							{isSyncing ? 'Syncing...' : 'Sync Now'}
						</Button>
					</div>

					{/* Discrepancies Alert */}
					{discrepancies.length > 0 && (
						<div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
							<div className="text-sm font-medium text-yellow-800">
								Sync Issues Detected
							</div>
							<ul className="mt-1 text-sm text-yellow-700">
								{discrepancies.map((issue, index) => (
									<li key={index}>• {issue}</li>
								))}
							</ul>
							<Button
								variant="outline"
								size="sm"
								className="mt-2"
								onClick={forceFullSync}
							>
								Force Full Sync
							</Button>
						</div>
					)}

					{/* Error Display */}
					{(syncError || downgradeError || checkoutError) && (
						<div className="rounded-lg border border-red-200 bg-red-50 p-3">
							<div className="text-sm font-medium text-red-800">
								Error
							</div>
							<p className="text-sm text-red-700">
								{syncError?.message ||
									downgradeError?.message ||
									checkoutError?.message}
							</p>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Action Buttons */}
			<Card>
				<CardHeader>
					<CardTitle>Subscription Actions</CardTitle>
					<CardDescription>
						Upgrade, downgrade, or cancel your subscription
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
						{/* Upgrade Options */}
						{currentPlan !== 'TENANTFLOW_MAX' && (
							<Button
								onClick={() => setShowUpgradeModal(true)}
								className="flex items-center gap-2"
								disabled={!isActive}
							>
								<ArrowUpIcon className="h-4 w-4" />
								Upgrade Plan
							</Button>
						)}

						{/* Quick Upgrade Buttons */}
						{currentPlan === 'FREETRIAL' && (
							<Button
								variant="outline"
								onClick={() => handleQuickUpgrade('STARTER')}
								disabled={isCreatingCheckout}
								className="flex items-center gap-2"
							>
								<CreditCardIcon className="h-4 w-4" />
								{isCreatingCheckout
									? 'Creating...'
									: 'Start Trial'}
							</Button>
						)}

						{(currentPlan === 'STARTER' ||
							currentPlan === 'FREETRIAL') && (
							<Button
								variant="outline"
								onClick={() => handleQuickUpgrade('GROWTH')}
								disabled={isCreatingCheckout}
								className="flex items-center gap-2"
							>
								<CreditCardIcon className="h-4 w-4" />
								{isCreatingCheckout
									? 'Creating...'
									: 'Go Growth'}
							</Button>
						)}

						{/* Downgrade Option */}
						{currentPlan !== 'FREETRIAL' && (
							<Button
								variant="outline"
								onClick={handleDowngrade}
								disabled={isDowngrading || !isActive}
								className="flex items-center gap-2"
							>
								<ArrowDownIcon className="h-4 w-4" />
								{isDowngrading ? 'Processing...' : 'Downgrade'}
							</Button>
						)}

						{/* Cancel Option */}
						{isActive && (
							<Button
								variant="destructive"
								onClick={() => setShowCancelModal(true)}
								className="flex items-center gap-2"
							>
								<XIcon className="h-4 w-4" />
								Cancel
							</Button>
						)}
					</div>

					{/* Last Action Result */}
					{lastResult && (
						<div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
							<div className="text-sm font-medium text-blue-800">
								Last Action: {lastResult.metadata.operation}
							</div>
							<div className="text-sm text-blue-700">
								Status:{' '}
								{lastResult.success ? 'Success' : 'Failed'}
							</div>
							{lastResult.changes.length > 0 && (
								<div className="text-sm text-blue-700">
									Changes: {lastResult.changes.join(', ')}
								</div>
							)}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Plan Comparison Quick View */}
			<Card>
				<CardHeader>
					<CardTitle>Available Plans</CardTitle>
					<CardDescription>
						Compare features and pricing across all plans
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-4 gap-4">
						{Object.entries(planInfo).map(([planKey, info]) => {
							const isCurrent = planKey === currentPlan
							const isUpgrade =
								[
									'FREETRIAL',
									'STARTER',
									'GROWTH',
									'TENANTFLOW_MAX'
								].indexOf(planKey) >
								[
									'FREETRIAL',
									'STARTER',
									'GROWTH',
									'TENANTFLOW_MAX'
								].indexOf(currentPlan)

							return (
								<div
									key={planKey}
									className={`rounded-lg border p-4 ${isCurrent ? 'border-primary bg-blue-50' : 'border-gray-200'}`}
								>
									<div className="text-center">
										<h4 className="font-semibold">
											{info.name}
										</h4>
										<div className="text-2xl font-bold">
											${info.price}
										</div>
										<div className="text-sm text-gray-600">
											per month
										</div>

										{isCurrent && (
											<Badge className="mt-2">
												Current Plan
											</Badge>
										)}

										{!isCurrent && isUpgrade && (
											<Button
												size="sm"
												className="mt-2 w-full"
												onClick={() =>
													handleQuickUpgrade(
														planKey as PlanType
													)
												}
												disabled={isCreatingCheckout}
											>
												Upgrade
											</Button>
										)}
									</div>
								</div>
							)
						})}
					</div>
				</CardContent>
			</Card>

			{/* Modals */}
			<SubscriptionUpgradeModal
				isOpen={showUpgradeModal}
				onClose={() => setShowUpgradeModal(false)}
				currentPlan={currentPlan as PlanType}
				userId={userId}
				onUpgradeSuccess={() => {
					setShowUpgradeModal(false)
					refreshSubscription()
				}}
			/>

			<SubscriptionCancelModal
				isOpen={showCancelModal}
				onClose={() => setShowCancelModal(false)}
				currentPlan={currentPlan as PlanType}
				userId={userId}
				onCancelSuccess={() => {
					setShowCancelModal(false)
					refreshSubscription()
				}}
			/>
		</div>
	)
}

/**
 * Subscription Management Demo Component
 *
 * This component demonstrates the complete subscription management system in action:
 *
 * 🎯 **Real-time Features**
 * - Live subscription state synchronization
 * - Automatic sync with configurable intervals
 * - Real-time usage metrics display
 * - Sync status and error monitoring
 *
 * 🔄 **Subscription Operations**
 * - Plan upgrades with modal flow
 * - Quick upgrade buttons for common scenarios
 * - Plan downgrades with usage validation
 * - Subscription cancellation with retention
 *
 * 📊 **Usage & Analytics**
 * - Current usage vs limits display
 * - Plan comparison grid
 * - Billing period information
 * - Subscription status indicators
 *
 * 🛡️ **Error Handling**
 * - Comprehensive error display
 * - Sync discrepancy detection
 * - Loading states for all operations
 * - Graceful degradation
 *
 * 🎨 **User Experience**
 * - Beautiful UI with Tailwind styling
 * - Intuitive action buttons
 * - Clear status indicators
 * - Responsive design
 *
 * This demo shows how all the subscription management pieces work together
 * to provide a seamless user experience for managing subscriptions.
 */
