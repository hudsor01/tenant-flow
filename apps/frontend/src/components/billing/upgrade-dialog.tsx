'use client'

import { useState } from 'react'
import { ArrowUp, ArrowDown, Check, X, Loader2 } from 'lucide-react'
import { Button } from '#components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '#components/ui/dialog'
import { cn } from '#lib/utils'
import type { Plan, PlanFeature } from '#components/billing/plan-card'

interface UpgradeDialogProps {
	targetPlan: Plan | null
	currentPlan: Plan | null
	isOpen: boolean
	onClose: () => void
	onConfirm: (plan: Plan) => Promise<void>
}

export function UpgradeDialog({
	targetPlan,
	currentPlan,
	isOpen,
	onClose,
	onConfirm
}: UpgradeDialogProps) {
	const [isLoading, setIsLoading] = useState(false)

	if (!targetPlan) return null

	const isUpgrade =
		currentPlan === null || targetPlan.tier > (currentPlan?.tier ?? 0)
	const isDowngrade =
		currentPlan !== null && targetPlan.tier < currentPlan.tier
	const isNewSubscription = currentPlan === null

	const getPriceDifference = () => {
		if (!currentPlan) return targetPlan.price
		return targetPlan.price - currentPlan.price
	}

	const priceDifference = getPriceDifference()

	const getFeatureChanges = (): {
		gained: PlanFeature[]
		lost: PlanFeature[]
	} => {
		if (!currentPlan) {
			return {
				gained: targetPlan.features.filter(f => f.included),
				lost: []
			}
		}

		const currentIncluded = new Set(
			currentPlan.features.filter(f => f.included).map(f => f.name)
		)
		const targetIncluded = new Set(
			targetPlan.features.filter(f => f.included).map(f => f.name)
		)

		const gained = targetPlan.features.filter(
			f => f.included && !currentIncluded.has(f.name)
		)
		const lost = currentPlan.features.filter(
			f => f.included && !targetIncluded.has(f.name)
		)

		return { gained, lost }
	}

	const { gained, lost } = getFeatureChanges()

	const handleConfirm = async () => {
		setIsLoading(true)
		try {
			await onConfirm(targetPlan)
		} finally {
			setIsLoading(false)
		}
	}

	const getDialogTitle = () => {
		if (isNewSubscription) return `Subscribe to ${targetPlan.name}`
		if (isUpgrade) return `Upgrade to ${targetPlan.name}`
		if (isDowngrade) return `Downgrade to ${targetPlan.name}`
		return `Switch to ${targetPlan.name}`
	}

	const getDialogDescription = () => {
		if (isNewSubscription) {
			return 'Start your subscription and unlock all features.'
		}
		if (isUpgrade) {
			return 'Get access to more features and higher limits.'
		}
		return 'Your plan will be downgraded at the end of your current billing period.'
	}

	const getConfirmButtonText = () => {
		if (isLoading) return 'Processing...'
		if (isNewSubscription) return 'Start Subscription'
		if (isUpgrade) return 'Confirm Upgrade'
		return 'Confirm Downgrade'
	}

	return (
		<Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						{isUpgrade ? (
							<ArrowUp className="size-5 text-success" />
						) : isDowngrade ? (
							<ArrowDown className="size-5 text-warning" />
						) : null}
						{getDialogTitle()}
					</DialogTitle>
					<DialogDescription>{getDialogDescription()}</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					{/* Price Information */}
					<div className="rounded-lg border bg-muted/50 p-4">
						<div className="flex items-center justify-between">
							<span className="text-sm text-muted-foreground">New price</span>
							<span className="text-lg font-bold">
								{targetPlan.price === 0 ? 'Free' : `$${targetPlan.price}/mo`}
							</span>
						</div>
						{currentPlan && (
							<div className="mt-2 flex items-center justify-between border-t pt-2">
								<span className="text-sm text-muted-foreground">
									Price difference
								</span>
								<span
									className={cn(
										'text-sm font-medium',
										priceDifference > 0 && 'text-warning',
										priceDifference < 0 && 'text-success',
										priceDifference === 0 && 'text-muted-foreground'
									)}
								>
									{priceDifference > 0 && '+'}
									{priceDifference === 0
										? 'No change'
										: `$${priceDifference}/mo`}
								</span>
							</div>
						)}
					</div>

					{/* Features Gained */}
					{gained.length > 0 && (
						<div>
							<h4 className="text-sm font-medium text-foreground mb-2">
								{isNewSubscription ? 'What you get' : 'Features you gain'}
							</h4>
							<ul className="space-y-1.5">
								{gained.map(feature => (
									<li
										key={feature.name}
										className="flex items-center gap-2 text-sm text-success"
									>
										<Check className="size-4" />
										<span>{feature.name}</span>
									</li>
								))}
							</ul>
						</div>
					)}

					{/* Features Lost */}
					{lost.length > 0 && (
						<div>
							<h4 className="text-sm font-medium text-foreground mb-2">
								Features you lose
							</h4>
							<ul className="space-y-1.5">
								{lost.map(feature => (
									<li
										key={feature.name}
										className="flex items-center gap-2 text-sm text-destructive"
									>
										<X className="size-4" />
										<span>{feature.name}</span>
									</li>
								))}
							</ul>
						</div>
					)}

					{/* Info for existing subscribers */}
					{currentPlan && (
						<p className="text-xs text-muted-foreground">
							{isUpgrade
								? 'Your card will be charged the prorated difference immediately.'
								: 'Your current features will remain active until the end of your billing period.'}
						</p>
					)}
				</div>

				<DialogFooter className="gap-2 sm:gap-0">
					<Button
						variant="outline"
						onClick={onClose}
						disabled={isLoading}
						className="min-h-11"
					>
						Cancel
					</Button>
					<Button
						variant={isDowngrade ? 'outline' : 'default'}
						onClick={handleConfirm}
						disabled={isLoading}
						className="min-h-11"
					>
						{isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
						{getConfirmButtonText()}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
