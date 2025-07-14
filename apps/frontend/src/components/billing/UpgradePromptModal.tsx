import { X, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dialog, DialogContent } from '../ui/dialog'
import { Button } from '../ui/button'
import { useCreateCheckoutSession } from '../../hooks/useSubscription'
import {
	PLANS,
	calculateAnnualSavings,
	getAnnualSavingsMessage
} from '../../types/subscription'

interface UpgradePromptModalProps {
	isOpen: boolean
	onClose: () => void
	action: string
	reason: string
	currentPlan: string
	suggestedPlan?: 'starter' | 'growth' | 'enterprise'
}

const planColors = {
	starter: 'from-primary to-primary/80',
	growth: 'from-primary/90 to-accent',
	enterprise: 'from-destructive to-destructive/80'
}

const planIcons = {
	starter: '🚀',
	growth: '📈',
	enterprise: '⚡'
}

export function UpgradePromptModal({
	isOpen,
	onClose,
	action,
	reason,
	suggestedPlan = 'starter'
}: UpgradePromptModalProps) {
	const createCheckoutSession = useCreateCheckoutSession()

	const suggestedPlanData = PLANS.find(p => p.id === suggestedPlan)

	if (!suggestedPlanData) return null

	const annualSavings = calculateAnnualSavings(suggestedPlanData)
	const savingsMessage = getAnnualSavingsMessage(suggestedPlanData)

	// Simplified upgrade flow - just redirect to Stripe Checkout
	const handleUpgradeClick = (
		billingPeriod: 'monthly' | 'annual' = 'monthly'
	) => {
		createCheckoutSession.mutate({
			planId: suggestedPlan,
			billingPeriod,
			// Stripe automatically redirects to their hosted checkout
			successUrl: `${window.location.origin}/dashboard?upgrade=success`,
			cancelUrl: `${window.location.origin}/dashboard?upgrade=cancelled`
		})
		onClose()
	}

	return (
		<AnimatePresence>
			{isOpen && (
				<Dialog open={isOpen} onOpenChange={onClose}>
					<DialogContent className="max-w-md overflow-hidden p-0">
						<motion.div
							initial={{ opacity: 0, scale: 0.95 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.95 }}
							transition={{ duration: 0.2 }}
							className="relative"
						>
							{/* Header with gradient */}
							<div
								className={`bg-gradient-to-r ${planColors[suggestedPlan]} relative overflow-hidden p-6 text-white`}
							>
								<div className="absolute top-0 right-0 h-32 w-32 translate-x-16 -translate-y-16 rounded-full bg-white/10" />

								<button
									onClick={onClose}
									className="bg-background/20 hover:bg-background/30 absolute top-4 right-4 rounded-full p-2 transition-colors"
								>
									<X className="h-4 w-4" />
								</button>

								<div className="relative z-10">
									<div className="mb-4 flex items-center space-x-3">
										<div className="text-3xl">
											{planIcons[suggestedPlan]}
										</div>
										<div>
											<h2 className="text-xl font-bold">
												Upgrade Required
											</h2>
											<p className="text-sm text-white/90">
												{reason}
											</p>
										</div>
									</div>

									<div className="bg-background/20 rounded-lg p-3 backdrop-blur-sm">
										<p className="mb-1 text-sm font-medium">
											You're trying to:
										</p>
										<p className="text-sm">"{action}"</p>
									</div>
								</div>
							</div>

							{/* Content */}
							<div className="p-6">
								<div className="mb-6 text-center">
									<h3 className="mb-2 text-lg font-semibold">
										Unlock More with{' '}
										{suggestedPlanData.name}
									</h3>
									<p className="text-muted-foreground text-sm">
										Get access to more properties, tenants,
										and powerful features
									</p>
								</div>

								{/* Simple upgrade buttons using Stripe Checkout */}
								<div className="space-y-3">
									{/* Monthly */}
									<Button
										onClick={() =>
											handleUpgradeClick('monthly')
										}
										disabled={
											createCheckoutSession.isPending
										}
										className={`h-auto w-full bg-gradient-to-r p-4 ${planColors[suggestedPlan]} transition-opacity hover:opacity-90`}
									>
										<div className="flex w-full items-center justify-between">
											<div className="text-left">
												<div className="font-semibold">
													Monthly Plan
												</div>
												<div className="text-sm opacity-90">
													Billed monthly
												</div>
											</div>
											<div className="text-right">
												<div className="text-xl font-bold">
													$
													{
														suggestedPlanData.monthlyPrice
													}
												</div>
												<div className="text-sm opacity-90">
													per month
												</div>
											</div>
										</div>
									</Button>

									{/* Annual */}
									<Button
										onClick={() =>
											handleUpgradeClick('annual')
										}
										disabled={
											createCheckoutSession.isPending
										}
										variant="outline"
										className="border-success bg-success hover:bg-success/90 h-auto w-full border-2 p-4"
									>
										<div className="flex w-full items-center justify-between">
											<div className="text-left">
												<div className="flex items-center font-semibold">
													Annual Plan
													<span className="bg-success-foreground text-success ml-2 rounded-full px-2 py-1 text-xs">
														🎉 {savingsMessage}
													</span>
												</div>
												<div className="text-success-foreground text-sm">
													Save $
													{annualSavings.dollarsSaved}
													/year
												</div>
											</div>
											<div className="text-right">
												<div className="text-xl font-bold">
													$
													{Math.round(
														suggestedPlanData.annualPrice /
															12
													)}
												</div>
												<div className="text-muted-foreground text-sm">
													per month
												</div>
											</div>
										</div>
									</Button>
								</div>

								{/* Benefits */}
								<div className="bg-muted mt-6 rounded-lg p-4">
									<div className="mb-3 flex items-center space-x-2">
										<Zap className="text-primary h-4 w-4" />
										<span className="text-sm font-medium">
											What you get:
										</span>
									</div>
									<div className="space-y-1 text-sm">
										<div>✓ 14-day free trial</div>
										<div>✓ Cancel anytime</div>
										<div>✓ Secure Stripe checkout</div>
									</div>
								</div>

								{/* Footer */}
								<div className="mt-4 text-center">
									<button
										onClick={onClose}
										className="text-muted-foreground hover:text-foreground text-sm transition-colors"
									>
										Maybe later
									</button>
								</div>
							</div>
						</motion.div>
					</DialogContent>
				</Dialog>
			)}
		</AnimatePresence>
	)
}
