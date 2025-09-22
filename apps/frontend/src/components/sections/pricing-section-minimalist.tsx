import { BlurFade } from '@/components/magicui/blur-fade'
import { BorderBeam } from '@/components/magicui/border-beam'
import { MagicCard } from '@/components/magicui/magic-card'
import { cn } from '@/lib/utils'
import { useSpring } from '@react-spring/core'
import { animated } from '@react-spring/web'
import { ArrowRight, Check, Crown, Shield, Zap } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../ui/button'

interface MinimalistPricingSectionProps {
	className?: string
}

const plans = [
	{
		name: 'Starter',
		price: 29,
		description: 'Perfect for small property managers',
		icon: Zap,
		gradient: 'from-[var(--color-accent-50)] to-[var(--color-accent-main)]',
		features: [
			'Up to 5 properties',
			'Professional tenant management',
			'Maintenance tracking',
			'Priority email support'
		]
	},
	{
		name: 'Growth',
		price: 79,
		description: 'For expanding property portfolios',
		icon: Shield,
		gradient: 'from-[var(--color-accent-50)] to-[var(--color-primary-brand)]',
		features: [
			'Up to 20 properties',
			'Advanced analytics & insights',
			'Automated workflows',
			'Phone & email support',
			'API access'
		],
		popular: true
	},
	{
		name: 'TenantFlow Max',
		price: 299,
		description: 'Enterprise features for serious professionals',
		icon: Crown,
		gradient:
			'from-[var(--color-system-green-50)] to-[var(--color-system-green)]',
		features: [
			'Unlimited properties',
			'White-label portal',
			'Custom integrations',
			'Dedicated account manager',
			'24/7 priority support'
		]
	}
]

export function MinimalistPricingSection({
	className
}: MinimalistPricingSectionProps) {
	const [hoveredCard, setHoveredCard] = useState<number | null>(null)

	const headerSpring = useSpring({
		from: { opacity: 0, y: 30 },
		to: { opacity: 1, y: 0 },
		config: { tension: 200, friction: 25 },
		delay: 100
	})

	return (
		<section className={cn('section-hero lg:py-32 bg-background', className)}>
			<div className="container px-4 mx-auto">
				<div className="max-w-6xl mx-auto">
					{/* Section Header */}
					<animated.div style={headerSpring} className="text-center mb-20">
						<BlurFade delay={0.1} inView>
							<h2 className="text-3xl sm:text-4xl lg:text-6xl font-medium mb-6 text-gradient">
								Simple pricing.
								<br />
								<span className="text-gradient">No surprises.</span>
							</h2>
						</BlurFade>

						<BlurFade delay={0.2} inView>
							<p className="text-xl text-muted-foreground max-w-2xl mx-auto font-light leading-relaxed">
								Choose the plan that fits your portfolio size. Upgrade or
								downgrade anytime.
							</p>
						</BlurFade>
					</animated.div>

					{/* Pricing Grid */}
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
						{plans.map((plan, index) => {
							const IconComponent = plan.icon

							return (
								<BlurFade key={index} delay={0.1 + index * 0.1} inView>
									<div
										className={cn(
											'transition-all duration-300',
											hoveredCard === index
												? 'scale-[1.02] -translate-y-2'
												: 'scale-100 translate-y-0'
										)}
										onMouseEnter={() => setHoveredCard(index)}
										onMouseLeave={() => setHoveredCard(null)}
									>
										<MagicCard
											className={cn(
												'relative card-padding transition-all duration-500 group cursor-pointer',
												plan.popular
													? 'border-2 border-primary/30 shadow-xl'
													: 'border border-border'
											)}
											gradientColor={
												plan.popular
													? 'hsl(var(--primary))'
													: 'hsl(var(--muted-foreground))'
											}
										>
											{plan.popular && (
												<>
													<BorderBeam size={250} duration={12} delay={9} />
													<div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
														<div
															className={`bg-gradient-to-r ${plan.gradient} text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg`}
														>
															Most Popular
														</div>
													</div>
												</>
											)}

											<div className="text-center mb-8">
												{/* Plan Icon */}
												<div
													className={`inline-flex p-3 rounded-2xl bg-gradient-to-r ${plan.gradient} mb-4`}
												>
													<IconComponent className="w-6 h-6 text-white" />
												</div>

												<h3 className="text-2xl font-bold text-foreground mb-2">
													{plan.name}
												</h3>
												<p className="text-muted-foreground text-sm mb-6">
													{plan.description}
												</p>

												<div className="mb-6">
													{plan.price ? (
														<div className="flex items-baseline justify-center gap-1">
															<span
																className={`text-5xl font-black bg-gradient-to-r ${plan.gradient} bg-clip-text text-transparent`}
															>
																${plan.price}
															</span>
															<span className="text-muted-foreground text-lg">
																/month
															</span>
														</div>
													) : (
														<div
															className={`text-5xl font-black bg-gradient-to-r ${plan.gradient} bg-clip-text text-transparent`}
														>
															Custom
														</div>
													)}
												</div>
											</div>

											<ul className="space-y-4 mb-8">
												{plan.features.map((feature, featureIndex) => (
													<BlurFade
														key={featureIndex}
														delay={0.3 + featureIndex * 0.1}
														inView
													>
														<li className="flex items-center gap-3">
															<div
																className={`p-1 rounded-full bg-gradient-to-r ${plan.gradient}`}
															>
																<Check className="w-3 h-3 text-white" />
															</div>
															<span className="text-foreground font-medium">
																{feature}
															</span>
														</li>
													</BlurFade>
												))}
											</ul>

											{plan.popular ? (
												<Button className="w-full h-12 text-base font-bold bg-gradient-to-r from-primary to-accent text-primary-foreground">
													<ArrowRight className="w-5 h-5 mr-2" />
													{plan.price ? 'Start free trial' : 'Contact sales'}
												</Button>
											) : (
												<button
													className={`w-full h-12 font-bold rounded-lg transition-all duration-300 bg-gradient-to-r ${plan.gradient} text-white hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]`}
												>
													{plan.price ? 'Start free trial' : 'Contact sales'}
												</button>
											)}
										</MagicCard>
									</div>
								</BlurFade>
							)
						})}
					</div>

					{/* Bottom Text */}
					<BlurFade delay={0.5} inView>
						<div className="text-center mt-16">
							<p className="text-muted-foreground text-sm">
								All plans include a 14-day free trial. No credit card required.
							</p>
						</div>
					</BlurFade>
				</div>
			</div>
		</section>
	)
}
