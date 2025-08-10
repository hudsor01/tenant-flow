'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowRight, Phone, DollarSign, Shield, Bell, Home, Sparkles, Star } from 'lucide-react'

const trustPoints = [
  {
    icon: DollarSign,
    title: 'Free Trial',
    subtitle: '14 days, no CC required',
    gradient: 'from-green-400 to-emerald-500'
  },
  {
    icon: Shield,
    title: 'Secure',
    subtitle: 'Bank-level encryption',
    gradient: 'from-blue-400 to-cyan-500'
  },
  {
    icon: Bell,
    title: '24/7 Support',
    subtitle: 'Always here to help',
    gradient: 'from-purple-400 to-pink-500'
  },
  {
    icon: Home,
    title: '10,000+ Users',
    subtitle: 'Trusted nationwide',
    gradient: 'from-orange-400 to-red-500'
  }
]

export function CtaSection() {
  return (
    <section className="relative py-24 px-4 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 text-white overflow-hidden">
      {/* Enhanced background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-blob"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
      </div>
      
      <div className="container mx-auto text-center relative z-10 max-w-5xl">
        {/* Enhanced header with badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full mb-6">
          <Sparkles className="h-4 w-4" />
          <span className="text-sm font-medium">Join 10,000+ Property Managers</span>
        </div>
        
        <h2 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
          Ready to Transform Your
          <span className="block bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
            Property Management?
          </span>
        </h2>
        
        <p className="text-xl mb-12 text-white/80 max-w-2xl mx-auto leading-relaxed">
          Join thousands of property managers who save time, increase revenue, and delight tenants with TenantFlow
        </p>
        
        {/* Enhanced CTA buttons with glassmorphism */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <Link href="/auth/signup" className="w-full sm:w-auto">
            <Button 
              size="lg" 
              className="w-full sm:w-auto min-w-[280px] h-16 px-8 text-lg font-semibold bg-white text-blue-700 hover:bg-gray-50 rounded-xl shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 group"
            >
              <span className="flex items-center justify-center gap-3">
                Start Your Free Trial Now
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </span>
            </Button>
          </Link>
          
          <Link href="/contact" className="w-full sm:w-auto">
            <Button 
              size="lg" 
              variant="outline"
              className="w-full sm:w-auto min-w-[280px] h-16 px-8 text-lg font-semibold bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 hover:border-white hover:bg-white/20 rounded-xl transition-all duration-300"
            >
              <span className="flex items-center justify-center gap-3">
                <Phone className="w-5 h-5" />
                Schedule a Demo
              </span>
            </Button>
          </Link>
        </div>
        
        {/* Enhanced trust points with cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto mb-12">
          {trustPoints.map((point, index) => (
            <Card key={index} className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/15 transition-all duration-300 group">
              <CardContent className="p-6 text-center">
                <div className={`w-12 h-12 mx-auto mb-4 bg-gradient-to-br ${point.gradient} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <point.icon className="w-6 h-6 text-white" />
                </div>
                <p className="font-semibold text-white mb-1">{point.title}</p>
                <p className="text-sm text-white/70">{point.subtitle}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Social proof with stars */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-white/80">
          <div className="flex items-center gap-2">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-yellow-300 text-yellow-300" />
              ))}
            </div>
            <span className="text-sm">4.9/5 from 1,200+ reviews</span>
          </div>
          <div className="text-sm">
            • Trusted by property managers nationwide
          </div>
        </div>
      </div>
    </section>
  )
}

// Export both for compatibility
export { CtaSection as CTASection }