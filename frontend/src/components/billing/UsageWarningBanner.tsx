import { AlertTriangle, Zap, X } from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '../ui/card'
import { Button } from '../ui/button'
import { Progress } from '../ui/progress'
import {
	useUsageMetrics,
	useUserPlan,
	useCreateCheckoutSession
} from '../../hooks/useSubscription'
import { formatCurrency } from '../../utils/currency'

export function UsageWarningBanner() {
	const { data: usage } = useUsageMetrics()
	const { data: userPlan } = useUserPlan()
	const createCheckoutSession = useCreateCheckoutSession()
	const [isDismissed, setIsDismissed] = useState(false)

	if (!usage || !userPlan || !usage.limits || isDismissed) {
		return null
	}

	// Check if any limits are at 80% or higher
	const warnings = []

	if (usage.propertiesCount / usage.limits.properties >= 0.8) {
		warnings.push({
			type: 'properties',
			current: usage.propertiesCount,
			limit: usage.limits.properties,
			percentage: Math.round(
				(usage.propertiesCount / usage.limits.properties) * 100
			),
			action: 'add properties'
		})
	}

	if (usage.tenantsCount / usage.limits.tenants >= 0.8) {
		warnings.push({
			type: 'tenants',
			current: usage.tenantsCount,
			limit: usage.limits.tenants,
			percentage: Math.round(
				(usage.tenantsCount / usage.limits.tenants) * 100
			),
			action: 'invite tenants'
		})
	}

	// Don't show if no warnings
	if (warnings.length === 0) {
		return null
	}

	const handleUpgrade = () => {
		const suggestedPlan = userPlan.id === 'freeTrial' ? 'starter' : 'growth'
		createCheckoutSession.mutate({
			planId: suggestedPlan,
			billingPeriod: 'monthly',
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
				<Card className="border-destructive/20 from-destructive/10 to-accent/10 bg-gradient-to-r">
					<CardContent className="p-4">
						<div className="flex items-start justify-between">
							<div className="flex flex-1 items-start space-x-3">
								<div className="bg-destructive/10 rounded-lg p-2">
									<AlertTriangle className="text-destructive h-5 w-5" />
								</div>

								<div className="flex-1">
									<div className="mb-2 flex items-center space-x-2">
										<h3 className="text-foreground font-semibold">
											Approaching Plan Limits
										</h3>
										<span className="bg-destructive/20 text-destructive rounded-full px-2 py-1 text-xs font-medium">
											{userPlan.name} Plan
										</span>
									</div>

									<p className="text-foreground/80 mb-3 text-sm">
										You're using most of your plan's
										resources. Consider upgrading to avoid
										interruptions.
									</p>

									<div className="space-y-3">
										{warnings.map(warning => (
											<div
												key={warning.type}
												className="space-y-1"
											>
												<div className="flex items-center justify-between text-sm">
													<span className="text-foreground font-medium capitalize">
														{warning.type}
													</span>
													<span className="text-foreground/80">
														{warning.current} /{' '}
														{warning.limit}
													</span>
												</div>
												<div className="relative">
													<Progress
														value={
															warning.percentage
														}
														className="bg-destructive/10 h-2"
													/>
													{warning.percentage >=
														100 && (
														<div className="bg-destructive absolute inset-0 rounded-full opacity-20" />
													)}
												</div>
												<div className="text-destructive/80 text-xs">
													{warning.percentage >=
													100 ? (
														<span className="text-destructive font-medium">
															⚠️ Limit reached -
															upgrade to{' '}
															{warning.action}
														</span>
													) : (
														<span>
															{100 -
																warning.percentage}
															% remaining
														</span>
													)}
												</div>
											</div>
										))}
									</div>

									<div className="mt-4 flex items-center space-x-3">
										<Button
											onClick={handleUpgrade}
											disabled={
												createCheckoutSession.isPending
											}
											size="sm"
											className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
										>
											<Zap className="mr-2 h-4 w-4" />
											Upgrade Now
										</Button>

										<div className="text-foreground/60 text-xs">
											Starting at{' '}
											{formatCurrency(
												userPlan.id === 'freeTrial'
													? 49
													: 99
											)}
											/month
										</div>
									</div>
								</div>
							</div>

							<Button
								variant="ghost"
								size="sm"
								onClick={() => setIsDismissed(true)}
								className="text-destructive/60 hover:text-destructive hover:bg-destructive/10 h-auto p-1"
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
