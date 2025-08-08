/**
 * Optimized Features Section - Server Component
 * Static feature showcase with stats and descriptions
 */

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, TrendingUp, Users, Play } from 'lucide-react'

interface OptimizedFeaturesSectionProps {
  locale: string
}

export function OptimizedFeaturesSection({ locale }: OptimizedFeaturesSectionProps) {
  const features = [
    {
      icon: Clock,
      title: 'Save 10+ Hours Weekly',
      description: 'Automate rent collection, maintenance requests, and tenant communications',
      stat: '87%',
      statLabel: 'Time Saved'
    },
    {
      icon: TrendingUp,
      title: 'Increase Revenue 23%',
      description: 'Reduce vacancy rates and collect rent faster with automated reminders',
      stat: '99%',
      statLabel: 'Collection Rate'
    },
    {
      icon: Users,
      title: 'Delight Your Tenants',
      description: '24/7 self-service portal for payments and maintenance requests',
      stat: '4.9★',
      statLabel: 'Tenant Rating'
    }
  ]

  return (
    <section className="py-20 px-4 bg-gray-50">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <Badge className="bg-blue-100 text-blue-700 mb-4">WHY TENANTFLOW</Badge>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Stop Losing Time & Money on Manual Tasks
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Every hour you spend on paperwork is an hour not growing your portfolio
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="p-6 hover:shadow-xl transition-all duration-300 border-2 hover:border-blue-100">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <feature.icon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">{feature.stat}</div>
                  <div className="text-xs text-gray-500">{feature.statLabel}</div>
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link href={`/${locale}/demo`}>
            <Button variant="outline" className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50">
              <Play className="mr-2 h-4 w-4" />
              Watch 2-Minute Demo
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}