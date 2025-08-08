import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const pricingPlans = [
  {
    name: 'Starter',
    price: '$29',
    units: 'Up to 10 units',
    features: ['Tenant Portal', 'Online Payments', 'Basic Reports', 'Email Support'],
    popular: false
  },
  {
    name: 'Professional',
    price: '$79',
    units: 'Up to 50 units',
    features: ['Everything in Starter', 'Advanced Analytics', 'Maintenance Management', 'Priority Support', 'Custom Branding'],
    popular: true
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    units: 'Unlimited units',
    features: ['Everything in Pro', 'API Access', 'Dedicated Account Manager', 'Custom Integrations', 'SLA Guarantee'],
    popular: false
  }
]

export function PricingSection() {
  return (
    <section className="py-20 px-4 bg-gray-50">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-gray-600">
            Choose the plan that fits your portfolio size
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {pricingPlans.map((plan, index) => (
            <Card 
              key={index}
              className={cn(
                "p-6 relative hover:shadow-2xl transition-all duration-300",
                plan.popular && "border-2 border-blue-600 scale-105"
              )}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white">
                  Most Popular
                </Badge>
              )}
              
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="text-4xl font-bold mb-1">
                  {plan.price}
                  {plan.price !== 'Custom' && <span className="text-lg text-gray-500">/mo</span>}
                </div>
                <p className="text-gray-600">{plan.units}</p>
              </div>
              
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Link href="/signup">
                <Button 
                  className={cn(
                    "w-full",
                    plan.popular ? "bg-blue-600 hover:bg-blue-700" : ""
                  )}
                  variant={plan.popular ? "default" : "outline"}
                >
                  Get Started
                </Button>
              </Link>
            </Card>
          ))}
        </div>
        
        <div className="text-center mt-8">
          <Link href="/pricing" className="text-blue-600 hover:underline">
            View detailed pricing and features →
          </Link>
        </div>
      </div>
    </section>
  )
}