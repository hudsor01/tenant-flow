import { Check, Zap, Star, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { formatPrice as sharedFormatPrice } from '@repo/shared'
import { cardVariants, enhancedButtonVariants } from '@/components/ui/variants'
import { motion, LazyMotion, domAnimation } from '@/lib/framer-motion'
import { motionPresets } from '@/lib/framer-motion'
import type { ProductTierConfig, PlanType, BillingInterval } from '@repo/shared'

interface PricingTierCardProps {
	tier: ProductTierConfig
	planType: PlanType
	billingInterval: BillingInterval
	isCurrentPlan?: boolean
	loading?: boolean
	onSubscribe?: () => void
	isRecommended?: boolean
}

export function PricingTierCard({
	tier,
	planType,
	billingInterval,
	isCurrentPlan = false,
	loading = false,
	onSubscribe,
	isRecommended = false
}: PricingTierCardProps) {
	const price =
		billingInterval === 'monthly' ? tier.price.monthly : tier.price.annual
	const monthlyPrice =
		billingInterval === 'yearly'
			? tier.price.annual / 12
			: tier.price.monthly

	const isFree = planType === 'FREETRIAL'
	const isTenantFlowMax = planType === 'TENANTFLOW_MAX'
	const _isGrowth = planType === 'GROWTH'

	// Calculate features to display
	const features = [
		`Up to ${tier.limits.properties === null ? 'unlimited' : tier.limits.properties} properties`,
		`Up to ${tier.limits.units === null ? 'unlimited' : tier.limits.units} units`,
		`${tier.limits.users === null ? 'Unlimited' : tier.limits.users} user${tier.limits.users !== 1 ? 's' : ''}`,
		`${tier.limits.storage === null ? 'Unlimited' : tier.limits.storage + 'GB'} storage`,
		`${tier.limits.apiCalls === null || tier.limits.apiCalls === undefined ? 'Unlimited' : tier.limits.apiCalls.toLocaleString()} API calls/month`,
		'Tenant management',
		'Maintenance tracking',
		'Document storage'
	]

	// Add tier-specific features
	if (planType !== 'FREETRIAL') {
		features.push('Email support')
	}
	if (planType === 'GROWTH' || planType === 'TENANTFLOW_MAX') {
		features.push('Advanced analytics', 'Team collaboration')
	}
	if (planType === 'TENANTFLOW_MAX') {
		features.push(
			'Dedicated support',
			'Custom integrations',
			'SLA guarantees'
		)
	}

	const formatPrice = (cents: number) => {
		// Use shared currency utility
		return sharedFormatPrice(cents, {
			fromCents: true,
			showInterval: false
		})
	}

	const getCTA = () => {
		if (isCurrentPlan) return 'Current Plan'
		if (isFree) return 'Start Free Trial'
		if (isTenantFlowMax) return 'Contact Sales'
		return `Get ${tier.name}`
	}

	const getCardVariant = () => {
		if (isCurrentPlan) return 'highlight'
		if (isTenantFlowMax) return 'premium'
		if (isRecommended) return 'gradient'
		if (isFree) return 'glass'
		return 'interactive'
	}

	const getButtonVariant = () => {
		if (isCurrentPlan) return 'outline'
		if (isTenantFlowMax) return 'premium'
		if (isRecommended) return 'cta'
		if (isFree) return 'gradient'
		return 'default'
	}

	return (
		<LazyMotion features={domAnimation}>
			<motion.div
				className={cn('group relative', isRecommended && 'z-10')}
				{...motionPresets.pricingCard}
				custom={
					planType === 'FREETRIAL'
						? 0
						: planType === 'STARTER'
							? 1
							: planType === 'GROWTH'
								? 2
								: 3
				}
			>
				<Card
					className={cn(
						cardVariants({
							variant: getCardVariant(),
							size: 'lg',
							spacing: 'spacious'
						}),
						'relative h-full transition-all duration-300',
						isRecommended && 'ring-primary/30 shadow-xl ring-2',
						isTenantFlowMax && 'overflow-hidden',
						'backdrop-blur-sm'
					)}
				>
					{/* Premium background gradient for TenantFlow Max */}
					{isTenantFlowMax && (
						<div className="from-primary/10 via-accent/5 to-success/10 absolute inset-0 bg-gradient-to-br opacity-50" />
					)}

					{/* Shimmer effect overlay */}
					<div className="shimmer-effect absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
					{/* Recommended badge with enhanced styling */}
					{isRecommended && (
						<div className="absolute -top-4 left-1/2 z-20 -translate-x-1/2 transform">
							<motion.div {...motionPresets.pricingBadge}>
								<Badge className="from-primary to-accent text-primary-foreground flex items-center gap-1.5 bg-gradient-to-r px-4 py-2 shadow-lg">
									<Star className="h-3.5 w-3.5 fill-current" />
									<span className="font-semibold">
										Most Popular
									</span>
								</Badge>
							</motion.div>
						</div>
					)}

					{/* Premium badge for TenantFlow Max */}
					{isTenantFlowMax && (
						<div className="absolute -top-4 right-4 z-20">
							<motion.div {...motionPresets.pricingBadge}>
								<Badge className="from-accent to-success flex items-center gap-1 bg-gradient-to-r px-3 py-1.5 text-white shadow-lg">
									<Sparkles className="h-3 w-3" />
									<span className="font-medium">
										Enterprise
									</span>
								</Badge>
							</motion.div>
						</div>
					)}

					<CardHeader className="relative z-10 pb-6 text-center">
						<div className="mb-4 flex items-center justify-center gap-2">
							<h3
								className={cn(
									'text-2xl font-bold transition-all duration-300',
									isTenantFlowMax &&
										'text-display from-primary via-accent to-primary bg-gradient-to-r bg-clip-text text-transparent',
									isRecommended && 'text-primary',
									!isTenantFlowMax &&
										!isRecommended &&
										'text-foreground'
								)}
							>
								{tier.name}
							</h3>
							{isFree && (
								<Zap className="text-accent h-5 w-5 animate-pulse" />
							)}
							{isTenantFlowMax && (
								<Sparkles className="text-accent h-5 w-5 animate-pulse" />
							)}
						</div>

						<motion.div
							className="mb-6"
							{...motionPresets.pricingPrice}
						>
							{isFree ? (
								<div className="relative">
									<div className="text-accent animate-count text-5xl font-bold">
										Free
									</div>
									<div className="text-muted-foreground mt-1 text-sm">
										14-day trial
									</div>
								</div>
							) : isTenantFlowMax ? (
								<div className="relative">
									<div className="from-primary via-accent to-success animate-gradient bg-gradient-to-r bg-clip-text text-4xl font-bold text-transparent">
										Custom
									</div>
									<div className="text-muted-foreground mt-1 text-sm">
										Enterprise pricing
									</div>
								</div>
							) : (
								<div className="relative">
									<div
										className={cn(
											'text-5xl font-bold transition-all duration-300',
											isRecommended && 'text-primary',
											!isRecommended && 'text-foreground'
										)}
									>
										{formatPrice(monthlyPrice)}
										<span className="text-muted-foreground text-lg font-normal">
											/month
										</span>
									</div>
									{billingInterval === 'yearly' && (
										<div className="mt-2 flex items-center justify-center gap-2">
											<div className="text-success bg-success/10 rounded-full px-2 py-1 text-sm font-semibold">
												Save $
												{Math.round(
													(tier.price.monthly * 12 -
														tier.price.annual) /
														100
												)}
												/year
											</div>
										</div>
									)}
									<div className="text-muted-foreground mt-1 text-xs">
										{billingInterval === 'yearly'
											? `Billed annually (${formatPrice(price)})`
											: 'Billed monthly'}
									</div>
								</div>
							)}
						</motion.div>

						<p className="text-muted-foreground text-sm leading-relaxed">
							{tier.description}
						</p>
					</CardHeader>

					<CardContent className="relative z-10 pt-0">
						<div className="mb-8 space-y-4">
							{features.map((feature, index) => (
								<motion.div
									key={index}
									className="group/feature flex items-start gap-3 transition-all duration-200"
									{...motionPresets.pricingFeature}
									custom={index}
								>
									<div
										className={cn(
											'mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full transition-all duration-200',
											isTenantFlowMax &&
												'from-accent to-success bg-gradient-to-r',
											isRecommended && 'bg-primary',
											!isTenantFlowMax &&
												!isRecommended &&
												'bg-success/20'
										)}
									>
										<Check
											className={cn(
												'h-3 w-3 transition-all duration-200',
												isTenantFlowMax || isRecommended
													? 'text-white'
													: 'text-success'
											)}
										/>
									</div>
									<span className="text-foreground group-hover/feature:text-primary text-sm leading-relaxed transition-colors duration-200">
										{feature}
									</span>
								</motion.div>
							))}
						</div>

						<motion.div {...motionPresets.pricingButton}>
							<Button
								onClick={onSubscribe}
								disabled={loading || isCurrentPlan}
								className={cn(
									enhancedButtonVariants({
										variant: getButtonVariant(),
										size: 'lg',
										fullWidth: true
									}),
									'group/button relative overflow-hidden transition-all duration-300',
									'hover:shadow-lg active:scale-[0.98]',
									isCurrentPlan &&
										'cursor-default opacity-70',
									loading && 'cursor-wait'
								)}
							>
								{loading ? (
									<div className="flex items-center gap-2">
										<Spinner
											size="sm"
											color="current"
											className="animate-spin"
										/>
										<span>Processing...</span>
									</div>
								) : (
									<>
										<span className="relative z-10 font-semibold">
											{getCTA()}
										</span>
										{/* Button shine effect */}
										{!isCurrentPlan && (
											<div className="absolute inset-0 -top-1 -left-1 translate-x-[-200%] skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 ease-out group-hover/button:translate-x-[200%]" />
										)}
									</>
								)}
							</Button>
						</motion.div>

						{tier.trial &&
							tier.trial.trialPeriodDays > 0 &&
							!isFree && (
								<div className="mt-4 text-center">
									<p className="text-muted-foreground bg-muted/30 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs">
										<Zap className="text-accent h-3 w-3" />
										{tier.trial.trialPeriodDays}-day free
										trial included
									</p>
								</div>
							)}
					</CardContent>
				</Card>
			</motion.div>
		</LazyMotion>
	)
}
