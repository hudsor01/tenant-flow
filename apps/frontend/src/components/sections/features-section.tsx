import { BlurFade } from '#components/ui/blur-fade'
import { cn, sectionFeatureCardClasses, featureCardIconClasses } from '#lib/design-system'
import {
	ArrowLeft,
	DollarSign,
	HelpCircle,
	Settings,
	Terminal,
	Zap
} from 'lucide-react'

interface FeaturesSectionDemoProps {
	className?: string
}

export default function FeaturesSectionDemo({
	className
}: FeaturesSectionDemoProps) {
	const features = [
		{
			title: 'Smart Property Management',
			description:
				'Automate rent collection, lease renewals, and maintenance tracking for 5-50 unit portfolios.',
			icon: <Terminal />
		},
		{
			title: 'Lightning Fast Setup',
			description:
				'Get up and running in under 1 hour. No complex configurations or lengthy onboarding.',
			icon: <Zap />
		},
		{
			title: 'Transparent Pricing',
			description:
				'90% of enterprise features for 20% of the price. No hidden fees, no lock-in contracts.',
			icon: <DollarSign />
		},
		{
			title: 'Multi-Property Dashboard',
			description:
				'Manage your entire portfolio from one unified dashboard with real-time insights.',
			icon: <ArrowLeft />
		},
		{
			title: 'Expert Support',
			description:
				'Property management experts available when you need them, plus comprehensive documentation.',
			icon: <HelpCircle />
		},
		{
			title: '60-Day Money Back',
			description:
				'See ROI within 90 days or get your money back. No questions asked guarantee.',
			icon: <Settings />
		}
	]

	return (
		<section
			className={cn(
				'section-spacing relative overflow-hidden bg-transparent',
				className
			)}
		>
			<div className="container px-(--spacing-4) mx-auto relative z-10">
				<div className="text-center mb-[var(--spacing-10)] max-w-[var(--max-width-3xl)] mx-auto">
					<h2 className="text-responsive-display-lg font-bold tracking-tight text-foreground mb-6 leading-tight">
						Everything you need for
						<span className="text-primary block">
							professional property management
						</span>
					</h2>
					<p className="text-xl text-muted-foreground leading-relaxed">
						Purpose-built for the missing middle: too big for spreadsheets, too
						small for enterprise solutions.
					</p>
				</div>

				<div
					className={cn(
						'grid gap-(--spacing-8) md:grid-cols-2 lg:grid-cols-3 relative z-10'
					)}
				>
					{features.map((feature, index) => (
						<BlurFade key={feature.title} delay={0.2 + index * 0.1} inView>
							<Feature {...feature} />
						</BlurFade>
					))}
				</div>
			</div>
		</section>
	)
}

interface FeatureProps {
	title: string
	description: string
	icon: React.ReactNode
}

const Feature = ({ title, description, icon }: FeatureProps) => {
	return (
		<div className={sectionFeatureCardClasses()}>
			{/* Enhanced hover background glow */}
			<div className="absolute inset-0 opacity-0 group-hover/feature:opacity-100 bg-primary/5 rounded pointer-events-none transition-all duration-500 blur-sm" />

			{/* Icon with enhanced animations */}
			<div className="mb-[var(--spacing-4)] relative z-10">
				<div className={featureCardIconClasses()}>
					<div className="size-[var(--spacing-6)] group-hover/feature:scale-110 transition-transform duration-300">
						{icon}
					</div>
				</div>

				{/* Floating accent dots */}
				<div
					className="absolute -top-1 -right-1 size-[var(--spacing-2)] rounded-full bg-accent opacity-0 group-hover/feature:opacity-100 transition-all duration-500 group-hover/feature:scale-125 animate-pulse"
					aria-hidden="true"
				/>
				<div
					className="absolute -bottom-1 -left-1 w-[var(--spacing-1_5)] h-[var(--spacing-1_5)] rounded-full bg-primary/50 opacity-0 group-hover/feature:opacity-100 transition-all duration-700 group-hover/feature:scale-150"
					aria-hidden="true"
				/>
			</div>

			{/* Title with enhanced hover */}
			<h3 className="text-lg font-semibold tracking-tight text-foreground mb-3 leading-tight group-hover/feature:text-primary transition-colors duration-300">
				{title}
			</h3>

			{/* Description with enhanced contrast on hover */}
			<p className="text-muted-foreground leading-relaxed text-sm group-hover/feature:text-foreground/80 transition-colors duration-300">
				{description}
			</p>

			{/* Animated border beam effect */}
			<div className="absolute inset-0 opacity-0 group-hover/feature:opacity-100 rounded overflow-hidden pointer-events-none">
				<div
					className="absolute inset-[-2px] bg-primary/10 animate-pulse duration-1000 rounded"
					aria-hidden="true"
				/>
			</div>

			{/* Subtle hover gradient overlay */}
			<div className="absolute inset-0 opacity-0 group-hover/feature:opacity-100 bg-primary/3 rounded pointer-events-none transition-opacity duration-500" />
		</div>
	)
}
