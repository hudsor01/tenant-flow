'use client'

import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import {
	ArrowRight,
	Award,
	Building,
	Check,
	Crown,
	Shield,
	Sparkles,
	Star,
	Users,
	Zap
} from 'lucide-react'
import { useState } from 'react'

interface SaasPricingSectionProps {
	className?: string
}

const pricingPlans = [
	{
		name: 'Starter',
		description: 'Perfect for individual property owners and small portfolios',
		icon: Building,
		monthlyPrice: 29,
		yearlyPrice: 290,
		badge: 'Most Popular for Individuals',
		valueProp: 'Everything you need to manage properties professionally',
		features: [
			'Up to 10 properties',
			'Advanced tenant screening with background checks',
			'Automated rent collection with late fee automation',
			'Smart maintenance routing with vendor management',
			'Financial reporting with profit & loss statements',
			'Mobile app with push notifications',
			'Email support with 24h response time',
			'Basic lease document generation',
			'Tenant communication portal'
		],
		limitations: [],
		cta: 'Start free trial',
		popular: false,
		highlight: 'Save $58/year'
	},
	{
		name: 'Professional',
		description: 'Ideal for growing property management businesses',
		icon: Zap,
		monthlyPrice: 99,
		yearlyPrice: 990,
		badge: 'Most Popular for Teams',
		valueProp: 'Scale your business with advanced automation and insights',
		features: [
			'Up to 100 properties with unlimited units',
			'AI-powered tenant screening with risk assessment',
			'Automated rent collection with payment plans',
			'Smart maintenance with predictive scheduling',
			'Advanced financial analytics with forecasting',
			'Custom lease templates with e-signature',
			'Priority phone & chat support',
			'White-label tenant portal with branding',
			'API access with webhooks',
			'Multi-user accounts with role permissions',
			'Integration with accounting software',
			'Advanced reporting with custom dashboards'
		],
		limitations: [],
		cta: 'Start free trial',
		popular: true,
		highlight: 'Save $198/year'
	},
	{
		name: 'Enterprise',
		description: 'For large-scale property management companies',
		icon: Crown,
		monthlyPrice: 299,
		yearlyPrice: 2990,
		badge: 'Built for Scale',
		valueProp: 'Enterprise-grade solution with dedicated support',
		features: [
			'Unlimited properties and units',
			'Multi-location management with regional teams',
			'Advanced workflow automation with custom rules',
			'Predictive analytics with AI insights',
			'Custom integrations with any third-party system',
			'Dedicated account manager with quarterly reviews',
			'24/7 phone & live chat support',
			'SOC 2 Type II compliance with annual audits',
			'Single sign-on (SSO) with SAML',
			'Custom training sessions and onboarding',
			'Advanced security with end-to-end encryption',
			'Custom feature development',
			'Priority feature requests',
			'On-premise deployment options'
		],
		limitations: [],
		cta: 'Contact sales',
		popular: false,
		highlight: 'Custom pricing available'
	}
]

const enterpriseFeatures = [
	'Volume discounts with custom pricing tiers',
	'Custom SLA agreements with guaranteed uptime',
	'On-premise or hybrid deployment options',
	'Custom feature development and integrations',
	'Priority feature requests and roadmap influence',
	'Dedicated infrastructure with performance guarantees',
	'Advanced security with custom compliance requirements',
	'Custom training programs and certification',
	'Migration assistance from legacy systems',
	'Data export and backup solutions'
]

const trustIndicators = [
	{ icon: Shield, text: 'SOC 2 Type II Compliant', color: 'text-green-600' },
	{ icon: Users, text: '10,000+ Properties Managed', color: 'text-blue-600' },
	{ icon: Award, text: 'G2 Leader in PropTech', color: 'text-purple-600' },
	{ icon: Star, text: '4.9/5 Customer Rating', color: 'text-yellow-600' }
]

export function SaasPricingSection({ className }: SaasPricingSectionProps) {
	const [isYearly, setIsYearly] = useState(false)

	return (
		<section
			className={cn('relative py-32 surface-glow overflow-hidden', className)}
		>
			{/* Sophisticated neutral background elements */}
			<div className="absolute inset-0 bg-neutral-gradient opacity-20 dark:opacity-10" />
			<div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] bg-charcoal-subtle rounded-full blur-3xl animate-pulse-glow opacity-30" />

			<div className="container relative px-4 mx-auto max-w-7xl">
				{/* Enhanced Premium Section Header */}
				<div className="text-center max-w-4xl mx-auto mb-20">
					<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-slate-50 to-stone-50 dark:from-slate-900/50 dark:to-stone-900/50 border border-slate-200/50 dark:border-slate-700/50 mb-8 animate-fade-in-up">
						<Sparkles className="w-4 h-4 text-slate-600 animate-spin-around" />
						<span className="text-sm font-medium text-slate-700 dark:text-slate-300">
							Trusted by 10,000+ property managers
						</span>
					</div>

					
						<h2 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6 animate-fade-in-scale">
							<span className="text-slate-800 dark:text-slate-200">Simple pricing,</span>
							<br />
							<span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
								extraordinary results
							</span>
						</h2>
					

					
						<p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed mb-12 max-w-3xl mx-auto animate-slide-up">
							Join thousands of property managers who have transformed their
							business with our all-in-one platform. Start free, scale
							effortlessly.
						</p>
					
				</div>

				{/* Enhanced Premium Pricing Grid */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-20">
					{pricingPlans.map((plan, index) => (
						<div
							key={index}
							className={cn(
								'relative h-full transition-all duration-500 hover:scale-[1.02] group gpu-accelerated',
								plan.popular ? 'card-elevated-gradient' : 'card-glass'
							)}
						>
								{plan.popular && (
									<div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10 animate-bounce-in">
										<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 shadow-lg shadow-blue-500/30 animate-pulse-glow">
											<Sparkles className="w-3 h-3" />
											{plan.badge}
										</div>
									</div>
								)}

								<div className="p-8">
									<div className="text-center pb-8 pt-8">
										<div className="mb-6">
											<div
												className={cn(
													'w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3',
													plan.popular
														? 'bg-gradient-to-br from-blue-500 to-purple-500 shadow-lg shadow-blue-500/25 animate-rippling'
														: 'bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 animate-scale-in'
												)}
											>
												<plan.icon
													className={cn(
														'w-8 h-8 transition-colors duration-300',
														plan.popular
															? 'text-white'
															: 'text-slate-600 dark:text-slate-300'
													)}
												/>
											</div>
										</div>

										<h3 className="text-2xl font-bold mb-2 text-gradient-primary">
											{plan.name}
										</h3>
										<p className="text-slate-600 dark:text-slate-400 text-sm mb-4 leading-relaxed">
											{plan.description}
										</p>

										{plan.valueProp && (
											<p className="text-blue-600 dark:text-blue-400 text-sm font-medium mb-6 italic animate-fade-in">
												"{plan.valueProp}"
											</p>
										)}

										<div className="space-y-2">
											<div className="flex items-baseline justify-center gap-2">
												<span className="text-5xl font-bold text-gradient-dominance">
													$
													{isYearly
														? Math.floor(plan.yearlyPrice / 12)
														: plan.monthlyPrice}
												</span>
												<span className="text-slate-500 dark:text-slate-400 text-lg">
													/month
												</span>
											</div>
											{isYearly && (
												<div className="text-sm text-slate-600 dark:text-slate-400 animate-slide-down">
													${plan.yearlyPrice} billed annually
													<span className="text-green-600 dark:text-green-400 font-medium ml-1 bg-green-50 dark:bg-green-950/30 px-2 py-1 rounded-full">
														{plan.highlight}
													</span>
												</div>
											)}
										</div>
									</div>

									<div className="px-8 pb-8">
										<ul className="space-y-4 mb-8">
											{plan.features
												.slice(0, 6)
												.map((feature, featureIndex) => (
													<li
														key={featureIndex}
														className="flex items-start text-sm animate-fade-in-up"
														style={{ animationDelay: `${featureIndex * 0.1}s` }}
													>
														<div className="w-5 h-5 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 flex items-center justify-center mr-3 flex-shrink-0 mt-0.5 animate-scale-in shadow-sm">
															<Check className="w-3 h-3 text-white" />
														</div>
														<span className="text-slate-700 dark:text-slate-300 leading-relaxed">
															{feature}
														</span>
													</li>
												))}
											{plan.features.length > 6 && (
												<li className="text-sm text-slate-500 dark:text-slate-400 italic animate-fade-in">
													+{plan.features.length - 6} more features
												</li>
											)}
										</ul>
									</div>

									<div className="px-8 pb-8">
										{plan.popular ? (
											<Button className="w-full h-12 text-white font-semibold text-base shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300 animate-bounce-in bg-gradient-to-r from-blue-500 to-purple-600">
												{plan.cta}
												<ArrowRight className="w-4 h-4 ml-2" />
											</Button>
										) : (
											<button
												className={cn(
													'w-full h-12 text-base font-semibold transition-all duration-300 rounded-lg animate-scale-in',
													plan.name === 'Enterprise'
														? 'button-secondary border-2 border-slate-300 dark:border-slate-600 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/50'
														: 'button-primary shadow-lg hover:shadow-xl'
												)}
											>
												{plan.cta}
												{plan.name !== 'Enterprise' && (
													<ArrowRight className="w-4 h-4 ml-2" />
												)}
											</button>
										)}
									</div>
								</div>
							</div>
						
					))}
				</div>

				{/* Enhanced Premium Billing Toggle */}
				
					<div className="flex items-center justify-center gap-6 mb-4 animate-slide-up">
						<span
							className={cn(
								'text-lg font-medium transition-colors duration-300',
								!isYearly
									? 'text-gradient-primary'
									: 'text-slate-500 dark:text-slate-400'
							)}
						>
							Monthly
						</span>
						<div className="relative">
							<Switch
								checked={isYearly}
								onCheckedChange={setIsYearly}
								className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-500 data-[state=checked]:to-purple-500 animate-scale-in"
							/>
							<div className="absolute -top-8 left-1/2 -translate-x-1/2 animate-bounce-in">
								<div className="badge-success px-3 py-1 text-xs font-medium animate-pulse-glow">
									Save up to 17%
								</div>
							</div>
						</div>
						<span
							className={cn(
								'text-lg font-medium transition-colors duration-300',
								isYearly
									? 'text-gradient-primary'
									: 'text-slate-500 dark:text-slate-400'
							)}
						>
							Yearly
						</span>
					</div>
					<p className="text-sm text-slate-500 dark:text-slate-400 animate-fade-in">
						14-day free trial • No credit card required • Cancel anytime
					</p>
				

				{/* Enhanced Premium Trust Indicators */}
				
					<div className="text-center mb-20">
						<div className="flex flex-wrap items-center justify-center gap-8 mb-12">
							{trustIndicators.map((indicator, index) => (
								<div
									key={index}
									className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-white/80 to-slate-50/80 dark:from-slate-800/80 dark:to-slate-700/80 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 animate-fade-in-up hover:scale-105 transition-all duration-300 shadow-sm"
									style={{ animationDelay: `${index * 0.1}s` }}
								>
									<div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center shadow-sm">
										<indicator.icon className="w-3 h-3 text-white animate-spin-around" />
									</div>
									<span className="text-sm font-medium text-gradient-primary">
										{indicator.text}
									</span>
								</div>
							))}
						</div>
					</div>
				

				{/* Enhanced Premium Enterprise Features */}
				
					<div className="surface-glow rounded-3xl border border-slate-200/50 dark:border-slate-700/50 p-12 mb-20 animate-zoom-in">
						<div className="text-center mb-12">
							<div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/25 animate-rippling">
								<Crown className="w-10 h-10 text-white animate-bounce-in" />
							</div>
							<h3 className="text-3xl font-bold mb-4 text-gradient-premium">
								Enterprise Benefits
							</h3>
							<p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto animate-slide-up">
								Additional features and support for enterprise customers who
								need more
							</p>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
							{enterpriseFeatures.map((feature, index) => (
								<div
									key={index}
									className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/30 dark:to-purple-950/30 backdrop-blur-sm animate-fade-in-up hover:scale-105 transition-all duration-300 border border-blue-200/30 dark:border-blue-800/30 shadow-sm"
									style={{ animationDelay: `${index * 0.05}s` }}
								>
									<div className="w-5 h-5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0 mt-0.5 animate-scale-in shadow-sm">
										<Check className="w-3 h-3 text-white" />
									</div>
									<span className="text-slate-700 dark:text-slate-300 font-medium">
										{feature}
									</span>
								</div>
							))}
						</div>
					</div>
				

				{/* Enhanced FAQ Teaser */}
				
					<div className="text-center mt-16 animate-slide-up">
						<p className="text-muted-foreground mb-6 text-lg">
							Questions about our pricing?
						</p>
						<div className="flex flex-col sm:flex-row items-center justify-center gap-4">
							<button className="button-secondary button-lg animate-bounce-in">
								View FAQ
							</button>
							<button
								className="button-primary button-lg animate-bounce-in"
								style={{ animationDelay: '0.1s' }}
							>
								Contact support
							</button>
						</div>
					</div>
				

				{/* Enhanced Premium Final CTA */}
				
					<div className="text-center animate-zoom-in">
						<div className="surface-glow rounded-3xl border border-blue-200/50 dark:border-blue-800/50 p-12">
							<h3 className="text-3xl font-bold mb-4 text-gradient-energy">
								Ready to transform your property management?
							</h3>
							<p className="text-xl text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto animate-slide-up">
								Join thousands of property managers who have streamlined their
								operations and increased profitability
							</p>
							<div className="flex flex-col sm:flex-row items-center justify-center gap-4">
								<Button className="px-8 py-4 text-white font-semibold text-lg shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300 animate-rippling bg-gradient-to-r from-blue-500 to-purple-600">
									Start Your Free Trial
									<ArrowRight className="w-5 h-5 ml-2" />
								</Button>
								<button
									className="button-secondary px-8 py-4 text-lg animate-bounce-in"
									style={{ animationDelay: '0.2s' }}
								>
									Schedule a Demo
								</button>
							</div>
							<p className="text-sm text-slate-500 dark:text-slate-400 mt-6 animate-fade-in">
								No credit card required • 14-day free trial • Cancel anytime
							</p>
						</div>
					</div>
				
			</div>
		</section>
	)
}
