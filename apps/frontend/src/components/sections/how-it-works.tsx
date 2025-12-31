'use client'

import { cn } from '#lib/utils'
import { BlurFade } from '#components/ui/blur-fade'
import { Button } from '#components/ui/button'
import {
	Building,
	Users,
	Zap,
	ArrowRight,
	Check,
	ChevronRight
} from 'lucide-react'
import Link from 'next/link'

interface HowItWorksProps {
	className?: string
}

const steps = [
	{
		number: '01',
		title: 'Add Your Properties',
		description:
			'Import your portfolio in minutes. Add property details, units, and set up rent amounts. Our CSV import handles bulk uploads effortlessly.',
		icon: Building,
		features: [
			'Bulk CSV import',
			'Unit-level management',
			'Custom rent schedules'
		],
		color: 'primary'
	},
	{
		number: '02',
		title: 'Invite Your Tenants',
		description:
			'Send digital invitations to tenants. They get their own portal for payments, maintenance requests, and lease documents.',
		icon: Users,
		features: ['Self-service portal', 'Online payments', 'Document signing'],
		color: 'info'
	},
	{
		number: '03',
		title: 'Automate Everything',
		description:
			'Let TenantFlow handle the rest. Automated rent collection, late fees, maintenance workflows, and financial reporting.',
		icon: Zap,
		features: [
			'Auto rent collection',
			'Late fee automation',
			'Financial reports'
		],
		color: 'success'
	}
]

export function HowItWorks({ className }: HowItWorksProps) {
	return (
		<section
			className={cn('section-spacing relative overflow-hidden', className)}
		>
			{/* Subtle background pattern */}
			<div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,color-mix(in_oklch,var(--color-primary)_3%,transparent),transparent_70%)]" />

			<div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
				<BlurFade delay={0.1} inView>
					<div className="text-center mb-16">
						<p className="typography-small text-primary uppercase tracking-wider mb-3">
							Get Started in Minutes
						</p>
						<h2 className="text-3xl lg:typography-h1 tracking-tight text-foreground mb-4">
							How TenantFlow Works
						</h2>
						<p className="text-muted-foreground text-lg max-w-2xl mx-auto">
							From signup to automation in three simple steps. No complex setup,
							no technical skills required.
						</p>
					</div>
				</BlurFade>

				{/* Steps */}
				<div className="relative">
					{/* Connecting line - desktop only */}
					<div className="hidden lg:block absolute top-24 left-[16.67%] right-[16.67%] h-0.5 bg-gradient-to-r from-primary via-info to-success opacity-20" />

					<div className="grid md:grid-cols-3 gap-8 lg:gap-12">
						{steps.map((step, index) => (
							<BlurFade key={step.number} delay={0.2 + index * 0.1} inView>
								<StepCard step={step} index={index} />
							</BlurFade>
						))}
					</div>
				</div>

				{/* CTA */}
				<BlurFade delay={0.5} inView>
					<div className="text-center mt-16">
						<Button
							size="lg"
							className="shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
							asChild
						>
							<Link href="/pricing">
								Start Your Free Trial
								<ArrowRight className="size-5 ml-2" />
							</Link>
						</Button>
						<p className="text-sm text-muted-foreground mt-4">
							No credit card required
						</p>
					</div>
				</BlurFade>
			</div>
		</section>
	)
}

interface StepCardProps {
	step: (typeof steps)[number]
	index: number
}

function StepCard({ step, index }: StepCardProps) {
	const colorClasses = {
		primary: {
			bg: 'bg-primary/10',
			text: 'text-primary',
			border: 'border-primary/20',
			ring: 'ring-primary/20'
		},
		info: {
			bg: 'bg-info/10',
			text: 'text-info',
			border: 'border-info/20',
			ring: 'ring-info/20'
		},
		success: {
			bg: 'bg-success/10',
			text: 'text-success',
			border: 'border-success/20',
			ring: 'ring-success/20'
		}
	}

	const colors = colorClasses[step.color as keyof typeof colorClasses]

	return (
		<div className="relative group">
			{/* Card */}
			<div className="card-standard p-8 h-full hover:shadow-lg hover:border-primary/20 transition-all duration-300">
				{/* Step number & icon */}
				<div className="flex items-start justify-between mb-6">
					<div
						className={cn(
							'size-16 rounded-2xl flex-center shadow-lg group-hover:scale-105 transition-transform duration-300',
							colors.bg,
							colors.text
						)}
					>
						<step.icon className="size-8" />
					</div>
					<span
						className={cn(
							'typography-h1 opacity-20 group-hover:opacity-40 transition-opacity',
							colors.text
						)}
					>
						{step.number}
					</span>
				</div>

				{/* Content */}
				<h3 className="text-xl font-bold text-foreground mb-3">{step.title}</h3>
				<p className="text-muted-foreground leading-relaxed mb-6">
					{step.description}
				</p>

				{/* Features */}
				<ul className="space-y-2">
					{step.features.map(feature => (
						<li key={feature} className="flex items-center gap-2 text-sm">
							<div className={cn('size-5 rounded-full flex-center', colors.bg)}>
								<Check className={cn('size-3', colors.text)} />
							</div>
							<span className="text-foreground">{feature}</span>
						</li>
					))}
				</ul>

				{/* Arrow to next step - mobile/tablet */}
				{index < steps.length - 1 && (
					<div className="md:hidden flex justify-center mt-6">
						<ChevronRight className="size-6 text-muted-foreground/40" />
					</div>
				)}
			</div>
		</div>
	)
}

export default HowItWorks
