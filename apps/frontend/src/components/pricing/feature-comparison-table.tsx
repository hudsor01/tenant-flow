import { Check } from 'lucide-react'

interface FeatureComparisonTableProps {
	className?: string
}

const features = [
	{
		name: 'Properties',
		freeTrial: '1',
		starter: '5',
		growth: '20',
		max: 'Unlimited'
	},
	{
		name: 'Units',
		freeTrial: '5',
		starter: '25',
		growth: '100',
		max: 'Unlimited'
	},
	{
		name: 'Document Storage',
		freeTrial: '1 GB',
		starter: '10 GB',
		growth: '50 GB',
		max: 'Unlimited'
	},
	{
		name: 'Tenant Portal',
		freeTrial: <Check className="text-primary mx-auto h-5 w-5" />,
		starter: <Check className="text-primary mx-auto h-5 w-5" />,
		growth: <Check className="text-primary mx-auto h-5 w-5" />,
		max: <Check className="text-primary mx-auto h-5 w-5" />
	},
	{
		name: 'Maintenance Tracking',
		freeTrial: 'Basic',
		starter: 'Full',
		growth: 'Advanced',
		max: 'Advanced + Vendors'
	},
	{
		name: 'Financial Reports',
		freeTrial: '-',
		starter: 'Basic',
		growth: 'Advanced',
		max: 'Custom'
	},
	{
		name: 'API Access',
		freeTrial: '-',
		starter: '-',
		growth: <Check className="text-primary mx-auto h-5 w-5" />,
		max: <Check className="text-primary mx-auto h-5 w-5" />
	},
	{
		name: 'Team Members',
		freeTrial: '1',
		starter: '1',
		growth: '3',
		max: 'Unlimited'
	},
	{
		name: 'Support',
		freeTrial: 'Email',
		starter: 'Priority Email',
		growth: 'Phone & Email',
		max: '24/7 Dedicated'
	}
]

/**
 * Server component for feature comparison table
 * Static content - no interactivity needed
 */
export function FeatureComparisonTable({
	className
}: FeatureComparisonTableProps) {
	return (
		<div className={`mx-auto max-w-5xl ${className || ''}`}>
			<h2 className="mb-8 text-center text-3xl font-bold">
				Compare Plans
			</h2>

			<div className="overflow-x-auto">
				<table className="w-full border-collapse">
					<thead>
						<tr className="border-b">
							<th className="p-4 text-left">Features</th>
							<th className="p-4 text-center">Free Trial</th>
							<th className="p-4 text-center">Starter</th>
							<th className="bg-primary/5 p-4 text-center">
								Growth
							</th>
							<th className="p-4 text-center">TenantFlow Max</th>
						</tr>
					</thead>
					<tbody>
						{features.map((feature, index) => (
							<tr key={index} className="border-b">
								<td className="p-4 font-medium">
									{feature.name}
								</td>
								<td className="p-4 text-center">
									{typeof feature.freeTrial === 'string'
										? feature.freeTrial
										: feature.freeTrial}
								</td>
								<td className="p-4 text-center">
									{typeof feature.starter === 'string'
										? feature.starter
										: feature.starter}
								</td>
								<td className="bg-primary/5 p-4 text-center">
									{typeof feature.growth === 'string'
										? feature.growth
										: feature.growth}
								</td>
								<td className="p-4 text-center">
									{typeof feature.max === 'string'
										? feature.max
										: feature.max}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	)
}
