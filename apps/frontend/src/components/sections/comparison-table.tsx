'use client'

import { cn } from '#lib/utils'
import { BlurFade } from '#components/ui/blur-fade'
import { Button } from '#components/ui/button'
import { Check, X, Minus, ArrowRight, Crown } from 'lucide-react'
import Link from 'next/link'

interface ComparisonTableProps {
	className?: string
}

type FeatureValue = boolean | string | 'partial'

interface ComparisonFeature {
	name: string
	tenantFlow: FeatureValue
	spreadsheets: FeatureValue
	enterprise: FeatureValue
	description?: string
}

const comparisonData: ComparisonFeature[] = [
	{
		name: 'Setup Time',
		tenantFlow: '< 1 hour',
		spreadsheets: '1-2 weeks',
		enterprise: '2-4 weeks',
		description: 'Time to get fully operational'
	},
	{
		name: 'Monthly Cost (50 units)',
		tenantFlow: '$49/mo',
		spreadsheets: 'Free*',
		enterprise: '$200+/mo',
		description: '*Excludes your time value'
	},
	{
		name: 'Online Rent Collection',
		tenantFlow: true,
		spreadsheets: false,
		enterprise: true
	},
	{
		name: 'Tenant Portal',
		tenantFlow: true,
		spreadsheets: false,
		enterprise: true
	},
	{
		name: 'Maintenance Tracking',
		tenantFlow: true,
		spreadsheets: 'partial',
		enterprise: true
	},
	{
		name: 'Automated Late Fees',
		tenantFlow: true,
		spreadsheets: false,
		enterprise: true
	},
	{
		name: 'Digital Lease Signing',
		tenantFlow: true,
		spreadsheets: false,
		enterprise: 'partial'
	},
	{
		name: 'Financial Reports',
		tenantFlow: true,
		spreadsheets: 'partial',
		enterprise: true
	},
	{
		name: 'Mobile App',
		tenantFlow: true,
		spreadsheets: false,
		enterprise: true
	},
	{
		name: 'No Training Required',
		tenantFlow: true,
		spreadsheets: true,
		enterprise: false
	},
	{
		name: '24/7 Support',
		tenantFlow: true,
		spreadsheets: false,
		enterprise: 'partial'
	},
	{
		name: 'SOC 2 Compliance',
		tenantFlow: true,
		spreadsheets: false,
		enterprise: true
	}
]

export function ComparisonTable({ className }: ComparisonTableProps) {
	return (
		<section className={cn('section-spacing bg-muted/30', className)}>
			<div className="max-w-7xl mx-auto px-6 lg:px-8">
				<BlurFade delay={0.1} inView>
					<div className="text-center mb-12">
						<h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-4">
							Why Property Managers Choose{' '}
							<span className="hero-highlight">TenantFlow</span>
						</h2>
						<p className="text-muted-foreground text-lg max-w-2xl mx-auto">
							The sweet spot between DIY spreadsheets and overpriced enterprise solutions
						</p>
					</div>
				</BlurFade>

				<BlurFade delay={0.2} inView>
					<div className="overflow-x-auto">
						<table className="w-full min-w-[640px]">
							<thead>
								<tr>
									<th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground">
										Feature
									</th>
									<th className="py-4 px-4 text-center">
										<div className="inline-flex flex-col items-center">
											<div className="relative">
												<Crown className="absolute -top-4 left-1/2 -translate-x-1/2 size-5 text-accent fill-accent" />
												<span className="text-lg font-bold text-primary">TenantFlow</span>
											</div>
											<span className="text-xs text-muted-foreground">Best Value</span>
										</div>
									</th>
									<th className="py-4 px-4 text-center">
										<div className="flex flex-col items-center">
											<span className="text-lg font-semibold text-foreground">Spreadsheets</span>
											<span className="text-xs text-muted-foreground">DIY</span>
										</div>
									</th>
									<th className="py-4 px-4 text-center">
										<div className="flex flex-col items-center">
											<span className="text-lg font-semibold text-foreground">Enterprise</span>
											<span className="text-xs text-muted-foreground">Overpriced</span>
										</div>
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-border">
								{comparisonData.map((feature, index) => (
									<tr
										key={feature.name}
										className={cn(
											'hover:bg-muted/50 transition-colors',
											index % 2 === 0 ? 'bg-card/50' : ''
										)}
									>
										<td className="py-4 px-4">
											<div className="font-medium text-foreground">{feature.name}</div>
											{feature.description && (
												<div className="text-xs text-muted-foreground mt-0.5">
													{feature.description}
												</div>
											)}
										</td>
										<td className="py-4 px-4">
											<div className="flex justify-center">
												<FeatureCell value={feature.tenantFlow} highlight />
											</div>
										</td>
										<td className="py-4 px-4">
											<div className="flex justify-center">
												<FeatureCell value={feature.spreadsheets} />
											</div>
										</td>
										<td className="py-4 px-4">
											<div className="flex justify-center">
												<FeatureCell value={feature.enterprise} />
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</BlurFade>

				{/* CTA */}
				<BlurFade delay={0.3} inView>
					<div className="text-center mt-12">
						<Button
							size="lg"
							className="shadow-lg shadow-primary/20"
							asChild
						>
							<Link href="/pricing">
								See Pricing Details
								<ArrowRight className="size-5 ml-2" />
							</Link>
						</Button>
					</div>
				</BlurFade>
			</div>
		</section>
	)
}

function FeatureCell({ value, highlight }: { value: FeatureValue; highlight?: boolean }) {
	if (typeof value === 'string' && value !== 'partial') {
		return (
			<span className={cn(
				'text-sm font-medium',
				highlight ? 'text-primary' : 'text-foreground'
			)}>
				{value}
			</span>
		)
	}

	if (value === true) {
		return (
			<div className={cn(
				'size-8 rounded-full flex-center',
				highlight ? 'bg-primary/10' : 'bg-success/10'
			)}>
				<Check className={cn(
					'size-5',
					highlight ? 'text-primary' : 'text-success'
				)} />
			</div>
		)
	}

	if (value === false) {
		return (
			<div className="size-8 rounded-full bg-muted flex-center">
				<X className="size-5 text-muted-foreground" />
			</div>
		)
	}

	// partial
	return (
		<div className="size-8 rounded-full bg-warning/10 flex-center">
			<Minus className="size-5 text-warning" />
		</div>
	)
}

export default ComparisonTable
