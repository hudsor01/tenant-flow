import { BlurFade } from '@/components/magicui/blur-fade'
import { cn } from '@/lib/design-system'
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
				'relative py-12 lg:py-16 overflow-hidden bg-transparent',
				className
			)}
		>
			<div className="container px-4 mx-auto relative z-10">
				<div className="text-center mb-10 max-w-3xl mx-auto">
					<h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-6 leading-tight">
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
						'grid gap-8 md:grid-cols-2 lg:grid-cols-3 relative z-10'
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
		<div className="group/feature relative p-6 rounded bg-card/50 border border-border/40 hover:border-primary/40 hover:bg-card/90 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10 backdrop-blur-sm hover:-translate-y-2 hover:scale-[1.02]">
			{/* Enhanced hover background glow */}
			<div className="absolute inset-0 opacity-0 group-hover/feature:opacity-100 bg-gradient-to-br from-primary/[0.08] via-primary/[0.04] to-accent/[0.08] rounded pointer-events-none transition-all duration-500 blur-sm" />

			{/* Icon with enhanced animations */}
			<div className="mb-4 relative z-10">
				<div className="w-12 h-12 rounded bg-primary/10 text-primary flex items-center justify-center group-hover/feature:bg-primary/20 group-hover/feature:scale-110 group-hover/feature:rotate-3 transition-all duration-500 group-hover/feature:shadow-lg group-hover/feature:shadow-primary/25">
					<div className="w-6 h-6 group-hover/feature:scale-110 transition-transform duration-300">
						{icon}
					</div>
				</div>

				{/* Floating accent dots */}
				<div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-accent opacity-0 group-hover/feature:opacity-100 transition-all duration-500 group-hover/feature:scale-125 animate-pulse" />
				<div className="absolute -bottom-1 -left-1 w-1.5 h-1.5 rounded-full bg-primary/50 opacity-0 group-hover/feature:opacity-100 transition-all duration-700 group-hover/feature:scale-150" />
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
				<div className="absolute inset-[-2px] bg-gradient-to-r from-transparent via-primary/20 to-transparent animate-pulse duration-1000 rounded" />
			</div>

			{/* Subtle hover gradient overlay */}
			<div className="absolute inset-0 opacity-0 group-hover/feature:opacity-100 bg-gradient-to-br from-primary/[0.03] to-accent/[0.03] rounded pointer-events-none transition-opacity duration-500" />
		</div>
	)
}
