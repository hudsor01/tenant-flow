import { Clock, Zap, X } from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '../ui/card'
import { Button } from '../ui/button'
import {
	useUserPlan,
	useCreateCheckoutSession
} from '../../hooks/useSubscription'
import { PLANS, calculateAnnualSavings } from '../../types/subscription'
import { formatCurrency } from '../../utils/currency'

export function TrialCountdownBanner() {
	const { data: userPlan } = useUserPlan()
	const createCheckoutSession = useCreateCheckoutSession()
	const [isDismissed, setIsDismissed] = useState(false)

	if (!userPlan || !userPlan.subscription || isDismissed) {
		return null
	}

	const trialDaysRemaining = userPlan.trialDaysRemaining || 0

	// Only show if user is on trial and has 7 days or less remaining
	if (trialDaysRemaining === 0 || trialDaysRemaining > 7) {
		return null
	}

	const getUrgencyLevel = () => {
		if (trialDaysRemaining <= 1) return 'critical'
		if (trialDaysRemaining <= 3) return 'high'
		return 'medium'
	}

	const urgency = getUrgencyLevel()

	const colors = {
		critical: {
			bg: 'from-destructive/10 to-destructive/5',
			border: 'border-destructive/20',
			icon: 'bg-destructive/10 text-destructive',
			text: 'text-destructive',
			subtext: 'text-destructive-foreground/90',
			button: 'bg-destructive hover:bg-destructive/90'
		},
		high: {
			bg: 'from-destructive/10 to-accent/10',
			border: 'border-destructive/20',
			icon: 'bg-destructive/10 text-destructive',
			text: 'text-foreground',
			subtext: 'text-foreground/80',
			button: 'bg-destructive hover:bg-destructive/90'
		},
		medium: {
			bg: 'from-primary/10 to-primary/5',
			border: 'border-primary/20',
			icon: 'bg-primary/10 text-primary',
			text: 'text-primary',
			subtext: 'text-primary-foreground/90',
			button: 'bg-primary hover:bg-primary/90'
		}
	}

	const theme = colors[urgency]

	const starterPlan = PLANS.find(p => p.id === 'starter')!
	const annualSavings = calculateAnnualSavings(starterPlan)

	const handleUpgrade = (billingPeriod: 'monthly' | 'annual' = 'monthly') => {
		createCheckoutSession.mutate({
			planId: 'starter', // Default to starter plan
			billingPeriod,
			successUrl: `${window.location.origin}/dashboard?upgrade=success`,
			cancelUrl: `${window.location.origin}/dashboard?upgrade=cancelled`
		})
	}

	return (
		<AnimatePresence>
			<motion.div
				initial={{ opacity: 0, y: -10 }}
				animate={{ opacity: 1, y: 0 }}
				exit={{ opacity: 0, y: -10 }}
				className="mb-6"
			>
				<Card
					className={`${theme.border} bg-gradient-to-r ${theme.bg}`}
				>
					<CardContent className="p-4">
						<div className="flex items-start justify-between">
							<div className="flex flex-1 items-start space-x-3">
								<div className={`rounded-lg p-2 ${theme.icon}`}>
									<Clock className="h-5 w-5" />
								</div>

								<div className="flex-1">
									<div className="mb-2 flex items-center space-x-2">
										<h3
											className={`font-semibold ${theme.text}`}
										>
											{trialDaysRemaining === 1
												? 'Trial Expires Tomorrow!'
												: `${trialDaysRemaining} Days Left in Trial`}
										</h3>
										<span
											className={`bg-background/70 px-2 py-1 ${theme.subtext} rounded-full text-xs font-medium`}
										>
											Free Trial
										</span>
									</div>

									<p
										className={`text-sm ${theme.subtext} mb-4`}
									>
										{trialDaysRemaining === 1
											? 'Your free trial ends tomorrow. Upgrade now to keep your data and continue managing your properties.'
											: `Your free trial ends in ${trialDaysRemaining} days. Upgrade now to unlock unlimited properties and tenants.`}
									</p>

									<div className="flex items-center space-x-3">
										<Button
											onClick={() =>
												handleUpgrade('monthly')
											}
											disabled={
												createCheckoutSession.isPending
											}
											size="sm"
											className={`${theme.button} text-white`}
										>
											<Zap className="mr-2 h-4 w-4" />
											Upgrade Now
										</Button>

										<Button
											onClick={() =>
												handleUpgrade('annual')
											}
											disabled={
												createCheckoutSession.isPending
											}
											variant="outline"
											size="sm"
											className="border-background/50 bg-background/50 hover:bg-background/70"
										>
											🎉 Save $
											{annualSavings.dollarsSaved}/year
										</Button>

										<div
											className={`text-xs ${theme.subtext}`}
										>
											Starting at {formatCurrency(49)}
											/month
										</div>
									</div>
								</div>
							</div>

							<Button
								variant="ghost"
								size="sm"
								onClick={() => setIsDismissed(true)}
								className={`${theme.subtext} hover:bg-background/30 h-auto p-1`}
							>
								<X className="h-4 w-4" />
							</Button>
						</div>
					</CardContent>
				</Card>
			</motion.div>
		</AnimatePresence>
	)
}
