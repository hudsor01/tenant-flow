'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowRight, 
  TrendingUp, 
  Users, 
  Clock,
  Star
} from 'lucide-react'
import Link from 'next/link'

export function CTAStats() {
  const stats = [
    { number: "10,000+", label: "Properties Managed", icon: TrendingUp },
    { number: "99.8%", label: "Customer Satisfaction", icon: Star },
    { number: "50%", label: "Time Saved", icon: Clock },
    { number: "25,000+", label: "Happy Users", icon: Users },
  ]

  return (
    <section className="py-20 bg-gradient-to-b from-white to-blue-50">
      <div className="mx-auto max-w-7xl px-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="flex justify-center mb-3">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <stat.icon className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{stat.number}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Main CTA */}
        <div className="text-center max-w-4xl mx-auto">
          <Badge variant="secondary" className="mb-6 bg-blue-100 text-blue-700 border-blue-200">
            <TrendingUp className="w-4 h-4 mr-2" />
            Trusted by Industry Leaders
          </Badge>
          
          <h2 className="text-4xl font-bold lg:text-5xl mb-6">
            Join Thousands of Successful
            <br />
            <span className="text-blue-600">Property Managers</span>
          </h2>
          
          <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
            See why property managers choose TenantFlow to automate their workflows, 
            increase efficiency, and grow their business faster than ever.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <Button asChild size="lg" className="group">
              <Link href="/auth/sign-up">
                Start Your Success Story
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            
            <Button asChild size="lg" variant="outline">
              <Link href="/case-studies">
                Read Success Stories
              </Link>
            </Button>
          </div>

          {/* Social Proof */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div 
                    key={i} 
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 border-2 border-white flex items-center justify-center text-white text-xs font-medium"
                  >
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <span>Join 25,000+ users</span>
            </div>
            <div className="hidden sm:block w-px h-4 bg-gray-300"></div>
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              ))}
              <span className="ml-2">4.9/5 rating</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}