/**
 * Pricing Feature Comparison Component
 * Clean table showing feature differences between plans
 */

import { Check, X } from 'lucide-react'
import { getAllPlans } from '@repo/shared/stripe/config'

const featureCategories = [
  {
    name: 'Core Features',
    features: [
      { name: 'Property Management', starter: true, growth: true, max: true },
      { name: 'Tenant Management', starter: true, growth: true, max: true },
      { name: 'Lease Tracking', starter: true, growth: true, max: true },
      { name: 'Rent Collection', starter: true, growth: true, max: true },
      { name: 'Maintenance Requests', starter: true, growth: true, max: true },
      { name: 'Document Storage', starter: '5GB', growth: '50GB', max: 'Unlimited' },
      { name: 'Mobile App Access', starter: true, growth: true, max: true }
    ]
  },
  {
    name: 'Reporting & Analytics',
    features: [
      { name: 'Basic Reports', starter: true, growth: true, max: true },
      { name: 'Advanced Analytics', starter: false, growth: true, max: true },
      { name: 'Custom Reports', starter: false, growth: true, max: true },
      { name: 'Financial Dashboard', starter: false, growth: true, max: true },
      { name: 'Automated Insights', starter: false, growth: false, max: true }
    ]
  },
  {
    name: 'Automation',
    features: [
      { name: 'Rent Reminders', starter: true, growth: true, max: true },
      { name: 'Late Fee Automation', starter: false, growth: true, max: true },
      { name: 'Lease Renewal Alerts', starter: false, growth: true, max: true },
      { name: 'Custom Workflows', starter: false, growth: false, max: true },
      { name: 'Smart Notifications', starter: false, growth: false, max: true }
    ]
  },
  {
    name: 'Integrations',
    features: [
      { name: 'Bank Sync', starter: false, growth: true, max: true },
      { name: 'Accounting Software', starter: false, growth: true, max: true },
      { name: 'API Access', starter: false, growth: true, max: true },
      { name: 'Custom Integrations', starter: false, growth: false, max: true },
      { name: 'White-label Options', starter: false, growth: false, max: true }
    ]
  },
  {
    name: 'Support',
    features: [
      { name: 'Email Support', starter: 'Business hours', growth: 'Priority', max: '24/7' },
      { name: 'Phone Support', starter: false, growth: false, max: true },
      { name: 'Dedicated Account Manager', starter: false, growth: false, max: true },
      { name: 'Onboarding Assistance', starter: 'Self-service', growth: 'Guided', max: 'White-glove' },
      { name: 'Training Sessions', starter: false, growth: false, max: true }
    ]
  }
]

export function PricingComparison() {
  const plans = getAllPlans()

  const renderFeatureValue = (value: boolean | string) => {
    if (typeof value === 'boolean') {
      return value ? (
        <Check className="h-5 w-5 text-green-600 mx-auto" />
      ) : (
        <X className="h-5 w-5 text-gray-300 mx-auto" />
      )
    }
    return <span className="text-sm text-gray-600">{value}</span>
  }

  return (
    <section className="py-24 bg-white">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-4xl font-bold text-gray-900">
            Compare all features
          </h2>
          <p className="text-lg text-gray-600">
            See exactly what's included in each plan to find the perfect fit for your needs.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            {/* Table header */}
            <thead>
              <tr className="border-b border-gray-200">
                <th className="p-4 text-left"></th>
                {plans.map((plan) => (
                  <th key={plan.id} className="p-4 text-center">
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                      <div className="text-2xl font-bold text-gray-900">
                        ${plan.monthly.amount / 100}
                        <span className="text-sm text-gray-600 font-normal">/month</span>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Table body */}
            <tbody>
              {featureCategories.map((category) => (
                <>
                  {/* Category header */}
                  <tr key={category.name} className="border-b border-gray-100">
                    <td className="p-4 font-semibold text-gray-900 bg-gray-50" colSpan={4}>
                      {category.name}
                    </td>
                  </tr>
                  
                  {/* Category features */}
                  {category.features.map((feature, index) => (
                    <tr key={feature.name} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                      <td className="p-4 text-gray-700">{feature.name}</td>
                      <td className="p-4 text-center">
                        {renderFeatureValue(feature.starter)}
                      </td>
                      <td className="p-4 text-center">
                        {renderFeatureValue(feature.growth)}
                      </td>
                      <td className="p-4 text-center">
                        {renderFeatureValue(feature.max)}
                      </td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {/* Usage limits summary */}
        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.id} className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">{plan.name} Limits</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Properties:</span>
                  <span className="font-medium text-gray-900">
                    {plan.limits.properties === -1 ? 'Unlimited' : plan.limits.properties}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Units:</span>
                  <span className="font-medium text-gray-900">
                    {plan.limits.units === -1 ? 'Unlimited' : plan.limits.units}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Team members:</span>
                  <span className="font-medium text-gray-900">
                    {plan.limits.users === -1 ? 'Unlimited' : plan.limits.users}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}