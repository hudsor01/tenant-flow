'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { createCheckoutSession, isUserAuthenticated } from '@/lib/stripe-client'
import {
	checkoutRateLimiter
} from '@/lib/security'
import { 
	cn, 
	buttonClasses,
	cardClasses,
	animationClasses,
	badgeClasses,
	ANIMATION_DURATIONS,
	TYPOGRAPHY_SCALE
} from '@/lib/utils'
import { PRICING_PLANS } from '@repo/shared/config/pricing'
import { useDynamicPricing } from '@/hooks/use-dynamic-pricing'
import { 
	Crown, 
	Loader2, 
	Shield, 
	Star,
	TrendingUp,
	Users,
	CheckCircle2,
	ArrowRight,
	Sparkles,
	Target,
	Award,
	Rocket,
	BarChart3,
	Heart,
	Clock
} from 'lucide-react'
import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { useMutation } from '@tanstack/react-query'

interface StripePricingSectionProps {
	className?: string
	showStats?: boolean
	compactView?: boolean
}

// Icon mapping for different plan types
const planIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
	'freetrial': Heart,
	'starter': Rocket,
	'growth': BarChart3,
	'max': Crown
}

// Tier mapping for styling consistency
const planTierMap: Record<string, string> = {
	'freetrial': 'starter',
	'starter': 'professional',
	'growth': 'enterprise', 
	'max': 'ultimate'
}

// Popular plan mapping
const popularPlans = ['growth']

// CTA text mapping
const planCtaMap: Record<string, string> = {
	'freetrial': 'Start Free Trial',
	'starter': 'Choose Starter',
	'growth': 'Choose Growth',
	'max': 'Contact Sales'
}

// Highlight text mapping
const planHighlightMap: Record<string, string> = {
	'freetrial': 'Most loved by beginners',
	'starter': 'Save 4 hours/week on average',
	'growth': 'Most popular choice',
	'max': 'For portfolio managers'
}

// Enhanced UI data for pricing display
interface PricingUIData {
	icon: React.ComponentType<{ className?: string }>
	popular: boolean
	tier: string
	tagline: string
	enhanced_features: Array<{ text: string; highlight: boolean }>
	benefits: string[]
	cta: string
	highlight: string
	monthlySavings: number
	yearlySavings: number
	savingsPercentage: number
	formattedPrice: string
	fullYearPrice: string
}


export function StripePricingSection({ 
	className,
	showStats = true,
	compactView = false
}: StripePricingSectionProps) {
	const [isYearly, setIsYearly] = useState(false)
	
	// Use dynamic pricing with fallback
	const { plans: dynamicPlans, loading: pricingLoading, error: pricingError } = useDynamicPricing()
	const fallbackPlans = Object.values(PRICING_PLANS)

	// Determine which plans to use: dynamic if available, fallback otherwise
	const activePlans = dynamicPlans.length > 0 ? dynamicPlans : fallbackPlans

	// Calculate savings and format pricing - MOVED UP TO FIX HOOKS RULES
	const pricingData = useMemo((): (PricingUIData & { name: string; planId: string })[] => {
		return activePlans.map((plan): PricingUIData & { name: string; planId: string } => {
			if (!plan.price) return { 
				name: plan.name || '',
				planId: plan.planId,
				icon: planIconMap[plan.planId] || Rocket,
				popular: popularPlans.includes(plan.planId),
				tier: planTierMap[plan.planId] || 'standard',
				tagline: plan.description || '',
				enhanced_features: plan.features.map(f => ({ text: f, highlight: false })),
				benefits: [],
				cta: planCtaMap[plan.planId] || 'Get Started',
				highlight: planHighlightMap[plan.planId] || '',
				monthlySavings: 0, 
				yearlySavings: 0, 
				savingsPercentage: 0,
				formattedPrice: '$0',
				fullYearPrice: '$0'
			}
			
			const monthlyPrice = plan.price.monthly / 100
			const yearlyPrice = plan.price.annual / 100
			const monthlySavings = monthlyPrice * 12 - yearlyPrice
			const savingsPercentage = Math.round((monthlySavings / (monthlyPrice * 12)) * 100)
			
			// Get UI enhancement data dynamically based on plan ID
			const icon = planIconMap[plan.planId] || Rocket
			const tier = planTierMap[plan.planId] || 'standard'
			const popular = popularPlans.includes(plan.planId)
			const cta = planCtaMap[plan.planId] || 'Get Started'
			const highlight = planHighlightMap[plan.planId] || ''
			
			return {
				...plan,
				icon,
				popular,
				tier,
				tagline: plan.description || '',
				enhanced_features: plan.features.map(f => ({ text: f, highlight: false })),
				benefits: [],
				cta,
				highlight,
				name: plan.name || '',
				planId: plan.planId,
				monthlySavings,
				yearlySavings: yearlyPrice,
				savingsPercentage,
				formattedPrice: isYearly 
					? `$${Math.floor(yearlyPrice / 12)}`
					: `$${monthlyPrice}`,
				fullYearPrice: `$${yearlyPrice}`
			}
		})
	}, [activePlans, isYearly])

	const subscriptionMutation = useMutation({
		mutationFn: async (planId: string) => {
			if (planId === 'freetrial') {
				// Handle free trial
				window.location.href = '/auth/register'
				return { success: true }
			}

			if (planId === 'max') {
				// Handle enterprise contact
				window.location.href = '/contact'
				return { success: true }
			}

			// Check rate limiting
			if (!checkoutRateLimiter.canMakeRequest()) {
				throw new Error('Too many requests. Please wait a moment before trying again.')
			}

			// Check if user is authenticated with Supabase
			const isAuthenticated = await isUserAuthenticated()
			if (!isAuthenticated) {
				window.location.href = '/auth/login'
				throw new Error('Please sign in to subscribe to a plan')
			}

			// Validate plan exists in our pricing data
			const selectedPlan = activePlans.find(p => p.planId === planId)
			if (!selectedPlan) {
				throw new Error(`Invalid plan selected: ${planId}`)
			}

			// Get the appropriate Stripe price ID for the selected plan and billing period
			const stripePriceId = selectedPlan.stripePriceIds?.[isYearly ? 'annual' : 'monthly']
			if (!stripePriceId) {
				throw new Error(`No ${isYearly ? 'annual' : 'monthly'} price configured for ${planId} plan`)
			}

			// Show loading toast
			toast.loading('Creating checkout session...', { id: 'checkout' })

			// Create checkout session via Supabase Edge Function
			const checkoutData = {
				priceId: stripePriceId,
				planName: selectedPlan.name,
				description: selectedPlan.description
			}

			const { url } = await createCheckoutSession(checkoutData)

			// Update toast to success
			toast.success('Redirecting to checkout...', { id: 'checkout' })

			// Redirect to Stripe Checkout
			window.location.href = url

			return { success: true }
		},
		onError: (error) => {
			console.error('Subscription error:', error)
			// Show error toast
			toast.error(
				`Failed to start checkout: ${error instanceof Error ? error.message : 'Unknown error'}`,
				{ id: 'checkout' }
			)
		}
	})

	const handleSubscribe = async (planId: string) => {
		subscriptionMutation.mutate(planId)
	}

	// Show loading state while fetching dynamic pricing
	if (pricingLoading && dynamicPlans.length === 0) {
		return (
			<div className="container py-24 text-center">
				<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary">
					<Loader2 className="w-4 h-4 animate-spin" />
					Loading pricing...
				</div>
			</div>
		)
	}
	
	// Show error state with fallback
	if (pricingError && dynamicPlans.length === 0) {
		console.warn('Dynamic pricing failed, using fallback:', pricingError)
	}

	return (
		<section
			className={cn(
				'relative py-24 bg-gradient-to-br from-background via-muted/5 to-background',
				'before:absolute before:inset-0 before:bg-gradient-to-r before:from-primary/5 before:via-transparent before:to-primary/5 before:opacity-50',
				compactView && 'py-16',
				animationClasses('fade-in'),
				className
			)}
		>
			<div className="relative container px-4 mx-auto">
				{/* Section Header */}
				<div className={cn("text-center max-w-6xl mx-auto", compactView ? "mb-16" : "mb-24", animationClasses('slide-down'))}>
					{/* Enhanced Stats Bar */}
					{showStats && (
						<div 
							className="flex flex-wrap items-center justify-center gap-8 mb-12 p-6 bg-white/50 dark:bg-gray-900/30 rounded-2xl border border-primary/10 backdrop-blur-sm"
							style={{
								boxShadow: 'var(--shadow-sm)'
							}}
						>
							<div className="flex items-center gap-3">
								<div className="p-2 bg-primary/10 rounded-lg">
									<Users className="h-5 w-5 text-primary" />
								</div>
								<div>
									<p className="font-bold text-lg text-foreground">10,000+</p>
									<p className="text-sm text-muted-foreground">Property Managers</p>
								</div>
							</div>
							<div className="flex items-center gap-3">
								<div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
									<TrendingUp className="h-5 w-5 text-green-600" />
								</div>
								<div>
									<p className="font-bold text-lg text-foreground">99.9%</p>
									<p className="text-sm text-muted-foreground">Uptime SLA</p>
								</div>
							</div>
							<div className="flex items-center gap-3">
								<div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
									<Target className="h-5 w-5 text-blue-600" />
								</div>
								<div>
									<p className="font-bold text-lg text-foreground">$50M+</p>
									<p className="text-sm text-muted-foreground">Rent Collected</p>
								</div>
							</div>
							<div className="flex items-center gap-3">
								<div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
									<Award className="h-5 w-5 text-purple-600" />
								</div>
								<div>
									<p className="font-bold text-lg text-foreground">4.9/5</p>
									<p className="text-sm text-muted-foreground">Customer Rating</p>
								</div>
							</div>
						</div>
					)}
					
					<div className="mb-6">
						<Badge 
							variant="outline" 
							className={cn(
								badgeClasses('outline', 'default'),
								"mb-4 px-4 py-2 text-sm font-semibold border-2 hover:bg-primary/5 hover:border-primary/30 transition-all hover:scale-105"
							)}
							style={{
								transition: `all ${ANIMATION_DURATIONS.fast} ease-out`
							}}
						>
							<Sparkles className="w-4 h-4 me-2 text-primary" />
							Choose Your Plan
						</Badge>
					</div>

					<div className="mb-8">
						<h2 
							className="font-bold tracking-tight mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent"
							style={{
								fontSize: compactView ? TYPOGRAPHY_SCALE['display-xl'].fontSize : TYPOGRAPHY_SCALE['display-lg'].fontSize,
								lineHeight: compactView ? TYPOGRAPHY_SCALE['display-xl'].lineHeight : TYPOGRAPHY_SCALE['display-lg'].lineHeight,
								fontWeight: TYPOGRAPHY_SCALE['display-lg'].fontWeight,
								letterSpacing: TYPOGRAPHY_SCALE['display-lg'].letterSpacing
							}}
						>
							Simple, transparent pricing
							<span 
								className="block text-primary font-medium mt-3"
								style={{
									fontSize: compactView ? TYPOGRAPHY_SCALE['heading-md'].fontSize : TYPOGRAPHY_SCALE['heading-lg'].fontSize,
									lineHeight: compactView ? TYPOGRAPHY_SCALE['heading-md'].lineHeight : TYPOGRAPHY_SCALE['heading-lg'].lineHeight
								}}
							>
								that scales with your portfolio
							</span>
						</h2>
					</div>

					<div className="mb-8">
						<p 
							className="text-muted-foreground leading-relaxed max-w-2xl mx-auto"
							style={{
								fontSize: TYPOGRAPHY_SCALE['body-lg'].fontSize,
								lineHeight: TYPOGRAPHY_SCALE['body-lg'].lineHeight
							}}
						>
							Start with our 14-day free trial. No credit card required. Cancel
							anytime.
						</p>
					</div>

					{/* Billing Toggle */}
					<div 
						className="bg-muted/30 rounded-2xl p-6 border-2 border-muted/50"
						style={{
							animation: `slideInFromBottom ${ANIMATION_DURATIONS.default} ease-out`,
							transition: `all ${ANIMATION_DURATIONS.fast} ease-out`
						}}
					>
						<div className="flex items-center justify-center gap-6 mb-3">
							<span
								className={cn(
									'text-sm font-semibold transition-all',
									!isYearly ? 'text-foreground' : 'text-muted-foreground'
								)}
								style={{
									transition: `all ${ANIMATION_DURATIONS.fast} ease-out`
								}}
							>
								Monthly
							</span>
							<Switch
								checked={isYearly}
								onCheckedChange={setIsYearly}
								className="data-[state=checked]:bg-primary scale-110"
								style={{
									transition: `all ${ANIMATION_DURATIONS.fast} ease-out`
								}}
							/>
							<span
								className={cn(
									'text-sm font-semibold transition-all',
									isYearly ? 'text-foreground' : 'text-muted-foreground'
								)}
								style={{
									transition: `all ${ANIMATION_DURATIONS.fast} ease-out`
								}}
							>
								Yearly
							</span>
							<Badge
								variant="secondary"
								className="ms-2 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-semibold px-3 py-1 hover:scale-105"
								style={{
									transition: `all ${ANIMATION_DURATIONS.fast} ease-out`
								}}
							>
								<Star className="w-3 h-3 mr-1" />
								Save 17%
							</Badge>
						</div>
						<div className="flex items-center justify-center gap-2">
							<Shield className="w-3 h-3 text-blue-600 dark:text-blue-400" />
							<p className="text-xs text-muted-foreground font-medium">
								All plans include a 14-day free trial
							</p>
						</div>
					</div>
				</div>

				{/* Enhanced Pricing Grid */}
				<div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-20">
					{pricingData.map((plan, index) => (
						<div key={index} className="relative group">
							<Card
								className={cn(
									'relative h-full transition-all',
									cardClasses(plan.popular ? 'premium' : 'interactive'),
									plan.popular
										? 'border-2 border-primary shadow-2xl scale-105 bg-gradient-to-br from-primary/5 via-background to-primary/10'
										: 'hover:scale-102 hover:shadow-xl',
									'overflow-hidden'
								)}
								style={{
									transition: `all ${ANIMATION_DURATIONS.default} cubic-bezier(0.4, 0, 0.2, 1)`,
									transform: plan.popular ? 'scale(1.05)' : undefined
								}}
							>
								{/* Popular Badge */}
								{plan.popular && (
									<div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
										<Badge className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-6 py-2 text-sm font-bold shadow-lg">
											<Star className="w-3 h-3 mr-1" />
											{plan.highlight}
										</Badge>
									</div>
								)}

								{/* Tier Badge */}
								<div className="absolute top-4 right-4">
									<Badge variant="outline" className={cn(
										"text-xs font-medium capitalize border-2",
										{
											'border-pink-200 bg-pink-50 text-pink-700 dark:border-pink-800 dark:bg-pink-900/20 dark:text-pink-300': plan.tier === 'starter',
											'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300': plan.tier === 'professional',
											'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-900/20 dark:text-purple-300': plan.tier === 'enterprise',
											'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300': plan.tier === 'ultimate'
										}
									)}>
										{plan.tier}
									</Badge>
								</div>

								<CardHeader className="text-center pb-6 pt-10 px-8">
									<div className="mb-6">
										<div
											className={cn(
												'w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center mx-auto mb-4',
												'shadow-lg ring-4 ring-background',
												{
													'from-pink-500 to-pink-600': plan.tier === 'starter',
													'from-blue-500 to-blue-600': plan.tier === 'professional', 
													'from-purple-500 to-purple-600': plan.tier === 'enterprise',
													'from-amber-500 to-amber-600': plan.tier === 'ultimate'
												}
											)}
										>
											<plan.icon
												className="w-8 h-8 text-white"
											/>
										</div>
									</div>

									<h3 
										className="font-bold mb-2 text-foreground"
										style={{
											fontSize: TYPOGRAPHY_SCALE['heading-lg'].fontSize,
											lineHeight: TYPOGRAPHY_SCALE['heading-lg'].lineHeight,
											fontWeight: TYPOGRAPHY_SCALE['heading-lg'].fontWeight
										}}
									>
										{plan.name}
									</h3>
									<p 
										className="text-muted-foreground mb-4 leading-relaxed"
										style={{
											fontSize: TYPOGRAPHY_SCALE['body-sm'].fontSize
										}}
									>
										{plan.tagline}
									</p>

									{/* Pricing Display */}
									<div className="space-y-2 mb-6">
										<div className="flex items-baseline justify-center gap-1">
											<span 
												className="font-black text-foreground"
												style={{
													fontSize: TYPOGRAPHY_SCALE['display-lg'].fontSize,
													lineHeight: TYPOGRAPHY_SCALE['display-lg'].lineHeight
												}}
											>
												{plan.formattedPrice}
											</span>
											<span className="text-muted-foreground text-sm font-medium">
												/month
											</span>
										</div>
										
										{isYearly && plan.yearlySavings > 0 && (
											<div className="flex items-center justify-center gap-2">
												<Badge variant="secondary" className="bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs">
													<Clock className="w-3 h-3 mr-1" />
													Save {plan.savingsPercentage}%
												</Badge>
												<span className="text-xs text-muted-foreground">
													{plan.fullYearPrice} annually
												</span>
											</div>
										)}
									</div>
									
									{/* Plan Highlight */}
									{plan.highlight && !plan.popular && (
										<Badge variant="outline" className="mb-4 text-xs font-medium">
											{plan.highlight}
										</Badge>
									)}
								</CardHeader>

								<CardContent className="px-8 pb-6">
									{/* Features List */}
									<ul className="space-y-4 mb-6">
										{plan.enhanced_features.map((feature, featureIndex) => (
											<li
												key={featureIndex}
												className="flex items-start text-sm"
											>
												<CheckCircle2 
													className={cn(
														"w-4 h-4 mt-0.5 mr-3 flex-shrink-0",
														feature.highlight 
															? "text-primary fill-primary/20" 
															: "text-green-500 fill-green-100 dark:fill-green-900/20"
													)} 
												/>
												<span 
													className={cn(
														feature.highlight 
															? "font-semibold text-foreground" 
															: "text-muted-foreground"
													)}
												>
													{feature.text}
												</span>
											</li>
										))}
									</ul>

									{/* Benefits */}
									{plan.benefits && (
										<div className="bg-muted/30 rounded-xl p-4 mb-6 border">
											<h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
												<Sparkles className="w-4 h-4 text-primary" />
												Why choose this plan?
											</h4>
											<ul className="space-y-2">
												{plan.benefits.map((benefit, benefitIndex) => (
													<li key={benefitIndex} className="text-xs text-muted-foreground flex items-center gap-2">
														<div className="w-1 h-1 bg-primary rounded-full" />
														{benefit}
													</li>
												))}
											</ul>
										</div>
									)}
								</CardContent>

								<CardFooter className="px-8 pb-8">
									{plan.popular ? (
										<Button
											className={cn(
												"w-full h-14 text-base font-bold",
												"bg-gradient-to-r from-primary via-primary to-primary/90",
												"hover:from-primary/90 hover:via-primary/95 hover:to-primary/80",
												"shadow-lg hover:shadow-xl",
												"transform hover:scale-[1.02] active:scale-[0.98]"
											)}
											disabled={subscriptionMutation.isPending}
											onClick={() => handleSubscribe(plan.planId!)}
											style={{
												transition: `all ${ANIMATION_DURATIONS.fast} cubic-bezier(0.4, 0, 0.2, 1)`
											}}
										>
											{subscriptionMutation.isPending ? (
												<>
													<Loader2 className="w-5 h-5 mr-2 animate-spin" />
													Processing...
												</>
											) : (
												<>
													<Rocket className="w-5 h-5 mr-2" />
													{plan.cta}
													<ArrowRight className="w-4 h-4 ml-2" />
												</>
											)}
										</Button>
									) : (
										<Button
											variant={plan.planId === 'max' ? 'outline' : 'default'}
											className={cn(
												"w-full h-12 text-base font-semibold",
												plan.planId === 'max'
													? "border-2 hover:bg-primary hover:text-primary-foreground"
													: "hover:scale-[1.02]"
											)}
											disabled={subscriptionMutation.isPending}
											onClick={() => handleSubscribe(plan.planId!)}
											style={{
												transition: `all ${ANIMATION_DURATIONS.fast} cubic-bezier(0.4, 0, 0.2, 1)`
											}}
										>
											{subscriptionMutation.isPending ? (
												<>
													<Loader2 className="w-4 h-4 mr-2 animate-spin" />
													Loading...
												</>
											) : (
												<>
													{plan.cta}
													<ArrowRight className="w-4 h-4 ml-2" />
												</>
											)}
										</Button>
									)}
								</CardFooter>
							</Card>
						</div>
					))}
				</div>

				{/* Enhanced Trust Signals */}
				<div className="bg-gradient-to-r from-muted/20 via-background to-muted/20 rounded-3xl p-8 border border-muted/40">
					<div className="text-center max-w-4xl mx-auto">
						{/* Trust Badges */}
						<div className="flex flex-wrap items-center justify-center gap-4 mb-8">
							<Badge 
								variant="secondary" 
								className={cn(
									badgeClasses('success', 'lg'),
									"bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 px-6 py-3 hover:scale-105"
								)}
								style={{
									transition: `all ${ANIMATION_DURATIONS.fast} ease-out`
								}}
							>
								<CheckCircle2 className="w-5 h-5 mr-2" />
								14-Day Free Trial
							</Badge>
							<Badge 
								variant="secondary" 
								className={cn(
									badgeClasses('secondary', 'lg'),
									"bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 px-6 py-3 hover:scale-105"
								)}
								style={{
									transition: `all ${ANIMATION_DURATIONS.fast} ease-out`
								}}
							>
								<Shield className="w-5 h-5 mr-2" />
								No Credit Card Required
							</Badge>
							<Badge 
								variant="secondary" 
								className={cn(
									badgeClasses('outline', 'lg'),
									"hover:bg-primary/5 hover:border-primary/30 px-6 py-3 hover:scale-105"
								)}
								style={{
									transition: `all ${ANIMATION_DURATIONS.fast} ease-out`
								}}
							>
								<Heart className="w-5 h-5 mr-2" />
								Cancel Anytime
							</Badge>
							<Badge 
								variant="secondary" 
								className={cn(
									badgeClasses('success', 'lg'),
									"bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 px-6 py-3 hover:scale-105"
								)}
								style={{
									transition: `all ${ANIMATION_DURATIONS.fast} ease-out`
								}}
							>
								<Award className="w-5 h-5 mr-2" />
								SOC 2 Compliant
							</Badge>
						</div>

						{/* Support Section */}
						<div className="space-y-6">
							<div>
								<h3 
									className="font-bold text-foreground mb-2"
									style={{
										fontSize: TYPOGRAPHY_SCALE['heading-md'].fontSize,
										lineHeight: TYPOGRAPHY_SCALE['heading-md'].lineHeight,
										fontWeight: TYPOGRAPHY_SCALE['heading-md'].fontWeight
									}}
								>
									Questions about our pricing?
								</h3>
								<p 
									className="text-muted-foreground leading-relaxed max-w-2xl mx-auto"
									style={{
										fontSize: TYPOGRAPHY_SCALE['body-lg'].fontSize,
										lineHeight: TYPOGRAPHY_SCALE['body-lg'].lineHeight
									}}
								>
									Our team is here to help you choose the perfect plan for your property management needs.
								</p>
							</div>
							
							<div className="flex flex-col sm:flex-row items-center justify-center gap-4">
								<Button 
									variant="outline"
									className={cn(
										buttonClasses('outline', 'lg'),
										"h-12 px-8 text-base font-semibold border-2 hover:bg-primary hover:text-primary-foreground hover:scale-105"
									)}
									style={{
										transition: `all ${ANIMATION_DURATIONS.fast} ease-out`
									}}
								>
									<Target className="w-5 h-5 mr-2" />
									View FAQ
								</Button>
								<Button 
									variant="ghost"
									className={cn(
										buttonClasses('ghost', 'lg'),
										"h-12 px-8 text-base font-semibold hover:bg-muted hover:scale-105"
									)}
									style={{
										transition: `all ${ANIMATION_DURATIONS.fast} ease-out`
									}}
								>
									<Users className="w-5 h-5 mr-2" />
									Contact Support
								</Button>
							</div>

							{/* Additional Trust Signals */}
							<div className="pt-6 border-t border-muted/40">
								<div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
									<div className="flex items-center gap-2">
										<CheckCircle2 className="w-4 h-4 text-green-600" />
										<span className="font-medium">30-day money-back guarantee</span>
									</div>
									<div className="flex items-center gap-2">
										<Shield className="w-4 h-4 text-blue-600" />
										<span className="font-medium">Enterprise-grade security</span>
									</div>
									<div className="flex items-center gap-2">
										<Award className="w-4 h-4 text-purple-600" />
										<span className="font-medium">99.9% customer satisfaction</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}
