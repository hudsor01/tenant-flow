'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Building2, 
  Users, 
  DollarSign, 
  ArrowRight, 
  CheckCircle,
  Clock
} from 'lucide-react'
import Link from 'next/link'

export function CTACards() {
  const benefits = [
    { icon: Building2, text: "Manage unlimited properties" },
    { icon: Users, text: "Streamline tenant communications" },
    { icon: DollarSign, text: "Automate rent collection" },
  ]

  return (
    <section className="py-20 bg-slate-50">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">
            <Clock className="w-4 h-4 mr-2" />
            Ready in Minutes
          </Badge>
          
          <h2 className="text-4xl font-bold lg:text-5xl mb-6">
            Everything You Need to
            <br />
            <span className="text-gradient-premium">Manage Properties</span>
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            From tenant screening to maintenance tracking, TenantFlow provides 
            all the tools you need in one powerful platform.
          </p>
        </div>

        <div className="dashboard-cards-container mb-16">
          {/* Main CTA Card */}
          <Card className="dashboard-widget border-2 border-blue-200 shadow-xl">
            <CardContent className="p-8">
              <div className="text-center">
                <h3 className="text-2xl font-bold mb-4">Start Your Free Trial</h3>
                <p className="text-muted-foreground mb-6">
                  Get full access to all features for 14 days. No credit card required.
                </p>
                
                <div className="space-y-3 mb-8">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <benefit.icon className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium">{benefit.text}</span>
                    </div>
                  ))}
                </div>

                <Button asChild size="lg" className="w-full group">
                  <Link href="/auth/sign-up">
                    Start Free Trial
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
                
                <p className="text-xs text-muted-foreground mt-4">
                  Join 10,000+ property managers
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Demo Card */}
          <Card className="dashboard-widget shadow-lg">
            <CardContent className="p-8">
              <div className="text-center">
                <h3 className="text-2xl font-bold mb-4">See TenantFlow in Action</h3>
                <p className="text-muted-foreground mb-6">
                  Watch a personalized demo and discover how TenantFlow can transform your business.
                </p>
                
                <div className="space-y-3 mb-8">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-sm font-medium">15-minute personalized walkthrough</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-sm font-medium">Tailored to your property type</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-sm font-medium">Q&A with our experts</span>
                  </div>
                </div>

                <Button asChild size="lg" variant="outline" className="w-full">
                  <Link href="/demo">
                    Schedule Demo
                  </Link>
                </Button>
                
                <p className="text-xs text-muted-foreground mt-4">
                  Available Monday-Friday, 9AM-6PM EST
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trust indicators */}
        <div className="text-center">
          <div className="inline-flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>SOC 2 Certified</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>99.9% Uptime</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>24/7 Support</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}