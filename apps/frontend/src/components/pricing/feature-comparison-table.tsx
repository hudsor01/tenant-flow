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
    freeTrial: <Check className="h-5 w-5 mx-auto text-primary" />,
    starter: <Check className="h-5 w-5 mx-auto text-primary" />,
    growth: <Check className="h-5 w-5 mx-auto text-primary" />,
    max: <Check className="h-5 w-5 mx-auto text-primary" />
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
    growth: <Check className="h-5 w-5 mx-auto text-primary" />,
    max: <Check className="h-5 w-5 mx-auto text-primary" />
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
export function FeatureComparisonTable({ className }: FeatureComparisonTableProps) {
  return (
    <div className={`max-w-5xl mx-auto ${className || ''}`}>
      <h2 className="text-3xl font-bold text-center mb-8">
        Compare Plans
      </h2>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left p-4">Features</th>
              <th className="text-center p-4">Free Trial</th>
              <th className="text-center p-4">Starter</th>
              <th className="text-center p-4 bg-primary/5">Growth</th>
              <th className="text-center p-4">TenantFlow Max</th>
            </tr>
          </thead>
          <tbody>
            {features.map((feature, index) => (
              <tr key={index} className="border-b">
                <td className="p-4 font-medium">{feature.name}</td>
                <td className="text-center p-4">
                  {typeof feature.freeTrial === 'string' ? feature.freeTrial : feature.freeTrial}
                </td>
                <td className="text-center p-4">
                  {typeof feature.starter === 'string' ? feature.starter : feature.starter}
                </td>
                <td className="text-center p-4 bg-primary/5">
                  {typeof feature.growth === 'string' ? feature.growth : feature.growth}
                </td>
                <td className="text-center p-4">
                  {typeof feature.max === 'string' ? feature.max : feature.max}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}