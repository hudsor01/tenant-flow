'use client'

import { useState } from 'react'
import { cn } from '#lib/utils'
import { Check, Minus, ChevronDown } from 'lucide-react'
import { Button } from '#components/ui/button'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger
} from '#components/ui/collapsible'

interface PricingComparisonTableProps {
	className?: string
}

type FeatureValue = boolean | string | number

interface ComparisonFeature {
	name: string
	starter: FeatureValue
	growth: FeatureValue
	max: FeatureValue
	tooltip?: string
}

interface FeatureCategory {
	category: string
	features: ComparisonFeature[]
}

const comparisonData: FeatureCategory[] = [
	{
		category: 'Property Management',
		features: [
			{ name: 'Properties', starter: '5', growth: '20', max: 'Unlimited' },
			{ name: 'Units', starter: '25', growth: '100', max: 'Unlimited' },
			{ name: 'Tenants', starter: 'Unlimited', growth: 'Unlimited', max: 'Unlimited' },
			{ name: 'Team members', starter: '1', growth: '3', max: 'Unlimited' },
			{ name: 'Lease management', starter: true, growth: true, max: true },
			{ name: 'Tenant portal', starter: true, growth: true, max: true },
			{ name: 'Document storage', starter: '10GB', growth: '50GB', max: 'Unlimited' }
		]
	},
	{
		category: 'Rent Collection',
		features: [
			{ name: 'Online payments', starter: true, growth: true, max: true },
			{ name: 'Auto-pay setup', starter: true, growth: true, max: true },
			{ name: 'Payment reminders', starter: false, growth: true, max: true },
			{ name: 'Late fee automation', starter: false, growth: true, max: true },
			{ name: 'Partial payments', starter: false, growth: true, max: true },
			{ name: 'Custom payment plans', starter: false, growth: false, max: true }
		]
	},
	{
		category: 'Maintenance',
		features: [
			{ name: 'Work order tracking', starter: true, growth: true, max: true },
			{ name: 'Photo attachments', starter: true, growth: true, max: true },
			{ name: 'Vendor management', starter: false, growth: true, max: true },
			{ name: 'Vendor network access', starter: false, growth: true, max: true },
			{ name: 'Automated assignments', starter: false, growth: false, max: true },
			{ name: 'Preventive scheduling', starter: false, growth: false, max: true }
		]
	},
	{
		category: 'Reporting & Analytics',
		features: [
			{ name: 'Financial reports', starter: 'Basic', growth: 'Advanced', max: 'Custom' },
			{ name: 'Occupancy analytics', starter: true, growth: true, max: true },
			{ name: 'Expense tracking', starter: true, growth: true, max: true },
			{ name: 'Custom dashboards', starter: false, growth: true, max: true },
			{ name: 'ROI analysis', starter: false, growth: true, max: true },
			{ name: 'Portfolio benchmarking', starter: false, growth: false, max: true }
		]
	},
	{
		category: 'Integrations & API',
		features: [
			{ name: 'QuickBooks sync', starter: false, growth: true, max: true },
			{ name: 'Accounting export', starter: true, growth: true, max: true },
			{ name: 'API access', starter: false, growth: 'Limited', max: 'Full' },
			{ name: 'Custom integrations', starter: false, growth: false, max: true },
			{ name: 'Webhooks', starter: false, growth: false, max: true },
			{ name: 'White-label options', starter: false, growth: false, max: true }
		]
	},
	{
		category: 'Support',
		features: [
			{ name: 'Email support', starter: true, growth: true, max: true },
			{ name: 'Priority support', starter: false, growth: true, max: true },
			{ name: 'Phone support', starter: false, growth: true, max: true },
			{ name: '24/7 availability', starter: false, growth: false, max: true },
			{ name: 'Dedicated manager', starter: false, growth: false, max: true },
			{ name: 'Onboarding training', starter: false, growth: '1 session', max: 'Unlimited' }
		]
	}
]

function FeatureCell({
	value,
	highlight = false
}: {
	value: FeatureValue
	highlight?: boolean
}) {
	if (typeof value === 'boolean') {
		return value ? (
			<Check
				className={cn(
					'size-5 mx-auto',
					highlight ? 'text-primary' : 'text-success'
				)}
			/>
		) : (
			<Minus className="size-5 text-muted-foreground/50 mx-auto" />
		)
	}
	return (
		<span
			className={cn(
				'text-sm font-medium',
				highlight ? 'text-primary' : 'text-foreground'
			)}
		>
			{value}
		</span>
	)
}

function CategorySection({
	category,
	features,
	defaultOpen = false
}: FeatureCategory & { defaultOpen?: boolean }) {
	const [isOpen, setIsOpen] = useState(defaultOpen)

	return (
		<Collapsible open={isOpen} onOpenChange={setIsOpen}>
			<CollapsibleTrigger asChild>
				<Button
					variant="ghost"
					className="w-full justify-between py-4 px-6 h-auto rounded-none border-b border-border/50 hover:bg-muted/50"
				>
					<span className="font-semibold text-foreground">{category}</span>
					<ChevronDown
						className={cn(
							'size-5 text-muted-foreground transition-transform duration-200',
							isOpen && 'rotate-180'
						)}
					/>
				</Button>
			</CollapsibleTrigger>
			<CollapsibleContent>
				{features.map((feature, idx) => (
					<div
						key={feature.name}
						className={cn(
							'grid grid-cols-4 items-center py-3 px-6',
							idx % 2 === 0 ? 'bg-muted/20' : 'bg-transparent'
						)}
					>
						<div className="text-sm text-muted-foreground">
							{feature.name}
						</div>
						<div className="text-center">
							<FeatureCell value={feature.starter} />
						</div>
						<div className="text-center bg-primary/5 -my-3 py-3 border-x border-primary/10">
							<FeatureCell value={feature.growth} highlight />
						</div>
						<div className="text-center">
							<FeatureCell value={feature.max} />
						</div>
					</div>
				))}
			</CollapsibleContent>
		</Collapsible>
	)
}

export function PricingComparisonTable({
	className
}: PricingComparisonTableProps) {
	return (
		<div className={cn('w-full', className)}>
			<div className="text-center mb-8">
				<h2 className="text-2xl font-bold text-foreground mb-2">
					Compare All Features
				</h2>
				<p className="text-muted-foreground">
					See exactly what you get with each plan
				</p>
			</div>

			<div className="rounded-xl border border-border/50 bg-card overflow-hidden">
				{/* Sticky header */}
				<div className="grid grid-cols-4 items-center py-4 px-6 bg-muted/50 border-b border-border/50 sticky top-0 z-10">
					<div className="text-sm font-medium text-muted-foreground">
						Features
					</div>
					<div className="text-center">
						<div className="text-sm font-semibold text-foreground">Starter</div>
						<div className="text-xs text-muted-foreground">$29/mo</div>
					</div>
					<div className="text-center bg-primary/5 -my-4 py-4 border-x border-primary/10">
						<div className="text-sm font-semibold text-primary">Growth</div>
						<div className="text-xs text-primary/70">$79/mo</div>
					</div>
					<div className="text-center">
						<div className="text-sm font-semibold text-foreground">Max</div>
						<div className="text-xs text-muted-foreground">Custom</div>
					</div>
				</div>

				{/* Category sections */}
				{comparisonData.map((category, idx) => (
					<CategorySection
						key={category.category}
						{...category}
						defaultOpen={idx === 0}
					/>
				))}
			</div>
		</div>
	)
}
