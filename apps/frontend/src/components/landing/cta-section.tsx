'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Phone, DollarSign, Shield, Bell, Home } from 'lucide-react'

const trustPoints = [
  {
    icon: DollarSign,
    title: 'Free Trial',
    subtitle: '14 days, no CC required'
  },
  {
    icon: Shield,
    title: 'Secure',
    subtitle: 'Bank-level encryption'
  },
  {
    icon: Bell,
    title: '24/7 Support',
    subtitle: 'Always here to help'
  },
  {
    icon: Home,
    title: '10,000+ Users',
    subtitle: 'Trusted nationwide'
  }
]

export function CtaSection() {
  return (
    <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
      <div className="container mx-auto text-center">
        <h2 className="text-4xl md:text-5xl font-bold mb-6">
          Ready to Transform Your Property Management?
        </h2>
        <p className="text-xl mb-8 text-blue-100 max-w-2xl mx-auto">
          Join thousands of property managers who save time, increase revenue, and delight tenants with TenantFlow
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/signup">
            <Button 
              size="lg" 
              variant="secondary" 
              className="text-lg px-8 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all"
            >
              Start Your Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link href="/contact">
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg px-8 bg-white/10 text-white border-white hover:bg-white/20"
            >
              <Phone className="mr-2 h-5 w-5" />
              Talk to Sales
            </Button>
          </Link>
        </div>
        
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
          {trustPoints.map((point, index) => (
            <div key={index}>
              <point.icon className="w-8 h-8 mx-auto mb-2 opacity-80" />
              <p className="font-semibold">{point.title}</p>
              <p className="text-sm opacity-90">{point.subtitle}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}